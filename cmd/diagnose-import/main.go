package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/sdic/nvrcms/internal/config"
	"github.com/sdic/nvrcms/internal/service"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	excelFile := flag.String("file", "", "Path to Excel file to diagnose")
	validateCounties := flag.Bool("validate-counties", false, "Validate county names against database")
	validateRows := flag.Bool("validate-rows", false, "Validate all rows")
	validateForeignKeys := flag.Bool("validate-fk", false, "Validate foreign key references")
	firstRowsOnly := flag.Int("first", 0, "Only check first N rows (0 = all)")
	flag.Parse()

	if *excelFile == "" {
		fmt.Println("Usage:")
		fmt.Println("  diagnose-import -file=path/to/file.xlsx [-validate-counties] [-validate-rows] [-validate-fk] [-first=N]")
		fmt.Println()
		fmt.Println("Options:")
		fmt.Println("  -file string           Path to Excel file to diagnose (required)")
		fmt.Println("  -validate-counties     Check county names against database")
		fmt.Println("  -validate-rows         Validate all rows for issues")
		fmt.Println("  -validate-fk           Validate foreign key references")
		fmt.Println("  -first N               Only check first N rows")
		os.Exit(1)
	}

	// Connect to database
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/nvrcms_db?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v\n", err)
	}

	// Parse Excel file
	rows, err := parseExcelFile(*excelFile)
	if err != nil {
		log.Fatalf("Failed to parse Excel file: %v\n", err)
	}

	if len(rows) == 0 {
		fmt.Println("No rows found in Excel file")
		os.Exit(1)
	}

	// Limit to first N rows if specified
	if *firstRowsOnly > 0 && len(rows) > *firstRowsOnly {
		rows = rows[:*firstRowsOnly]
	}

	fmt.Printf("Excel file: %s\n", filepath.Base(*excelFile))
	fmt.Printf("Total rows: %d\n\n", len(rows))

	// Create services
	cfg := &config.Config{}
	adminUnitSvc := service.NewAdminUnitService(db)
	citizenSvc := service.NewCitizenService(db)
	importSvc := service.NewImportService(db, cfg, adminUnitSvc, citizenSvc)

	// Validate rows
	if *validateRows {
		fmt.Println("=== ROW VALIDATION ===")
		reports := importSvc.ValidateRows(rows)
		if len(reports) == 0 {
			fmt.Println("✓ All rows are valid")
		} else {
			fmt.Printf("✗ Found %d rows with issues:\n\n", len(reports))
			for _, r := range reports {
				fmt.Printf("Row %d: NID=%s, Name=%s\n", r.RowNum, r.NationalID, r.FullName)
				for _, issue := range r.Issues {
					fmt.Printf("  • %s\n", issue)
				}
				fmt.Println()
			}
		}
	}

	// Validate counties
	if *validateCounties {
		fmt.Println("=== COUNTY VALIDATION ===")
		reports := importSvc.ValidateCountiesAgainstDatabase(rows)
		fmt.Printf("Found %d unique counties in Excel:\n\n", len(reports))
		for _, r := range reports {
			status := "✓ FOUND"
			if !r.Match {
				if r.CaseSensitiveIssue {
					status = "⚠ CASE MISMATCH"
				} else if len(r.DatabaseCounties) == 0 {
					status = "✗ NOT FOUND"
				}
			}
			fmt.Printf("%s: '%s'\n", status, r.ExcelCounty)
			if len(r.DatabaseCounties) > 0 {
				for _, dbName := range r.DatabaseCounties {
					fmt.Printf("   Database: '%s'\n", dbName)
				}
			}
			fmt.Println()
		}
	}

	// Validate foreign keys
	if *validateForeignKeys {
		fmt.Println("=== FOREIGN KEY VALIDATION ===")
		tx := db.Begin()
		reports := importSvc.ValidateForeignKeys(tx, rows)
		tx.Rollback() // Don't commit the transaction

		if len(reports) == 0 {
			fmt.Println("✓ All foreign keys can be resolved")
		} else {
			fmt.Printf("✗ Found %d rows with FK issues:\n\n", len(reports))
			for _, r := range reports {
				fmt.Printf("Row %d: NID=%s, Name=%s\n", r.RowNum, r.NationalID, r.FullName)
				for _, issue := range r.Issues {
					fmt.Printf("  • %s\n", issue)
				}
				fmt.Println()
			}
		}
	}

	// Print sample rows
	fmt.Println("=== SAMPLE ROWS ===")
	maxRows := 5
	if len(rows) < maxRows {
		maxRows = len(rows)
	}
	for i := 0; i < maxRows; i++ {
		r := rows[i]
		fmt.Printf("Row %d:\n", r.RowNum)
		fmt.Printf("  NID: %s\n", r.NationalID)
		fmt.Printf("  Name: %s\n", r.FullName)
		fmt.Printf("  Gender: %s\n", r.Gender)
		fmt.Printf("  County: %s\n", r.County)
		fmt.Printf("  District: %s\n", r.District)
		fmt.Printf("  Division: %s\n", r.Division)
		fmt.Printf("  Location: %s\n", r.Location)
		fmt.Printf("  SubLocation: %s\n", r.SubLoc)
		fmt.Printf("  Village: %s\n", r.Village)
		fmt.Println()
	}
}

// Copied from import.go - same structure for consistency
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

func parseExcelFile(path string) ([]citizenRow, error) {
	// This would need to be implemented - for now just error
	return nil, fmt.Errorf("parseExcelFile not yet implemented in diagnose tool")
}
