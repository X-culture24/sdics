package main

import (
	"fmt"
	"strings"

	"github.com/xuri/excelize/v2"
)

func checkFile(filename string) {
	fmt.Printf("\n=== %s ===\n", filename)
	f, err := excelize.OpenFile(filename)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer f.Close()

	sheets := f.GetSheetList()
	excelRows, err := f.GetRows(sheets[0])
	if err != nil {
		fmt.Printf("GetRows failed: %v\n", err)
		return
	}

	fmt.Println("HEADER: ", strings.Join(excelRows[0], " | "))

	// Check first row
	if len(excelRows) > 1 {
		row := excelRows[1]
		fmt.Printf("First data row:\n")
		for i, val := range row {
			fmt.Printf("  Col %d: [%s]\n", i, val)
		}
	}
}

func main() {
	checkFile("datasets/BARINGO.xlsx")
}
