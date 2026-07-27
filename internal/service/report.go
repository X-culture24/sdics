package service

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ReportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

const reportPageSize = 5000

type ReportFormat string

const (
	FormatCSV  ReportFormat = "csv"
	FormatXLSX ReportFormat = "xlsx"
)

type CitizenReportFilter struct {
	CountyID       *uuid.UUID
	DistrictID     *uuid.UUID
	DivisionID     *uuid.UUID
	LocationID     *uuid.UUID
	RegStatus      *string
	CampaignID     *uuid.UUID
	ScopedUnits    []uuid.UUID
}

func (s *ReportService) ExportCitizens(format ReportFormat, f CitizenReportFilter) (*bytes.Buffer, string, error) {
	citizens, err := s.fetchCitizensForReport(f)
	if err != nil {
		return nil, "", err
	}
	ts := time.Now().Format("20060102_150405")
	switch format {
	case FormatCSV:
		buf, err := citizensToCSV(citizens)
		if err != nil {
			return nil, "", err
		}
		return buf, fmt.Sprintf("citizens_%s.csv", ts), nil
	case FormatXLSX:
		buf, err := citizensToXLSX(citizens)
		if err != nil {
			return nil, "", err
		}
		return buf, fmt.Sprintf("citizens_%s.xlsx", ts), nil
	default:
		return nil, "", errors.New("unsupported format")
	}
}

func (s *ReportService) PerformanceReport(format ReportFormat, level int16, scopedUnits []uuid.UUID) (*bytes.Buffer, string, error) {
	dsSvc := &DashboardService{db: s.db}
	rows, err := dsSvc.PerformanceTable(level, nil, scopedUnits)
	if err != nil {
		return nil, "", err
	}
	ts := time.Now().Format("20060102_150405")
	switch format {
	case FormatCSV:
		return performanceToCSV(rows), fmt.Sprintf("performance_level%d_%s.csv", level, ts), nil
	case FormatXLSX:
		buf, err := performanceToXLSX(rows)
		return buf, fmt.Sprintf("performance_level%d_%s.xlsx", level, ts), err
	default:
		return nil, "", errors.New("unsupported format")
	}
}

func (s *ReportService) CampaignReport(format ReportFormat, campaignID uuid.UUID, scopedUnits []uuid.UUID) (*bytes.Buffer, string, error) {
	reg, err := s.fetchCampaignRegistrations(campaignID, scopedUnits)
	if err != nil {
		return nil, "", err
	}
	ts := time.Now().Format("20060102_150405")
	switch format {
	case FormatCSV:
		return registrationsToCSV(reg), fmt.Sprintf("campaign_%s_%s.csv", campaignID.String()[:8], ts), nil
	case FormatXLSX:
		buf, err := registrationsToXLSX(reg)
		return buf, fmt.Sprintf("campaign_%s_%s.xlsx", campaignID.String()[:8], ts), err
	default:
		return nil, "", errors.New("unsupported format")
	}
}

func (s *ReportService) fetchCitizensForReport(f CitizenReportFilter) ([]model.Citizen, error) {
	var all []model.Citizen
	offset := 0
	for {
		q := s.db.Model(&model.Citizen{}).Preload("County").Preload("District")
		if f.CountyID != nil {
			q = q.Where("county_id = ?", *f.CountyID)
		}
		if f.DistrictID != nil {
			q = q.Where("district_id = ?", *f.DistrictID)
		}
		if f.DivisionID != nil {
			q = q.Where("division_id = ?", *f.DivisionID)
		}
		if f.LocationID != nil {
			q = q.Where("location_id = ?", *f.LocationID)
		}
		if f.RegStatus != nil {
			q = q.Where("registration_status = ?", *f.RegStatus)
		}
		if len(f.ScopedUnits) > 0 {
			q = q.Where(`county_id IN ? OR district_id IN ? OR division_id IN ? OR
				location_id IN ? OR sub_location_id IN ? OR village_id IN ?`,
				f.ScopedUnits, f.ScopedUnits, f.ScopedUnits, f.ScopedUnits, f.ScopedUnits, f.ScopedUnits)
		}

		var page []model.Citizen
		if err := q.Limit(reportPageSize).Offset(offset).Find(&page).Error; err != nil {
			return nil, err
		}
		all = append(all, page...)
		if len(page) < reportPageSize {
			break
		}
		offset += reportPageSize
	}
	return all, nil
}

type regRow struct {
	NationalID     string
	FullName       string
	RegisteredAt   time.Time
	RegisteredBy   string
	Source         string
	CampaignName   string
}

func (s *ReportService) fetchCampaignRegistrations(campaignID uuid.UUID, scopedUnits []uuid.UUID) ([]regRow, error) {
	var rows []regRow
	q := s.db.Table("registration_records rr").
		Select("c.national_id, c.full_name, rr.registered_at, u.full_name AS registered_by, rr.source, cam.name AS campaign_name").
		Joins("JOIN citizens c ON c.id = rr.citizen_id").
		Joins("JOIN users u ON u.id = rr.registered_by").
		Joins("JOIN campaigns cam ON cam.id = rr.campaign_id").
		Where("rr.campaign_id = ?", campaignID)
	if len(scopedUnits) > 0 {
		q = q.Where(`c.county_id IN ? OR c.district_id IN ? OR c.division_id IN ? OR
			c.location_id IN ? OR c.sub_location_id IN ? OR c.village_id IN ?`,
			scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits)
	}
	err := q.Order("rr.registered_at DESC").Scan(&rows).Error
	return rows, err
}

func citizensToCSV(list []model.Citizen) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	w := csv.NewWriter(buf)
	defer w.Flush()

	header := []string{"National ID", "Full Name", "Gender", "Phone", "County", "District", "Division", "Location",
		"Sub-Location", "Village", "Polling Station", "Registration Status", "Registration Date"}
	if err := w.Write(header); err != nil {
		return nil, err
	}

	for _, c := range list {
		regDate := ""
		if c.RegistrationDate != nil {
			regDate = c.RegistrationDate.Format("2006-01-02")
		}
		division := ""
		if c.DivisionID != nil {
			division = "see details"
		}
		_ = division
		row := []string{
			c.NationalID,
			c.FullName,
			c.Gender,
			c.PhoneNumber,
			c.County.Name,
			c.District.Name,
			"", "", "", "",
			c.PollingStation,
			c.RegistrationStatus,
			regDate,
		}
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}
	return buf, nil
}

func citizensToXLSX(list []model.Citizen) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheet := "Citizens"
	f.SetSheetName("Sheet1", sheet)

	header := []interface{}{"National ID", "Full Name", "Gender", "Phone", "County", "District", "Polling Station", "Registration Status", "Registration Date"}
	for i, h := range header {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	for i, c := range list {
		row := i + 2
		regDate := ""
		if c.RegistrationDate != nil {
			regDate = c.RegistrationDate.Format("2006-01-02")
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), c.NationalID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), c.FullName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), c.Gender)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), c.PhoneNumber)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), c.County.Name)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), c.District.Name)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), c.PollingStation)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), c.RegistrationStatus)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), regDate)
	}
	return f.WriteToBuffer()
}

func performanceToCSV(rows []PerformanceTableRow) *bytes.Buffer {
	buf := new(bytes.Buffer)
	w := csv.NewWriter(buf)
	defer w.Flush()
	w.Write([]string{"Level", "Name", "Parent", "Adult Population", "Registered", "Remaining", "Progress %"})
	for _, r := range rows {
		w.Write([]string{
			fmt.Sprintf("L%d", r.Level),
			r.Name,
			r.ParentName,
			strconv.FormatInt(r.AdultPop, 10),
			strconv.FormatInt(r.Registered, 10),
			strconv.FormatInt(r.Remaining, 10),
			fmt.Sprintf("%.2f", r.ProgressPct),
		})
	}
	return buf
}

func performanceToXLSX(rows []PerformanceTableRow) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheet := "Performance"
	f.SetSheetName("Sheet1", sheet)
	headers := []interface{}{"Level", "Name", "Parent", "Adult Population", "Registered", "Remaining", "Progress %"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	for i, r := range rows {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("L%d", r.Level))
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), r.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), r.ParentName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), r.AdultPop)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), r.Registered)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), r.Remaining)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), r.ProgressPct)
	}
	return f.WriteToBuffer()
}

func registrationsToCSV(rows []regRow) *bytes.Buffer {
	buf := new(bytes.Buffer)
	w := csv.NewWriter(buf)
	defer w.Flush()
	w.Write([]string{"Campaign", "National ID", "Full Name", "Registered At", "Registered By", "Source"})
	for _, r := range rows {
		w.Write([]string{
			r.CampaignName,
			r.NationalID,
			r.FullName,
			r.RegisteredAt.Format(time.RFC3339),
			r.RegisteredBy,
			r.Source,
		})
	}
	return buf
}

func registrationsToXLSX(rows []regRow) (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheet := "Registrations"
	f.SetSheetName("Sheet1", sheet)
	headers := []interface{}{"Campaign", "National ID", "Full Name", "Registered At", "Registered By", "Source"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	for i, r := range rows {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), r.CampaignName)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), r.NationalID)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), r.FullName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), r.RegisteredAt.Format(time.RFC3339))
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), r.RegisteredBy)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), r.Source)
	}
	return f.WriteToBuffer()
}
