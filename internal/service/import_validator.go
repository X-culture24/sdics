package service

import (
	"fmt"
	"strings"

	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/utils"
	"gorm.io/gorm"
)

// ValidationReport holds comprehensive validation results for import data
type ValidationReport struct {
	RowNum      int
	NationalID  string
	FullName    string
	District    string
	Division    string
	Location    string
	SubLocation string
	Village     string
	Issues      []string
}

// ValidateRows performs comprehensive validation on all rows before import
// Returns a report of issues found
func (s *ImportService) ValidateRows(rows []citizenRow) []ValidationReport {
	var reports []ValidationReport

	// Build a set of valid administrative units
	validCounties := make(map[string]bool)

	var counties []model.AdminUnit
	s.db.Where("level = 2").Find(&counties)
	for _, c := range counties {
		// Store both original and normalized versions
		validCounties[strings.ToLower(strings.TrimSpace(c.Name))] = true
		validCounties[strings.TrimSpace(c.Name)] = true
	}

	for _, r := range rows {
		report := ValidationReport{
			RowNum:      r.RowNum,
			NationalID:  r.NationalID,
			FullName:    r.FullName,
			District:    r.District,
			Division:    r.Division,
			Location:    r.Location,
			SubLocation: r.SubLoc,
			Village:     r.Village,
			Issues:      []string{},
		}

		// Validate National ID
		nid := utils.NormalizeNationalID(r.NationalID)
		if r.NationalID != "" && !utils.ValidNationalID(nid) {
			report.Issues = append(report.Issues, fmt.Sprintf("Invalid National ID: '%s' (normalized: '%s')", r.NationalID, nid))
		}
		if nid == "" && strings.TrimSpace(r.FullName) == "" {
			report.Issues = append(report.Issues, "Both National ID and Full Name are empty")
		}

		// Validate Full Name
		fullName := strings.TrimSpace(r.FullName)
		if nid != "" && fullName == "" {
			report.Issues = append(report.Issues, "Full Name is empty but National ID is present")
		}

		// Validate County/District
		countyName := strings.TrimSpace(r.County)
		if countyName == "" {
			districtName := strings.TrimSpace(r.District)
			if districtName != "" {
				parts := strings.Fields(districtName)
				countyName = parts[0]
			}
		}
		if countyName == "" {
			report.Issues = append(report.Issues, "County/District name missing")
		} else {
			countyKey := strings.ToLower(strings.TrimSpace(countyName))
			if !validCounties[countyKey] && !validCounties[countyName] {
				report.Issues = append(report.Issues, fmt.Sprintf("County not found in database: '%s'", countyName))
			}
		}

		// Validate Gender
		gender := strings.ToUpper(strings.TrimSpace(r.Gender))
		if gender != "" && !strings.HasPrefix(gender, "M") && !strings.HasPrefix(gender, "F") {
			report.Issues = append(report.Issues, fmt.Sprintf("Invalid gender value: '%s' (expected M, F, Male, or Female)", r.Gender))
		}

		// Check for whitespace issues
		if strings.Contains(r.NationalID, "  ") {
			report.Issues = append(report.Issues, "National ID contains double spaces")
		}
		if strings.Contains(r.FullName, "  ") {
			report.Issues = append(report.Issues, "Full Name contains double spaces")
		}

		if len(report.Issues) > 0 {
			reports = append(reports, report)
		}
	}

	return reports
}

// CountyLookupReport shows which counties are in Excel vs database
type CountyLookupReport struct {
	ExcelCounty        string
	DatabaseCounties   []string
	Match              bool
	CaseSensitiveIssue bool
	NormalizationIssue bool
}

// ValidateCountiesAgainstDatabase checks county name matching
func (s *ImportService) ValidateCountiesAgainstDatabase(rows []citizenRow) []CountyLookupReport {
	var reports []CountyLookupReport
	seenCounties := make(map[string]bool)

	// Get all counties from database
	var dbCounties []model.AdminUnit
	s.db.Where("level = 2").Order("name ASC").Find(&dbCounties)
	dbCountyNames := make(map[string]string) // lowercase -> actual name
	for _, c := range dbCounties {
		dbCountyNames[strings.ToLower(strings.TrimSpace(c.Name))] = c.Name
	}

	for _, r := range rows {
		countyName := strings.TrimSpace(r.County)
		if countyName == "" {
			if strings.TrimSpace(r.District) != "" {
				parts := strings.Fields(strings.TrimSpace(r.District))
				countyName = parts[0]
			}
		}

		if countyName == "" || seenCounties[countyName] {
			continue
		}
		seenCounties[countyName] = true

		report := CountyLookupReport{
			ExcelCounty:      countyName,
			DatabaseCounties: make([]string, 0),
		}

		// Check exact match
		for _, db := range dbCounties {
			if strings.EqualFold(strings.TrimSpace(db.Name), countyName) {
				report.DatabaseCounties = append(report.DatabaseCounties, db.Name)
				if strings.TrimSpace(db.Name) == countyName {
					report.Match = true
				} else {
					report.CaseSensitiveIssue = true
				}
			}
		}

		reports = append(reports, report)
	}

	return reports
}

// ForeignKeyLookupReport details foreign key resolution issues
type ForeignKeyLookupReport struct {
	RowNum      int
	NationalID  string
	District    string
	Division    string
	Location    string
	SubLocation string
	Village     string
	Issues      []string
}

// ValidateForeignKeys checks if all required FK references exist or can be created
func (s *ImportService) ValidateForeignKeys(tx *gorm.DB, rows []citizenRow) []ForeignKeyLookupReport {
	var reports []ForeignKeyLookupReport

	// Get or create Kenya
	var kenya model.AdminUnit
	if err := tx.Where("level = 1 AND name ILIKE ?", "Kenya").First(&kenya).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			kenya = model.AdminUnit{Name: "Kenya", Level: 1}
			tx.Create(&kenya)
		}
	}

	unitCache := make(map[string]bool)

	for _, r := range rows {
		report := ForeignKeyLookupReport{
			RowNum:      r.RowNum,
			NationalID:  r.NationalID,
			District:    r.District,
			Division:    r.Division,
			Location:    r.Location,
			SubLocation: r.SubLoc,
			Village:     r.Village,
			Issues:      []string{},
		}

		// Check county
		countyName := strings.TrimSpace(r.County)
		if countyName == "" {
			districtName := strings.TrimSpace(r.District)
			if districtName != "" {
				parts := strings.Fields(districtName)
				countyName = parts[0]
			}
		}

		if countyName != "" {
			key := fmt.Sprintf("2:%s", countyName)
			if !unitCache[key] {
				var county model.AdminUnit
				err := tx.Where("level = 2 AND name ILIKE ?", countyName).Where("parent_id = ?", kenya.ID).First(&county).Error
				if err != nil {
					if err == gorm.ErrRecordNotFound {
						report.Issues = append(report.Issues, fmt.Sprintf("County '%s' not found (level 2)", countyName))
					} else {
						report.Issues = append(report.Issues, fmt.Sprintf("Error looking up county '%s': %v", countyName, err))
					}
				} else {
					unitCache[key] = true
				}
			}
		}

		// Check division (level 3)
		if strings.TrimSpace(r.District) != "" {
			key := fmt.Sprintf("3:%s", r.District)
			if !unitCache[key] {
				var div model.AdminUnit
				err := tx.Where("level = 3 AND name ILIKE ?", r.District).First(&div).Error
				if err != nil && err != gorm.ErrRecordNotFound {
					report.Issues = append(report.Issues, fmt.Sprintf("Error looking up division '%s': %v", r.District, err))
				}
				// It's OK if not found (will be created on-demand)
				unitCache[key] = true
			}
		}

		if len(report.Issues) > 0 {
			reports = append(reports, report)
		}
	}

	return reports
}
