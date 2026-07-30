package service

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type CitizenSyncService struct {
	db         *gorm.DB
	reportSvc  *ReportService
	exportPath string
}

func NewCitizenSyncService(db *gorm.DB, reportSvc *ReportService, exportPath string) *CitizenSyncService {
	return &CitizenSyncService{
		db:         db,
		reportSvc:  reportSvc,
		exportPath: exportPath,
	}
}

// SyncEvent represents a real-time change event
type SyncEvent struct {
	EventType  string         `json:"event_type"` // "citizen_registered", "citizen_updated"
	CitizenID  uuid.UUID      `json:"citizen_id"`
	Citizen    *model.Citizen `json:"citizen,omitempty"`
	Timestamp  time.Time      `json:"timestamp"`
	UpdatedBy  uuid.UUID      `json:"updated_by"`
	CampaignID uuid.UUID      `json:"campaign_id"`
}

// ExportRegisteredCitizens exports all registered citizens to Excel with timestamp
func (s *CitizenSyncService) ExportRegisteredCitizens(ctx context.Context, campaignID uuid.UUID) (string, error) {
	var citizens []model.Citizen
	query := s.db.Preload("County").Preload("District")

	if campaignID != uuid.Nil {
		// Get citizens registered in this campaign
		query = query.Joins("JOIN registration_records rr ON rr.citizen_id = citizens.id").
			Where("rr.campaign_id = ?", campaignID).
			Where("citizens.registration_status = ?", RegStatusRegistered).
			Distinct("citizens.*")
	} else {
		// Get all registered citizens
		query = query.Where("registration_status = ?", RegStatusRegistered)
	}

	if err := query.Find(&citizens).Error; err != nil {
		return "", fmt.Errorf("failed to fetch citizens: %w", err)
	}

	// Create workbook
	f := excelize.NewFile()
	sheet := "Registered Citizens"
	index, _ := f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)

	// Write headers
	headers := []string{
		"National ID",
		"Full Name",
		"Gender",
		"Phone",
		"County",
		"District",
		"Polling Station",
		"Registration Status",
		"Registration Date",
		"Last Updated",
	}
	for col, header := range headers {
		cell := fmt.Sprintf("%c%d", 'A'+rune(col), 1)
		f.SetCellValue(sheet, cell, header)
	}

	// Write data rows
	for row, citizen := range citizens {
		rowNum := row + 2
		regDate := ""
		if citizen.RegistrationDate != nil {
			regDate = citizen.RegistrationDate.Format("2006-01-02 15:04:05")
		}
		updatedAt := citizen.UpdatedAt.Format("2006-01-02 15:04:05")

		data := []interface{}{
			citizen.NationalID,
			citizen.FullName,
			citizen.Gender,
			citizen.PhoneNumber,
			citizen.County.Name,
			citizen.District.Name,
			citizen.PollingStation,
			citizen.RegistrationStatus,
			regDate,
			updatedAt,
		}

		for col, val := range data {
			cell := fmt.Sprintf("%c%d", 'A'+rune(col), rowNum)
			f.SetCellValue(sheet, cell, val)
		}
	}

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheet, col, col, 18)
	}

	// Create filename with timestamp
	timestamp := time.Now().Format("20060102_150405")
	var filename string
	if campaignID != uuid.Nil {
		filename = filepath.Join(s.exportPath, fmt.Sprintf("registered_citizens_%s_%s.xlsx", campaignID.String()[:8], timestamp))
	} else {
		filename = filepath.Join(s.exportPath, fmt.Sprintf("registered_citizens_%s.xlsx", timestamp))
	}

	if err := f.SaveAs(filename); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filename, nil
}

// GetSyncEvents retrieves recent sync events for WebSocket or polling
func (s *CitizenSyncService) GetSyncEvents(ctx context.Context, since time.Time, limit int) ([]SyncEvent, error) {
	var events []SyncEvent
	var registrations []struct {
		ID           uuid.UUID
		CitizenID    uuid.UUID
		CampaignID   uuid.UUID
		RegisteredBy uuid.UUID
		RegisteredAt time.Time
	}

	// Get recent registrations
	err := s.db.Table("registration_records").
		Where("registered_at >= ?", since).
		Order("registered_at DESC").
		Limit(limit).
		Scan(&registrations).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch registrations: %w", err)
	}

	// Convert to sync events with full citizen data
	for _, reg := range registrations {
		var citizen model.Citizen
		if err := s.db.Preload("County").Preload("District").First(&citizen, reg.CitizenID).Error; err != nil {
			continue
		}

		events = append(events, SyncEvent{
			EventType:  "citizen_registered",
			CitizenID:  reg.CitizenID,
			Citizen:    &citizen,
			Timestamp:  reg.RegisteredAt,
			UpdatedBy:  reg.RegisteredBy,
			CampaignID: reg.CampaignID,
		})
	}

	return events, nil
}

// ExportDailyProgressReport exports registration progress with comparison
func (s *CitizenSyncService) ExportDailyProgressReport(ctx context.Context, campaignID uuid.UUID) (string, error) {
	var targets []model.DailyTarget
	var progress []model.DailyProgress

	s.db.Where("campaign_id = ?", campaignID).Find(&targets)
	s.db.Where("campaign_id = ?", campaignID).Find(&progress)

	f := excelize.NewFile()
	sheet := "Daily Progress"
	index, _ := f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)

	headers := []string{"Date", "Admin Unit", "Target", "Registered", "Progress %"}
	for col, header := range headers {
		cell := fmt.Sprintf("%c%d", 'A'+rune(col), 1)
		f.SetCellValue(sheet, cell, header)
	}

	row := 2
	for _, prog := range progress {
		var target *model.DailyTarget
		for _, t := range targets {
			if t.AdminUnitID == prog.AdminUnitID && t.TargetDate == prog.ProgressDate {
				target = &t
				break
			}
		}

		var adminUnit model.AdminUnit
		s.db.First(&adminUnit, prog.AdminUnitID)

		targetCount := 0
		if target != nil {
			targetCount = target.TargetCount
		}

		percent := float64(0)
		if targetCount > 0 {
			percent = float64(prog.RegisteredCount) / float64(targetCount) * 100
		}

		data := []interface{}{
			prog.ProgressDate.Format("2006-01-02"),
			adminUnit.Name,
			targetCount,
			prog.RegisteredCount,
			fmt.Sprintf("%.1f%%", percent),
		}

		for col, val := range data {
			cell := fmt.Sprintf("%c%d", 'A'+rune(col), row)
			f.SetCellValue(sheet, cell, val)
		}
		row++
	}

	timestamp := time.Now().Format("20060102_150405")
	filename := filepath.Join(s.exportPath, fmt.Sprintf("daily_progress_%s_%s.xlsx", campaignID.String()[:8], timestamp))

	if err := f.SaveAs(filename); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filename, nil
}
