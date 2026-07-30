package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/xuri/excelize/v2"
)

func checkFile(filename string) {
	fmt.Printf("\n=== %s ===\n", filename)
	f, err := excelize.OpenFile(filename)
	if err != nil {
		log.Fatalf("Excel open failed: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	excelRows, err := f.GetRows(sheets[0])
	if err != nil {
		log.Fatalf("GetRows failed: %v", err)
	}

	fmt.Println("=== HEADER ROW ===")
	for i, cell := range excelRows[0] {
		fmt.Printf("Col %d: [%s]\n", i, cell)
	}

	fmt.Println("\n=== FIRST DATA ROW ===")
	row := excelRows[1]
	fmt.Printf("Full Name: %s\n", row[0])
	fmt.Printf("Sex: %s\n", row[1])
	fmt.Printf("District: %s\n", row[2])
	fmt.Printf("Division: %s\n", row[3])
	fmt.Printf("Location: %s\n", row[4])
	fmt.Printf("Sub Location: %s\n", row[5])
	fmt.Printf("Village: %s\n", row[6])
	fmt.Printf("ID Number: %s\n", row[7])

	// Check total rows
	fmt.Printf("\nTotal rows in Excel: %d (including header)\n", len(excelRows))
	fmt.Printf("Total data rows: %d\n", len(excelRows)-1)

	// Count uniq districts
	districtSet := make(map[string]bool)
	for i := 1; i < len(excelRows); i++ {
		if len(excelRows[i]) > 2 {
			dist := strings.TrimSpace(excelRows[i][2])
			districtSet[dist] = true
		}
	}
	fmt.Printf("\nUnique districts in Excel: %d\n", len(districtSet))
	for dist := range districtSet {
		fmt.Printf("  - %s\n", dist)
	}
}
