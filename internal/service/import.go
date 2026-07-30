package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/config"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/utils"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

var (
	ErrImportNotFound       = errors.New("import job not found")
	ErrImportAlreadyRunning = errors.New("an import job is already running")
	ErrInvalidFile          = errors.New("invalid file format")
)

const (
	ImportStatusPending   = "Pending"
	ImportStatusRunning   = "Running"
	ImportStatusCompleted = "Completed"
	ImportStatusFailed    = "Failed"
	ImportSourceUpload    = "Upload"
	ImportSourceDataset   = "Dataset"
)

const batchSize = 200

type citizenRow struct {
	NationalID string
	FullName   string
	Gender     string
	Phone      string
	County     string
	District   string
	Division   string
	Location   string
	SubLoc     string
	Village    string
	PollingStn string
	RowNum     int
}

type ImportService struct {
	db         *gorm.DB
	cfg        *config.Config
	adminUnit  *AdminUnitService
	citizenSvc *CitizenService

	runningMu sync.Mutex
	running   map[uuid.UUID]struct{}
}

func NewImportService(db *gorm.DB, cfg *config.Config, adminUnit *AdminUnitService, citizenSvc *CitizenService) *ImportService {
	return &ImportService{
		db:         db,
		cfg:        cfg,
		adminUnit:  adminUnit,
		citizenSvc: citizenSvc,
		running:    make(map[uuid.UUID]struct{}),
	}
}

func (s *ImportService) StartFromDatasets(ctx context.Context, uploaderID uuid.UUID) (*model.ImportJob, error) {
	dsPath := "./datasets"
	matches, err := filepath.Glob(filepath.Join(dsPath, "*.xlsx"))
	if err != nil || len(matches) == 0 {
		return nil, ErrInvalidFile
	}

	job := &model.ImportJob{
		ID:         uuid.New(),
		Filename:   fmt.Sprintf("datasets/%d files", len(matches)),
		UploaderID: uploaderID,
		Status:     ImportStatusPending,
	}
	if err := s.db.Create(job).Error; err != nil {
		return nil, err
	}
	go s.processImportJob(job.ID, matches, uploaderID, ImportSourceDataset)
	return job, nil
}

func (s *ImportService) StartFromUpload(ctx context.Context, filename string, reader io.Reader, uploaderID uuid.UUID, campaignID *uuid.UUID) (*model.ImportJob, error) {
	if !strings.HasSuffix(strings.ToLower(filename), ".xlsx") && !strings.HasSuffix(strings.ToLower(filename), ".xls") {
		return nil, ErrInvalidFile
	}

	ext := ".xlsx"
	if strings.HasSuffix(strings.ToLower(filename), ".xls") {
		ext = ".xls"
	}
	storedName := filepath.Join(s.cfg.UploadDir, fmt.Sprintf("import_%s_%s%s", time.Now().Format("20060102_150405"), uuid.New().String()[:8], ext))

	job := &model.ImportJob{
		ID:             uuid.New(),
		Filename:       filename,
		UploaderID:     uploaderID,
		CampaignID:     campaignID,
		Status:         ImportStatusPending,
		ErrorReportURL: storedName,
	}
	if err := s.db.Create(job).Error; err != nil {
		return nil, err
	}
	data, err := io.ReadAll(reader)
	if err != nil {
		s.markFailed(job.ID, err.Error())
		return nil, err
	}
	go s.processImportBytes(job.ID, data, uploaderID, ImportSourceUpload)
	return job, nil
}

func (s *ImportService) ListJobs(page, pageSize int, scopedUnits []uuid.UUID) ([]model.ImportJob, int64, error) {
	q := s.db.Model(&model.ImportJob{})

	var total int64
	q.Count(&total)

	if pageSize > 100 {
		pageSize = 100
	}
	if page < 1 {
		page = 1
	}

	var jobs []model.ImportJob
	offset := (page - 1) * pageSize
	err := q.Limit(pageSize).Offset(offset).Order("created_at DESC").Find(&jobs).Error
	return jobs, total, err
}

func (s *ImportService) GetJob(id uuid.UUID) (*model.ImportJob, error) {
	var job model.ImportJob
	if err := s.db.First(&job, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrImportNotFound
		}
		return nil, err
	}
	return &job, nil
}

func (s *ImportService) processImportBytes(jobID uuid.UUID, data []byte, uploaderID uuid.UUID, source string) {
	s.runningMu.Lock()
	if _, ok := s.running[jobID]; ok {
		s.runningMu.Unlock()
		return
	}
	s.running[jobID] = struct{}{}
	s.runningMu.Unlock()
	defer func() {
		s.runningMu.Lock()
		delete(s.running, jobID)
		s.runningMu.Unlock()
	}()

	s.markRunning(jobID)

	rows, err := parseExcelBytes(data)
	if err != nil {
		s.markFailed(jobID, "parse error: "+err.Error())
		return
	}

	s.ingestRows(jobID, rows, uploaderID)
}

func (s *ImportService) processImportJob(jobID uuid.UUID, files []string, uploaderID uuid.UUID, source string) {
	s.runningMu.Lock()
	if _, ok := s.running[jobID]; ok {
		s.runningMu.Unlock()
		return
	}
	s.running[jobID] = struct{}{}
	s.runningMu.Unlock()
	defer func() {
		s.runningMu.Lock()
		delete(s.running, jobID)
		s.runningMu.Unlock()
	}()

	s.markRunning(jobID)

	for _, f := range files {
		rows, err := parseExcelFile(f)
		if err != nil {
			s.markFailed(jobID, "parse error "+filepath.Base(f)+": "+err.Error())
			return
		}

		// Each supplied workbook is large. Process files one at a time so a
		// full national dataset import does not retain every worksheet in memory.
		s.markRunning(jobID)
		s.ingestRows(jobID, rows, uploaderID)
	}
}

func (s *ImportService) ingestRows(jobID uuid.UUID, rows []citizenRow, uploaderID uuid.UUID) {
	total := len(rows)
	inserted := 0
	rejected := 0

	unitCache := make(map[string]uuid.UUID)
	countyCache := make(map[string]*model.AdminUnit)

	// Pre-load existing NIDs
	var allNIDs []string
	for _, r := range rows {
		allNIDs = append(allNIDs, r.NationalID)
	}

	var existingNIDs []string
	s.db.Model(&model.Citizen{}).Where("national_id IN ?", allNIDs).Pluck("national_id", &existingNIDs)
	existingSet := make(map[string]struct{}, len(existingNIDs))
	for _, e := range existingNIDs {
		existingSet[e] = struct{}{}
	}

	// CRITICAL FIX: Process each row in its own transaction
	// This prevents ONE bad row from aborting the entire 164,000-row import
	for _, r := range rows {
		// Start a new transaction for EACH row
		rowTx := s.db.Begin()
		if rowTx.Error != nil {
			fmt.Printf("[IMPORT ERROR] Row %d: Failed to begin transaction: %v\n", r.RowNum, rowTx.Error)
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}

		nid := utils.NormalizeNationalID(r.NationalID)
		if !utils.ValidNationalID(nid) {
			fmt.Printf("[IMPORT SKIP] Row %d: Invalid NID '%s'\n", r.RowNum, r.NationalID)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}
		if _, dup := existingSet[nid]; dup {
			fmt.Printf("[IMPORT SKIP] Row %d: Duplicate NID '%s'\n", r.RowNum, nid)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}

		countyID, err := s.resolveOrCreateUnit(rowTx, 2, r.County, nil, countyCache, unitCache, "KE-"+strings.ToUpper(shortName(r.County)))
		if err != nil || countyID == uuid.Nil {
			fmt.Printf("[IMPORT SKIP] Row %d: County '%s' failed: %v\n", r.RowNum, r.County, err)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}
		districtID, err := s.resolveOrCreateUnit(rowTx, 3, r.District, &countyID, countyCache, unitCache, "")
		if err != nil || districtID == uuid.Nil {
			fmt.Printf("[IMPORT SKIP] Row %d: District '%s' failed: %v\n", r.RowNum, r.District, err)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}
		var divisionID *uuid.UUID
		if strings.TrimSpace(r.Division) != "" {
			id, err := s.resolveOrCreateUnit(rowTx, 4, r.Division, &districtID, countyCache, unitCache, "")
			if err == nil && id != uuid.Nil {
				divisionID = &id
			}
		}
		var locationID *uuid.UUID
		if strings.TrimSpace(r.Location) != "" {
			parent := districtID
			if divisionID != nil {
				parent = *divisionID
			}
			id, err := s.resolveOrCreateUnit(rowTx, 5, r.Location, &parent, countyCache, unitCache, "")
			if err == nil && id != uuid.Nil {
				locationID = &id
			}
		}
		var subLocID *uuid.UUID
		if strings.TrimSpace(r.SubLoc) != "" {
			parent := districtID
			if locationID != nil {
				parent = *locationID
			}
			id, err := s.resolveOrCreateUnit(rowTx, 6, r.SubLoc, &parent, countyCache, unitCache, "")
			if err == nil && id != uuid.Nil {
				subLocID = &id
			}
		}
		var villageID *uuid.UUID
		if strings.TrimSpace(r.Village) != "" {
			parent := districtID
			if subLocID != nil {
				parent = *subLocID
			}
			id, err := s.resolveOrCreateUnit(rowTx, 7, r.Village, &parent, countyCache, unitCache, "")
			if err == nil && id != uuid.Nil {
				villageID = &id
			}
		}

		gender := strings.ToUpper(r.Gender)
		if strings.HasPrefix(gender, "M") {
			gender = GenderMale
		} else if strings.HasPrefix(gender, "F") {
			gender = GenderFemale
		} else {
			gender = GenderMale
		}

		c := model.Citizen{
			ID:                 uuid.New(),
			NationalID:         nid,
			FullName:           strings.TrimSpace(r.FullName),
			Gender:             gender,
			PhoneNumber:        utils.NormalizePhone(r.Phone),
			CountyID:           countyID,
			DistrictID:         districtID,
			DivisionID:         divisionID,
			LocationID:         locationID,
			SubLocationID:      subLocID,
			VillageID:          villageID,
			PollingStation:     strings.TrimSpace(r.PollingStn),
			RegistrationStatus: RegStatusUnregistered,
			UpdatedBy:          &uploaderID,
		}
		if c.FullName == "" {
			fmt.Printf("[IMPORT SKIP] Row %d: Missing full name\n", r.RowNum)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}

		// Insert this single citizen
		if err := rowTx.Create(&c).Error; err != nil {
			fmt.Printf("[IMPORT ERROR] Row %d: NID=%s Name=%s Error: %v\n", r.RowNum, nid, c.FullName, err)
			rowTx.Rollback()
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}

		// Commit this row's transaction
		if err := rowTx.Commit().Error; err != nil {
			fmt.Printf("[IMPORT ERROR] Row %d: Commit failed: %v\n", r.RowNum, err)
			rejected++
			s.updateJobProgress(jobID, total, inserted, rejected)
			continue
		}

		inserted++
		existingSet[nid] = struct{}{}
		s.updateJobProgress(jobID, total, inserted, rejected)
	}

	s.markCompleted(jobID, total, inserted, rejected)
}

func (s *ImportService) resolveOrCreateUnit(tx *gorm.DB, level int16, name string, parentID *uuid.UUID, countyCache map[string]*model.AdminUnit, unitCache map[string]uuid.UUID, code string) (uuid.UUID, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return uuid.Nil, nil
	}
	key := fmt.Sprintf("%d:%s:%v", level, strings.ToLower(name), parentID)
	if cached, ok := unitCache[key]; ok {
		return cached, nil
	}

	var u model.AdminUnit
	q := tx.Where("level = ? AND name ILIKE ?", level, name)
	if parentID != nil {
		q = q.Where("parent_id = ?", *parentID)
	} else {
		q = q.Where("parent_id IS NULL")
	}
	err := q.First(&u).Error
	if err == nil {
		unitCache[key] = u.ID
		return u.ID, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return uuid.Nil, err
	}

	newUnit := &model.AdminUnit{
		ID:       uuid.New(),
		Name:     name,
		Level:    level,
		ParentID: parentID,
		Code:     code,
	}
	if err := tx.Create(newUnit).Error; err != nil {
		return uuid.Nil, err
	}
	unitCache[key] = newUnit.ID
	return newUnit.ID, nil
}

func (s *ImportService) markRunning(jobID uuid.UUID) {
	now := time.Now()
	s.db.Model(&model.ImportJob{}).Where("id = ?", jobID).
		Updates(map[string]interface{}{"status": ImportStatusRunning, "started_at": &now})
}

func (s *ImportService) markFailed(jobID uuid.UUID, reason string) {
	now := time.Now()
	s.db.Model(&model.ImportJob{}).Where("id = ?", jobID).
		Updates(map[string]interface{}{"status": ImportStatusFailed, "completed_at": &now, "error_report_url": reason})
}

func (s *ImportService) markCompleted(jobID uuid.UUID, total, inserted, rejected int) {
	now := time.Now()
	s.db.Model(&model.ImportJob{}).Where("id = ?", jobID).
		Updates(map[string]interface{}{
			"status":        ImportStatusCompleted,
			"completed_at":  &now,
			"total_rows":    total,
			"inserted_rows": inserted,
			"rejected_rows": rejected,
		})
}

func (s *ImportService) updateJobProgress(jobID uuid.UUID, total, inserted, rejected int) {
	s.db.Model(&model.ImportJob{}).Where("id = ?", jobID).
		Updates(map[string]interface{}{
			"total_rows":    total,
			"inserted_rows": inserted,
			"rejected_rows": rejected,
		})
}

func parseExcelFile(path string) ([]citizenRow, error) {
	f, err := excelize.OpenFile(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	rows, err := readExcelRows(f)
	if err != nil {
		return nil, err
	}

	// The supplied county workbooks identify the county in the filename rather
	// than in a worksheet column (for example, "KERICHO.xlsx"). Preserve the
	// row's county when it is present, but fill it from that source when absent.
	county := countyFromDatasetFilename(path)
	for i := range rows {
		if strings.TrimSpace(rows[i].County) == "" {
			rows[i].County = county
		}
	}
	return rows, nil
}

func parseExcelBytes(data []byte) ([]citizenRow, error) {
	f, err := excelize.OpenReader(strings.NewReader(string(data)))
	if err != nil {
		f2, err2 := excelize.OpenReader(bytesReader(data))
		if err2 != nil {
			return nil, err2
		}
		defer f2.Close()
		return readExcelRows(f2)
	}
	defer f.Close()
	return readExcelRows(f)
}

type bytesReaderIface interface {
	io.ReaderAt
	io.Seeker
	io.Reader
}

func bytesReader(b []byte) bytesReaderIface {
	return &byteReader{data: b, pos: 0}
}

type byteReader struct {
	data []byte
	pos  int
}

func (r *byteReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	return n, nil
}

func (r *byteReader) ReadAt(p []byte, off int64) (int, error) {
	if off >= int64(len(r.data)) {
		return 0, io.EOF
	}
	n := copy(p, r.data[off:])
	return n, nil
}

func (r *byteReader) Seek(offset int64, whence int) (int64, error) {
	var newPos int64
	switch whence {
	case 0:
		newPos = offset
	case 1:
		newPos = int64(r.pos) + offset
	case 2:
		newPos = int64(len(r.data)) + offset
	}
	if newPos < 0 {
		return 0, errors.New("negative position")
	}
	r.pos = int(newPos)
	return newPos, nil
}

func readExcelRows(f *excelize.File) ([]citizenRow, error) {
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, ErrInvalidFile
	}
	sheet := sheets[0]
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, err
	}
	if len(rows) < 2 {
		return nil, ErrInvalidFile
	}

	colIdx := detectColumns(rows[0])

	var result []citizenRow
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		get := func(idx int) string {
			if idx < 0 || idx >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[idx])
		}
		r := citizenRow{
			NationalID: get(colIdx.nid),
			FullName:   get(colIdx.name),
			Gender:     get(colIdx.gender),
			Phone:      get(colIdx.phone),
			County:     get(colIdx.county),
			District:   get(colIdx.district),
			Division:   get(colIdx.division),
			Location:   get(colIdx.location),
			SubLoc:     get(colIdx.subloc),
			Village:    get(colIdx.village),
			PollingStn: get(colIdx.polling),
			RowNum:     i + 1,
		}
		if r.NationalID == "" && r.FullName == "" {
			continue
		}
		result = append(result, r)
	}
	return result, nil
}

type colMap struct {
	nid, name, gender, phone, county, district, division, location, subloc, village, polling int
}

func detectColumns(header []string) colMap {
	m := colMap{nid: -1, name: -1, gender: -1, phone: -1, county: -1, district: -1, division: -1, location: -1, subloc: -1, village: -1, polling: -1}
	for i, raw := range header {
		h := strings.ToLower(strings.TrimSpace(raw))
		switch {
		case strings.Contains(h, "id") || strings.Contains(h, "national") || strings.Contains(h, "nid"):
			m.nid = i
		case strings.Contains(h, "name") && !strings.Contains(h, "polling"):
			m.name = i
		case strings.Contains(h, "gender") || strings.Contains(h, "sex"):
			m.gender = i
		case strings.Contains(h, "phone") || strings.Contains(h, "mobile") || strings.Contains(h, "contact"):
			m.phone = i
		case strings.Contains(h, "county"):
			m.county = i
		case strings.Contains(h, "district") || strings.Contains(h, "constituency") || strings.Contains(h, "subcounty"):
			m.district = i
		case strings.Contains(h, "division"):
			m.division = i
		case strings.Contains(h, "subloc") || strings.Contains(h, "sub location"):
			m.subloc = i
		case strings.Contains(h, "location"):
			m.location = i
		case strings.Contains(h, "village"):
			m.village = i
		case strings.Contains(h, "polling") || strings.Contains(h, "station"):
			m.polling = i
		}
	}
	if m.nid == -1 {
		m.nid = 0
	}
	if m.name == -1 {
		m.name = 1
	}
	if m.gender == -1 {
		m.gender = 2
	}
	if m.district == -1 {
		m.district = 4
	}
	return m
}

func countyFromDatasetFilename(path string) string {
	name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	// Remove file sequence markers such as "NANDI 4" and "UASIN GISHU 2".
	name = strings.TrimSpace(strings.TrimRight(name, " 0123456789"))
	return strings.Join(strings.Fields(strings.ToLower(name)), " ")
}

func shortName(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, " ", "")
	if len(s) > 6 {
		s = s[:6]
	}
	return s
}
