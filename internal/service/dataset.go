package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"github.com/sdic/nvrcms/internal/model"
)

// DatasetService handles raw Excel dataset import/export and management
type DatasetService struct {
	db         *gorm.DB
	adminSvc   *AdminUnitService
	citizenSvc *CitizenService
}

// NewDatasetService creates a new dataset service
func NewDatasetService(db *gorm.DB, adminSvc *AdminUnitService, citizenSvc *CitizenService) *DatasetService {
	return &DatasetService{db: db, adminSvc: adminSvc, citizenSvc: citizenSvc}
}

// DatasetListParams holds filter and pagination parameters
type DatasetListParams struct {
	County             string
	CountyID           *uuid.UUID
	District           string
	Gender             string
	RegistrationStatus string
	NationalID         string
	Name               string
	Page               int
	PageSize           int
	SortBy             string
	SortOrder          string
}

// DatasetListResult holds pagination results
type DatasetListResult struct {
	Records   []model.DatasetRecord `json:"records"`
	Total     int64                 `json:"total"`
	Page      int                   `json:"page"`
	PageSize  int                   `json:"page_size"`
	TotalPage int                   `json:"total_page"`
}

type DatasetSummary struct {
	County          string  `json:"county,omitempty"`
	Total           int64   `json:"total"`
	Registered      int64   `json:"registered"`
	Unregistered    int64   `json:"unregistered"`
	ProgressPercent float64 `json:"progress_percent"`
}

// ImportDatasetFromFile parses an Excel file and stores raw records
func (s *DatasetService) ImportDatasetFromFile(ctx context.Context, fileReader io.Reader, filename string, county string, uploaderID uuid.UUID) (*model.DatasetUpload, error) {
	// Read Excel file
	file, err := excelize.OpenReader(fileReader)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Excel file: %w", err)
	}
	defer file.Close()

	// Get sheet names
	sheets := file.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("Excel file contains no sheets")
	}

	// Read first sheet
	sheetName := sheets[0]
	rows, err := file.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("failed to read sheet: %w", err)
	}

	if len(rows) == 0 {
		return nil, errors.New("Excel file contains no data")
	}

	// Create upload metadata
	upload := &model.DatasetUpload{
		ID:         uuid.New(),
		County:     county,
		Filename:   filename,
		UploadedBy: uploaderID,
		UploadDate: time.Now(),
		Status:     "Processing",
		RowCount:   len(rows) - 1, // Exclude header
	}

	tx := s.db.WithContext(ctx).Begin()

	// Save upload metadata
	if err := tx.Create(upload).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to save upload metadata: %w", err)
	}

	// Parse headers (first row)
	headers := rows[0]
	columnMapping := detectColumnMapping(headers)

	// Save column mappings
	for idx, sourceCol := range headers {
		targetField, ok := columnMapping[strings.ToLower(sourceCol)]
		if !ok {
			targetField = "extra_" + strings.ToLower(strings.ReplaceAll(sourceCol, " ", "_"))
		}

		mapping := &model.DatasetColumnMapping{
			ID:               uuid.New(),
			UploadID:         upload.ID,
			SourceColumnName: sourceCol,
			TargetFieldName:  targetField,
			ColumnIndex:      idx,
		}
		if err := tx.Create(mapping).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to save column mapping: %w", err)
		}
	}

	// Insert all data rows (batch insert for performance)
	records := make([]model.DatasetRecord, 0, len(rows)-1)
	validationErrors := make([]model.DatasetValidationError, 0)
	defaultCounty := strings.TrimSpace(county)

	for rowIdx := 1; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]

		// Map row to record
		record := mapRowToRecord(upload.ID, rowIdx, headers, row, columnMapping)

		// Apply upload-level default county when Excel county column is missing/empty
		if strings.TrimSpace(record.County) == "" && defaultCounty != "" {
			record.County = defaultCounty
		}

		// Basic validation
		if errs := validateDatasetRecord(record, rowIdx); len(errs) > 0 {
			for _, errMsg := range errs {
				validationErrors = append(validationErrors, model.DatasetValidationError{
					ID:            uuid.New(),
					UploadID:      upload.ID,
					RowNumber:     rowIdx,
					ErrorMessage:  errMsg,
					ErrorSeverity: "ERROR",
					CreatedAt:     time.Now(),
				})
			}
			record.SyncError = strings.Join(errs, "; ")
		}

		records = append(records, record)
	}

	// Batch insert records
	if len(records) > 0 {
		if err := tx.CreateInBatches(records, 500).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to insert dataset records: %w", err)
		}
	}

	// Batch insert validation errors
	if len(validationErrors) > 0 {
		if err := tx.CreateInBatches(validationErrors, 500).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to save validation errors: %w", err)
		}
	}

	// Update upload status
	upload.Status = "Completed"
	if err := tx.Model(upload).Update("status", "Completed").Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update upload status: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("transaction commit failed: %w", err)
	}

	return upload, nil
}

// ListDatasets lists all uploaded datasets with pagination
func (s *DatasetService) ListDatasets(ctx context.Context, page, pageSize int) ([]model.DatasetUpload, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var uploads []model.DatasetUpload
	var total int64

	offset := (page - 1) * pageSize

	if err := s.db.WithContext(ctx).
		Order("upload_date DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&uploads).Error; err != nil {
		return nil, 0, err
	}

	if err := s.db.WithContext(ctx).Model(&model.DatasetUpload{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	return uploads, total, nil
}

// GetDataset retrieves a single dataset upload by ID
func (s *DatasetService) GetDataset(ctx context.Context, uploadID uuid.UUID) (*model.DatasetUpload, error) {
	var upload model.DatasetUpload
	if err := s.db.WithContext(ctx).First(&upload, "id = ?", uploadID).Error; err != nil {
		return nil, err
	}
	return &upload, nil
}

// ListDatasetRecords lists records from a specific dataset with filtering and pagination
func (s *DatasetService) ListDatasetRecords(ctx context.Context, uploadID uuid.UUID, params *DatasetListParams) (*DatasetListResult, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}

	query := s.db.WithContext(ctx).Model(&model.DatasetRecord{}).Where("upload_id = ?", uploadID)

	query = applyDatasetRecordFilters(query, params)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply sorting
	if params.SortBy == "" {
		params.SortBy = "row_number"
	}
	if params.SortOrder == "" {
		params.SortOrder = "ASC"
	}

	var records []model.DatasetRecord
	offset := (params.Page - 1) * params.PageSize

	if err := query.
		Order(fmt.Sprintf("%s %s", params.SortBy, strings.ToUpper(params.SortOrder))).
		Offset(offset).
		Limit(params.PageSize).
		Find(&records).Error; err != nil {
		return nil, err
	}

	totalPage := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &DatasetListResult{
		Records:   records,
		Total:     total,
		Page:      params.Page,
		PageSize:  params.PageSize,
		TotalPage: totalPage,
	}, nil
}

// GetDatasetRecord retrieves a single record
func (s *DatasetService) GetDatasetRecord(ctx context.Context, recordID uuid.UUID) (*model.DatasetRecord, error) {
	var record model.DatasetRecord
	if err := s.db.WithContext(ctx).First(&record, "id = ?", recordID).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

// UpdateDatasetRecord updates a single record
func (s *DatasetService) UpdateDatasetRecord(ctx context.Context, recordID uuid.UUID, updates map[string]interface{}, userID uuid.UUID) error {
	updates["is_edited"] = true
	updates["edited_by"] = userID
	updates["edited_at"] = time.Now()

	if err := s.db.WithContext(ctx).Model(&model.DatasetRecord{}).Where("id = ?", recordID).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update record: %w", err)
	}

	return nil
}

// DeleteDatasetRecord soft deletes a record by marking it as deleted
func (s *DatasetService) DeleteDatasetRecord(ctx context.Context, recordID uuid.UUID) error {
	// For now, we'll actually delete since we have soft delete not configured
	// In production, implement proper soft delete
	if err := s.db.WithContext(ctx).Delete(&model.DatasetRecord{}, "id = ?", recordID).Error; err != nil {
		return fmt.Errorf("failed to delete record: %w", err)
	}
	return nil
}

// ExportToExcel generates an Excel file from dataset records
func (s *DatasetService) ExportToExcel(ctx context.Context, uploadID uuid.UUID, params *DatasetListParams) ([]byte, error) {
	// Get column mappings to preserve original column order
	var mappings []model.DatasetColumnMapping
	if err := s.db.WithContext(ctx).
		Where("upload_id = ?", uploadID).
		Order("column_index ASC").
		Find(&mappings).Error; err != nil {
		return nil, err
	}

	// Get filtered records
	result, err := s.ListDatasetRecords(ctx, uploadID, params)
	if err != nil {
		return nil, err
	}

	// Create new Excel file
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Dataset"
	f.SetSheetName("Sheet1", sheetName)

	// Write headers
	for colIdx, mapping := range mappings {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetName, cell, mapping.SourceColumnName)
	}

	// Write data rows
	for rowIdx, record := range result.Records {
		for colIdx, mapping := range mappings {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+2)
			value := getRecordFieldValue(record, mapping.TargetFieldName)
			f.SetCellValue(sheetName, cell, value)
		}
	}

	// Get bytes
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// GetDatasetValidationErrors retrieves validation errors for a dataset
func (s *DatasetService) GetDatasetValidationErrors(ctx context.Context, uploadID uuid.UUID, page, pageSize int) ([]model.DatasetValidationError, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var errors []model.DatasetValidationError
	var total int64

	offset := (page - 1) * pageSize

	if err := s.db.WithContext(ctx).
		Where("upload_id = ?", uploadID).
		Offset(offset).
		Limit(pageSize).
		Find(&errors).Error; err != nil {
		return nil, 0, err
	}

	if err := s.db.WithContext(ctx).
		Model(&model.DatasetValidationError{}).
		Where("upload_id = ?", uploadID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	return errors, total, nil
}

// ========== Helper Functions ==========

// detectColumnMapping maps Excel headers to known fields
func detectColumnMapping(headers []string) map[string]string {
	mapping := make(map[string]string)

	orderedFieldPatterns := []struct {
		fieldName string
		patterns  []string
	}{
		{"national_id", []string{"nid", "national id", "national_id", "national identity", "identification", "nin", "id no", "id number", "nationalid"}},
		{"full_name", []string{"full name", "full_name", "citizen name", "applicant name", "fullname", "names"}},
		{"gender", []string{"gender", "sex", "gender/sex"}},
		{"phone_number", []string{"phone", "phone number", "phone_number", "mobile", "contact", "tel", "telephone", "mobile no"}},
		{"county", []string{"county", "county name", "county_name"}},
		{"district", []string{"sub county", "subcounty", "sub-county", "sub_county", "district", "district name", "district_name", "constituency", "const"}},
		{"division", []string{"division", "division name", "ward"}},
		{"sub_location", []string{"sub location", "sublocation", "sub_location", "subloc", "sub-location"}},
		{"location", []string{"location", "location name"}},
		{"village", []string{"village", "village name"}},
		{"polling_station", []string{"polling station", "polling_station", "polling centre", "polling center", "polling_centre", "polling_center", "station", "polling"}},
		{"registration_status", []string{"registration status", "registration_status", "reg status", "registrationstatus", "status"}},
		{"registration_date", []string{"registration date", "registration_date", "reg date", "date"}},
	}

	// Second pass: catch "name" only if not already matched (must be after polling etc.)
	nameFallback := []struct {
		fieldName string
		patterns  []string
	}{
		{"national_id", []string{"id"}},
		{"full_name", []string{"name"}},
	}

	for i, header := range headers {
		headerLower := strings.ToLower(strings.TrimSpace(header))
		headerNormalized := strings.ReplaceAll(headerLower, "_", " ")
		headerNormalized = strings.ReplaceAll(headerNormalized, "-", " ")
		headerNormalized = strings.Join(strings.Fields(headerNormalized), " ")

		found := false

		headerForbidden := func(substr string) bool {
			return strings.Contains(headerLower, substr) || strings.Contains(headerNormalized, substr)
		}

		for _, fp := range orderedFieldPatterns {
			for _, pattern := range fp.patterns {
				patternLower := strings.ToLower(pattern)
				if headerLower == patternLower ||
					headerNormalized == patternLower ||
					strings.Contains(headerLower, patternLower) ||
					strings.Contains(headerNormalized, patternLower) {

					if fp.fieldName == "national_id" {
						if headerForbidden("polling") || headerForbidden("station") || headerForbidden("village") {
							continue
						}
					}
					if fp.fieldName == "full_name" {
						if headerForbidden("polling") || headerForbidden("station") || headerForbidden("county") || headerForbidden("district") || headerForbidden("division") || headerForbidden("location") || headerForbidden("village") {
							continue
						}
					}

					mapping[headerLower] = fp.fieldName
					found = true
					goto nextHeader
				}
			}
		}

		for _, fp := range nameFallback {
			for _, pattern := range fp.patterns {
				patternLower := strings.ToLower(pattern)
				if headerLower == patternLower ||
					headerNormalized == patternLower ||
					strings.Contains(headerLower, patternLower) ||
					strings.Contains(headerNormalized, patternLower) {

					if fp.fieldName == "national_id" {
						if headerForbidden("polling") || headerForbidden("station") || headerForbidden("village") {
							continue
						}
					}
					if fp.fieldName == "full_name" {
						if headerForbidden("polling") || headerForbidden("station") || headerForbidden("county") || headerForbidden("district") || headerForbidden("division") || headerForbidden("location") || headerForbidden("village") {
							continue
						}
					}

					mapping[headerLower] = fp.fieldName
					found = true
					goto nextHeader
				}
			}
		}

	nextHeader:
		if !found {
			mapping[headerLower] = fmt.Sprintf("extra_%d", i)
		}
	}

	return mapping
}

// mapRowToRecord maps an Excel row to a DatasetRecord
func mapRowToRecord(uploadID uuid.UUID, rowNumber int, headers []string, row []string, mapping map[string]string) model.DatasetRecord {
	record := model.DatasetRecord{
		ID:        uuid.New(),
		UploadID:  uploadID,
		RowNumber: rowNumber,
		ExtraData: make(map[string]interface{}),
	}

	// Pad row to match headers length
	for len(row) < len(headers) {
		row = append(row, "")
	}

	// Map values to record fields
	for colIdx, header := range headers {
		headerLower := strings.ToLower(strings.TrimSpace(header))
		value := ""
		if colIdx < len(row) {
			value = strings.TrimSpace(row[colIdx])
		}

		fieldName, ok := mapping[headerLower]
		if !ok {
			fieldName = fmt.Sprintf("extra_%d", colIdx)
		}

		// Assign to mapped field or store in extra_data
		switch fieldName {
		case "national_id":
			record.NationalID = value
		case "full_name":
			record.FullName = value
		case "gender":
			record.Gender = value
		case "phone_number":
			record.PhoneNumber = value
		case "county":
			record.County = value
		case "district":
			record.District = value
		case "division":
			record.Division = value
		case "location":
			record.Location = value
		case "sub_location":
			record.SubLocation = value
		case "village":
			record.Village = value
		case "polling_station":
			record.PollingStation = value
		case "registration_status":
			record.RegistrationStatus = value
		case "registration_date":
			record.RegistrationDate = value
		default:
			record.ExtraData[fieldName] = value
		}
	}

	return record
}

// validateDatasetRecord performs basic validation on a record
func validateDatasetRecord(record model.DatasetRecord, rowNumber int) []string {
	var errors []string

	// At least one meaningful field must be present
	if record.NationalID == "" && record.FullName == "" && record.District == "" {
		errors = append(errors, "Row has no identifying information (missing NID, name, or district)")
	}

	return errors
}

// getRecordFieldValue retrieves a field value from a record for export
func getRecordFieldValue(record model.DatasetRecord, fieldName string) interface{} {
	switch fieldName {
	case "national_id":
		return record.NationalID
	case "full_name":
		return record.FullName
	case "gender":
		return record.Gender
	case "phone_number":
		return record.PhoneNumber
	case "county":
		return record.County
	case "district":
		return record.District
	case "division":
		return record.Division
	case "location":
		return record.Location
	case "sub_location":
		return record.SubLocation
	case "village":
		return record.Village
	case "polling_station":
		return record.PollingStation
	case "registration_status":
		return record.RegistrationStatus
	case "registration_date":
		return record.RegistrationDate
	default:
		if val, ok := record.ExtraData[fieldName]; ok {
			return val
		}
		return ""
	}
}

// normalizeGeographicName collapses punctuation differences for fuzzy matching.
// "Elgeyo-Marakwet" ↔ "elgeyo marakwet" ↔ "Elgeyo_Marakwet" all canonicalize to "elgeyomarakwet".
func normalizeGeographicName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, "_", "")

	s = strings.Join(strings.Fields(s), "")
	s = strings.ReplaceAll(s, "\u00a0", "")
	return s
}

func normalizeCountyExpression(column string) string {
	return "LOWER(REGEXP_REPLACE(COALESCE(" + column + ", ''), '[-_[:space:]]+', '', 'g'))"
}

// applyDatasetRecordFilters applies all user-facing filter predicates using fuzzy
// geographic-name matching so frontend queries using hyphens or spaces are
// interchangeable with values originally stored in a different punctuation style.
func applyDatasetRecordFilters(query *gorm.DB, params *DatasetListParams) *gorm.DB {
	if params.County != "" {
		trimmed := strings.TrimSpace(params.County)
		canonical := normalizeGeographicName(trimmed)
		// Prioritize matching dataset_uploads.county (the upload's county) over raw dataset_records.county
		// since the latter may contain district or other geographic data from the Excel file
		query = query.Where(
			"("+normalizeCountyExpression("du.county")+" LIKE ? OR LOWER(COALESCE(du.county, '')) LIKE ? OR LOWER(REPLACE(COALESCE(du.county, ''), '-', ' ')) LIKE ? OR LOWER(REPLACE(COALESCE(du.county, ''), ' ', '-')) LIKE ?)",
			"%"+canonical+"%",
			"%"+strings.ToLower(trimmed)+"%",
			"%"+strings.ToLower(strings.ReplaceAll(trimmed, "-", " "))+"%",
			"%"+strings.ToLower(strings.ReplaceAll(trimmed, " ", "-"))+"%",
		)
	}
	if params.District != "" {
		canonical := normalizeGeographicName(params.District)
		query = query.Where(
			`LOWER(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(district,''), '-', ''), '_', ''), ' ', ''), ' ', '')) LIKE ? OR LOWER(district) LIKE ?`,
			"%"+canonical+"%",
			"%"+strings.ToLower(params.District)+"%",
		)
	}
	if params.Gender != "" {
		query = query.Where("LOWER(gender) LIKE ?", "%"+strings.ToLower(params.Gender)+"%")
	}
	if params.RegistrationStatus != "" {
		query = query.Where("LOWER(registration_status) LIKE ?", "%"+strings.ToLower(params.RegistrationStatus)+"%")
	}
	if params.NationalID != "" {
		query = query.Where("national_id LIKE ?", "%"+params.NationalID+"%")
	}
	if params.Name != "" {
		query = query.Where("LOWER(full_name) LIKE ?", "%"+strings.ToLower(params.Name)+"%")
	}
	return query
}

// ListAllDatasetRecordsByCounty lists records across all datasets for a specific county
func (s *DatasetService) ResolveCountyName(ctx context.Context, countyID uuid.UUID) (string, error) {
	unit, err := s.adminSvc.GetByID(countyID, false, false)
	if err != nil {
		return "", err
	}
	return unit.Name, nil
}

func (s *DatasetService) ListAllDatasetRecordsByCounty(ctx context.Context, params *DatasetListParams) (*DatasetListResult, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}

	query := s.db.WithContext(ctx).Model(&model.DatasetRecord{})
	// Always join dataset_uploads so we can access du.county for filtering
	query = query.Joins("JOIN dataset_uploads du ON du.id = dataset_records.upload_id")

	query = applyDatasetRecordFilters(query, params)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply sorting
	if params.SortBy == "" {
		params.SortBy = "row_number"
	}
	if params.SortOrder == "" {
		params.SortOrder = "ASC"
	}

	var records []model.DatasetRecord
	offset := (params.Page - 1) * params.PageSize

	if err := query.
		Order(fmt.Sprintf("%s %s", params.SortBy, strings.ToUpper(params.SortOrder))).
		Offset(offset).
		Limit(params.PageSize).
		Find(&records).Error; err != nil {
		return nil, err
	}

	totalPage := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &DatasetListResult{
		Records:   records,
		Total:     total,
		Page:      params.Page,
		PageSize:  params.PageSize,
		TotalPage: totalPage,
	}, nil
}

func (s *DatasetService) GetDatasetSummaryByCounty(ctx context.Context, params *DatasetListParams) (*DatasetSummary, error) {
	query := s.db.WithContext(ctx).Model(&model.DatasetRecord{})
	// Always join dataset_uploads so we can access du.county for filtering
	query = query.Joins("JOIN dataset_uploads du ON du.id = dataset_records.upload_id")

	query = applyDatasetRecordFilters(query, params)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var registered int64
	if err := query.Where("LOWER(TRIM(COALESCE(registration_status, ''))) = ?", strings.ToLower(RegStatusRegistered)).Count(&registered).Error; err != nil {
		return nil, err
	}

	unregistered := total - registered
	if unregistered < 0 {
		unregistered = 0
	}

	progress := 0.0
	if total > 0 {
		progress = float64(registered) / float64(total) * 100
	}

	return &DatasetSummary{
		County:          params.County,
		Total:           total,
		Registered:      registered,
		Unregistered:    unregistered,
		ProgressPercent: progress,
	}, nil
}

// RegisterDatasetRecord creates a citizen from a dataset record and registers them
func (s *DatasetService) RegisterDatasetRecord(ctx context.Context, recordID, campaignID, userID uuid.UUID) error {
	record, err := s.GetDatasetRecord(ctx, recordID)
	if err != nil {
		return fmt.Errorf("record not found: %w", err)
	}

	tx := s.db.WithContext(ctx).Begin()

	unitCache := make(map[string]uuid.UUID)
	pendingUnits := make(map[string]uuid.UUID)
	countyCache := make(map[string]*model.AdminUnit)

	countyName := strings.TrimSpace(record.County)
	if countyName == "" {
		tx.Rollback()
		return fmt.Errorf("dataset record has no county assigned: cannot register citizen without CountyID")
	}
	countyID, err := s.resolveAdminUnit(tx, 2, countyName, nil, countyCache, unitCache, pendingUnits, "KE-"+strings.ToUpper(shortName(countyName)))
	if err != nil || countyID == uuid.Nil {
		tx.Rollback()
		return fmt.Errorf("failed to resolve county %q: %w", countyName, err)
	}
	districtName := strings.TrimSpace(record.District)
	if districtName == "" {
		districtName = countyName + " - General"
	}
	districtID, err := s.resolveAdminUnit(tx, 3, districtName, &countyID, countyCache, unitCache, pendingUnits, "")
	if err != nil || districtID == uuid.Nil {
		tx.Rollback()
		return fmt.Errorf("failed to resolve district %q: %w", districtName, err)
	}
	var divisionID *uuid.UUID
	if strings.TrimSpace(record.Division) != "" {
		id, e := s.resolveAdminUnit(tx, 4, record.Division, &districtID, countyCache, unitCache, pendingUnits, "")
		if e == nil && id != uuid.Nil {
			divisionID = &id
		}
	}
	locParent := districtID
	if divisionID != nil {
		locParent = *divisionID
	}
	var locationID *uuid.UUID
	if strings.TrimSpace(record.Location) != "" {
		id, e := s.resolveAdminUnit(tx, 5, record.Location, &locParent, countyCache, unitCache, pendingUnits, "")
		if e == nil && id != uuid.Nil {
			locationID = &id
		}
	}
	subParent := locParent
	if locationID != nil {
		subParent = *locationID
	}
	var subLocationID *uuid.UUID
	if strings.TrimSpace(record.SubLocation) != "" {
		id, e := s.resolveAdminUnit(tx, 6, record.SubLocation, &subParent, countyCache, unitCache, pendingUnits, "")
		if e == nil && id != uuid.Nil {
			subLocationID = &id
		}
	}
	vilParent := subParent
	if subLocationID != nil {
		vilParent = *subLocationID
	}
	var villageID *uuid.UUID
	if strings.TrimSpace(record.Village) != "" {
		id, e := s.resolveAdminUnit(tx, 7, record.Village, &vilParent, countyCache, unitCache, pendingUnits, "")
		if e == nil && id != uuid.Nil {
			villageID = &id
		}
	}

	gender := strings.ToUpper(strings.TrimSpace(record.Gender))
	if strings.HasPrefix(gender, "M") {
		gender = GenderMale
	} else if strings.HasPrefix(gender, "F") {
		gender = GenderFemale
	} else {
		gender = GenderMale
	}

	now := time.Now()
	citizen := &model.Citizen{
		ID:                 uuid.New(),
		NationalID:         strings.TrimSpace(record.NationalID),
		FullName:           strings.TrimSpace(record.FullName),
		Gender:             gender,
		PhoneNumber:        strings.TrimSpace(record.PhoneNumber),
		CountyID:           countyID,
		DistrictID:         districtID,
		DivisionID:         divisionID,
		LocationID:         locationID,
		SubLocationID:      subLocationID,
		VillageID:          villageID,
		PollingStation:     strings.TrimSpace(record.PollingStation),
		RegistrationStatus: RegStatusRegistered,
		RegistrationDate:   &now,
		UpdatedBy:          &userID,
	}
	if citizen.FullName == "" || citizen.NationalID == "" {
		tx.Rollback()
		return fmt.Errorf("dataset record missing required citizen fields (NID or FullName)")
	}

	if err := tx.Create(citizen).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create citizen: %w", err)
	}

	if err := tx.Model(record).Updates(map[string]interface{}{
		"is_synced":         true,
		"synced_citizen_id": citizen.ID,
	}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update record sync status: %w", err)
	}

	registration := &model.RegistrationRecord{
		ID:           uuid.New(),
		CitizenID:    citizen.ID,
		CampaignID:   campaignID,
		RegisteredBy: userID,
		RegisteredAt: time.Now(),
		Source:       "dataset",
	}

	if err := tx.Create(registration).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create registration: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("transaction commit failed: %w", err)
	}

	for k, v := range pendingUnits {
		unitCache[k] = v
	}

	return nil
}

func (s *DatasetService) resolveAdminUnit(tx *gorm.DB, level int16, name string, parentID *uuid.UUID, countyCache map[string]*model.AdminUnit, unitCache map[string]uuid.UUID, pendingUnits map[string]uuid.UUID, code string) (uuid.UUID, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return uuid.Nil, nil
	}
	var parentKeyStr string
	if parentID != nil {
		parentKeyStr = parentID.String()
	} else {
		parentKeyStr = "ROOT"
	}
	key := fmt.Sprintf("%d:%s:%s", level, strings.ToLower(name), parentKeyStr)
	if cached, ok := unitCache[key]; ok {
		return cached, nil
	}
	if pending, ok := pendingUnits[key]; ok {
		return pending, nil
	}
	var u model.AdminUnit
	q := tx.Where("level = ? AND name ILIKE ?", level, name)
	if parentID != nil {
		q = q.Where("parent_id = ?", *parentID)
	} else if level != 2 {
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
	}
	if code != "" {
		newUnit.Code = code
	}
	createQuery := tx
	if newUnit.Code == "" {
		createQuery = tx.Omit("code")
	}
	if err := createQuery.Create(newUnit).Error; err != nil {
		return uuid.Nil, err
	}
	pendingUnits[key] = newUnit.ID
	return newUnit.ID, nil
}
