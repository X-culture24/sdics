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

	// Count uniq districts
	districtSet := make(map[string]bool)
	for i := 1; i < len(excelRows); i++ {
		if len(excelRows[i]) > 2 {
			dist := strings.TrimSpace(excelRows[i][2])
			if dist != "" {
				districtSet[dist] = true
			}
		}
	}
	fmt.Printf("Unique districts: %d\n", len(districtSet))
	for dist := range districtSet {
		fmt.Printf("  [%s]\n", dist)
	}
}

func main() {
	checkFile("datasets/BARINGO.xlsx")
	checkFile("datasets/BOMET 2.xlsx")
	checkFile("datasets/KAJIADO.xlsx")
}
