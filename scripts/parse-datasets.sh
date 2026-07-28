#!/bin/bash

# This script parses Excel datasets and prepares them for bulk import
# It converts XLSX files in datasets/ to CSV format for processing

set -e

DATASETS_DIR="datasets"
OUTPUT_DIR="datasets/parsed"

mkdir -p "$OUTPUT_DIR"

echo "Parsing Excel datasets..."

# Check if unoconv is available (converts Excel to CSV)
if ! command -v unoconv &> /dev/null; then
  echo "Installing unoconv for Excel to CSV conversion..."
  # Requires LibreOffice to be installed
fi

for xlsx_file in "$DATASETS_DIR"/*.xlsx; do
  if [ -f "$xlsx_file" ]; then
    filename=$(basename "$xlsx_file" .xlsx)
    csv_file="$OUTPUT_DIR/$filename.csv"
    
    echo "Converting $filename.xlsx to CSV..."
    
    # Using ssconvert (part of gnumeric) - more reliable than unoconv
    if command -v ssconvert &> /dev/null; then
      ssconvert "$xlsx_file" "$csv_file"
    else
      # Fallback: use pandas via Python if available
      python3 << EOF
import pandas as pd
import sys

try:
    df = pd.read_excel('$xlsx_file')
    df.to_csv('$csv_file', index=False)
    print(f"Successfully converted $filename.xlsx to $csv_file")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
EOF
    fi
  fi
done

echo "Dataset parsing complete. Files ready in $OUTPUT_DIR/"
