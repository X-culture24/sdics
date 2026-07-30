package service

import (
	"fmt"
	"log"
	"os"
	"time"
)

// DebugLogger writes detailed diagnostic information about import failures
type DebugLogger struct {
	file   *os.File
	jobID  string
	closed bool
}

// NewDebugLogger creates a new debug logger for an import job
func NewDebugLogger(jobID string) (*DebugLogger, error) {
	filename := fmt.Sprintf("/tmp/import_debug_%s_%d.log", jobID[:8], time.Now().Unix())
	f, err := os.Create(filename)
	if err != nil {
		return nil, err
	}
	log.Printf("Debug log created: %s\n", filename)
	return &DebugLogger{
		file:  f,
		jobID: jobID,
	}, nil
}

// LogRowStart logs the beginning of processing a row
func (dl *DebugLogger) LogRowStart(rowNum int, nid, fullName, district, division, location, subloc, village string) {
	if dl == nil || dl.closed {
		return
	}
	dl.file.WriteString(fmt.Sprintf("--- ROW %d START ---\n", rowNum))
	dl.file.WriteString(fmt.Sprintf("National ID: %s\n", nid))
	dl.file.WriteString(fmt.Sprintf("Full Name: %s\n", fullName))
	dl.file.WriteString(fmt.Sprintf("District: %s\n", district))
	dl.file.WriteString(fmt.Sprintf("Division: %s\n", division))
	dl.file.WriteString(fmt.Sprintf("Location: %s\n", location))
	dl.file.WriteString(fmt.Sprintf("Sub-Location: %s\n", subloc))
	dl.file.WriteString(fmt.Sprintf("Village: %s\n", village))
	dl.file.WriteString(fmt.Sprintf("Timestamp: %s\n", time.Now().Format("2006-01-02 15:04:05.000")))
}

// LogLookup logs the result of a foreign key lookup
func (dl *DebugLogger) LogLookup(level int16, name string, parentID string, found bool, id string, err string) {
	if dl == nil || dl.closed {
		return
	}
	status := "FOUND"
	if !found {
		status = "CREATED"
	}
	dl.file.WriteString(fmt.Sprintf("  Level %d '%s' (parent=%s) -> %s (id=%s)\n", level, name, parentID, status, id))
	if err != "" {
		dl.file.WriteString(fmt.Sprintf("    ERROR: %s\n", err))
	}
}

// LogError logs an error during row processing
func (dl *DebugLogger) LogError(rowNum int, sql string, pgErr string, reason string) {
	if dl == nil || dl.closed {
		return
	}
	dl.file.WriteString(fmt.Sprintf("!!! ROW %d FAILED !!!\n", rowNum))
	dl.file.WriteString(fmt.Sprintf("Reason: %s\n", reason))
	if sql != "" {
		dl.file.WriteString(fmt.Sprintf("SQL: %s\n", sql))
	}
	if pgErr != "" {
		dl.file.WriteString(fmt.Sprintf("PostgreSQL Error: %s\n", pgErr))
	}
	dl.file.WriteString(fmt.Sprintf("Timestamp: %s\n", time.Now().Format("2006-01-02 15:04:05.000")))
}

// LogRowEnd logs successful completion of a row
func (dl *DebugLogger) LogRowEnd(rowNum int) {
	if dl == nil || dl.closed {
		return
	}
	dl.file.WriteString(fmt.Sprintf("--- ROW %d SUCCESS ---\n\n", rowNum))
}

// Close closes the debug log file
func (dl *DebugLogger) Close() error {
	if dl == nil || dl.closed {
		return nil
	}
	dl.closed = true
	if dl.file != nil {
		return dl.file.Close()
	}
	return nil
}
