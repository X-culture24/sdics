package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
	"github.com/xuri/excelize/v2"
)

func main() {
	// Connect to database
	db, err := sql.Open("postgres", "host=localhost port=5432 user=sdic_agent password=James_Bond007! dbname=sdic sslmode=disable")
	if err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	defer db.Close()

	// Get all level-2 admin units (counties/districts)
	rows, err := db.Query("SELECT LOWER(name) FROM admin_units WHERE level = 2 ORDER BY name")
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	dbUnits := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			log.Fatalf("Scan failed: %v", err)
		}
		dbUnits[name] = true
	}

	fmt.Printf("Database has %d level-2 admin units\n\n", len(dbUnits))

	// Open first Excel file
	f, err := excelize.OpenFile("datasets/BARINGO.xlsx")
	if err != nil {
		log.Fatalf("Excel open failed: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	excelRows, err := f.GetRows(sheets[0])
	if err != nil {
		log.Fatalf("GetRows failed: %v", err)
	}

	if len(excelRows) < 2 {
		log.Fatal("Less than 2 rows in Excel")
	}

	// Print header
	fmt.Println("=== HEADER ROW ===")
	for i, cell := range excelRows[0] {
		fmt.Printf("Col %d: [%s]\n", i, cell)
	}

	// Detect columns
	fmt.Println("\n=== DETECTING COLUMNS ===")
	var districtIdx int
	for i, header := range excelRows[0] {
		h := strings.ToLower(strings.TrimSpace(header))
		if strings.Contains(h, "district") || strings.Contains(h, "constituency") || strings.Contains(h, "subcounty") {
			districtIdx = i
			fmt.Printf("District column found at index %d: [%s]\n", i, header)
			break
		}
	}

	if districtIdx == 0 && !strings.Contains(strings.ToLower(excelRows[0][0]), "district") {
		fmt.Println("WARNING: Using default district column index 4")
		districtIdx = 4
	}

	// Check first 10 data rows
	fmt.Println("\n=== FIRST 10 DATA ROWS - CHECKING DISTRICTS ===")
	mismatches := 0
	for i := 1; i < len(excelRows) && i <= 10; i++ {
		row := excelRows[i]
		if len(row) <= districtIdx {
			fmt.Printf("Row %d: INCOMPLETE - only %d columns\n", i+1, len(row))
			continue
		}

		districtName := strings.TrimSpace(row[districtIdx])
		lowerDist := strings.ToLower(districtName)

		if districtName == "" {
			fmt.Printf("Row %d: EMPTY district\n", i+1)
			mismatches++
			continue
		}

		if dbUnits[lowerDist] {
			fmt.Printf("Row %d: ✓ [%s] matches database\n", i+1, districtName)
		} else {
			fmt.Printf("Row %d: ✗ [%s] NOT in database\n", i+1, districtName)
			mismatches++

			// Try to find close matches
			for dbUnit := range dbUnits {
				if strings.Contains(lowerDist, strings.Split(dbUnit, " ")[0]) {
					fmt.Printf("       Possible match: [%s]\n", dbUnit)
				}
			}
		}
	}

	fmt.Printf("\n=== SUMMARY ===\n")
	fmt.Printf("Mismatches in first 10 rows: %d\n", mismatches)
}
