package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

// DatasetHandler handles dataset-related HTTP requests
type DatasetHandler struct {
	svc       *service.DatasetService
	importSvc *service.ImportService
}

// NewDatasetHandler creates a new dataset handler
func NewDatasetHandler(svc *service.DatasetService, importSvc *service.ImportService) *DatasetHandler {
	return &DatasetHandler{svc: svc, importSvc: importSvc}
}

// UploadDataset handles Excel file upload
// POST /datasets/upload
func (h *DatasetHandler) UploadDataset(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"},
		})
		return
	}

	// Parse form
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Missing file"},
		})
		return
	}

	county := c.PostForm("county")
	if county == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Missing county parameter"},
		})
		return
	}

	// Open file
	fileReader, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Cannot read file"},
		})
		return
	}
	defer fileReader.Close()

	data, err := io.ReadAll(fileReader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Cannot read uploaded file"},
		})
		return
	}

	// Import raw dataset rows for audit and dataset browsing
	upload, err := h.svc.ImportDatasetFromFile(
		c.Request.Context(),
		bytes.NewReader(data),
		file.Filename,
		county,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "IMPORT_FAILED", "message": fmt.Sprintf("Upload import failed: %v", err)},
		})
		return
	}

	// Start a background citizen import for the uploaded file so county data is reflected in the Citizens table and dashboard.
	go func() {
		if _, err := h.importSvc.StartFromUpload(c.Request.Context(), file.Filename, bytes.NewReader(data), userID, nil, county); err != nil {
			fmt.Printf("[DatasetUpload] failed to start citizen import for %s: %v\n", file.Filename, err)
		}
	}()

	c.JSON(http.StatusOK, upload)
}

// ListDatasets lists all datasets
// GET /datasets
func (h *DatasetHandler) ListDatasets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	uploads, total, err := h.svc.ListDatasets(c.Request.Context(), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list datasets"},
		})
		return
	}

	totalPage := (total + int64(pageSize) - 1) / int64(pageSize)

	c.JSON(http.StatusOK, gin.H{
		"data":       uploads,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
		"total_page": totalPage,
	})
}

// GetDataset retrieves a single dataset
// GET /datasets/:id
func (h *DatasetHandler) GetDataset(c *gin.Context) {
	id := c.Param("id")

	if id == "records" {
		h.ListDatasetRecordsByCounty(c)
		return
	}

	uploadID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid dataset ID"},
		})
		return
	}

	upload, err := h.svc.GetDataset(c.Request.Context(), uploadID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Dataset not found"},
		})
		return
	}

	c.JSON(http.StatusOK, upload)
}

// ListDatasetRecords lists records from a dataset
// GET /datasets/:id/records
func (h *DatasetHandler) ListDatasetRecords(c *gin.Context) {
	id := c.Param("id")
	if id == "records" {
		h.ListDatasetRecordsByCounty(c)
		return
	}
	uploadID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid dataset ID"},
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	params := &service.DatasetListParams{
		County:             c.Query("county"),
		District:           c.Query("district"),
		Gender:             c.Query("gender"),
		RegistrationStatus: c.Query("registration_status"),
		NationalID:         c.Query("national_id"),
		Name:               c.Query("name"),
		Page:               page,
		PageSize:           pageSize,
		SortBy:             c.DefaultQuery("sort_by", "row_number"),
		SortOrder:          c.DefaultQuery("sort_order", "ASC"),
	}

	result, err := h.svc.ListDatasetRecords(c.Request.Context(), uploadID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("Failed to list records: %v", err)},
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDatasetRecord retrieves a single record
// GET /datasets/:dataset_id/records/:record_id
func (h *DatasetHandler) GetDatasetRecord(c *gin.Context) {
	recordID, err := uuid.Parse(c.Param("record_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid record ID"},
		})
		return
	}

	record, err := h.svc.GetDatasetRecord(c.Request.Context(), recordID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Record not found"},
		})
		return
	}

	c.JSON(http.StatusOK, record)
}

// UpdateDatasetRecord updates a record
// PUT /datasets/:dataset_id/records/:record_id
func (h *DatasetHandler) UpdateDatasetRecord(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"},
		})
		return
	}

	recordID, err := uuid.Parse(c.Param("record_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid record ID"},
		})
		return
	}

	var body map[string]interface{}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid request body"},
		})
		return
	}

	if err := h.svc.UpdateDatasetRecord(c.Request.Context(), recordID, body, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update record"},
		})
		return
	}

	// Fetch updated record
	record, err := h.svc.GetDatasetRecord(c.Request.Context(), recordID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch updated record"},
		})
		return
	}

	c.JSON(http.StatusOK, record)
}

// DeleteDatasetRecord deletes a record
// DELETE /datasets/:dataset_id/records/:record_id
func (h *DatasetHandler) DeleteDatasetRecord(c *gin.Context) {
	recordID, err := uuid.Parse(c.Param("record_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid record ID"},
		})
		return
	}

	if err := h.svc.DeleteDatasetRecord(c.Request.Context(), recordID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to delete record"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Record deleted"})
}

// ExportDatasetToExcel exports dataset records to Excel
// GET /datasets/:id/export
func (h *DatasetHandler) ExportDatasetToExcel(c *gin.Context) {
	id := c.Param("id")
	uploadID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid dataset ID"},
		})
		return
	}

	// Build filter params from query
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "999999")) // Export all matching

	params := &service.DatasetListParams{
		County:             c.Query("county"),
		District:           c.Query("district"),
		Gender:             c.Query("gender"),
		RegistrationStatus: c.Query("registration_status"),
		NationalID:         c.Query("national_id"),
		Name:               c.Query("name"),
		Page:               page,
		PageSize:           pageSize,
		SortBy:             c.DefaultQuery("sort_by", "row_number"),
		SortOrder:          c.DefaultQuery("sort_order", "ASC"),
	}

	excelBytes, err := h.svc.ExportToExcel(c.Request.Context(), uploadID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to export"},
		})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"dataset_%s.xlsx\"", uploadID.String()[:8]))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes)
}

// GetDatasetValidationErrors retrieves validation errors for a dataset
// GET /datasets/:id/validation-errors
func (h *DatasetHandler) GetDatasetValidationErrors(c *gin.Context) {
	id := c.Param("id")
	uploadID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid dataset ID"},
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	errors, total, err := h.svc.GetDatasetValidationErrors(c.Request.Context(), uploadID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to get validation errors"},
		})
		return
	}

	totalPage := (total + int64(pageSize) - 1) / int64(pageSize)

	c.JSON(http.StatusOK, gin.H{
		"data":       errors,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
		"total_page": totalPage,
	})
}

// ListDatasetRecordsByCounty lists records across all datasets for a specific county
// GET /datasets/records
func (h *DatasetHandler) resolveCountyQuery(c *gin.Context) (string, *uuid.UUID, error) {
	county := c.Query("county")
	countyID := c.Query("county_id")

	fmt.Printf("[resolveCountyQuery] county=%q, county_id=%q\n", county, countyID)

	if county != "" {
		return county, nil, nil
	}
	if countyID == "" {
		fmt.Printf("[resolveCountyQuery] county_id is empty, returning nil\n")
		return "", nil, nil
	}

	fmt.Printf("[resolveCountyQuery] Parsing county_id: %q\n", countyID)
	parsed, err := uuid.Parse(countyID)
	if err != nil {
		fmt.Printf("[resolveCountyQuery] Error parsing UUID: %v\n", err)
		return "", nil, err
	}

	fmt.Printf("[resolveCountyQuery] Resolved UUID: %s, calling ResolveCountyName\n", parsed)
	name, err := h.svc.ResolveCountyName(c.Request.Context(), parsed)
	if err != nil {
		fmt.Printf("[resolveCountyQuery] Error resolving county name: %v\n", err)
		return "", nil, err
	}

	fmt.Printf("[resolveCountyQuery] Resolved county name: %q\n", name)
	return name, &parsed, nil
}

func (h *DatasetHandler) ListDatasetRecordsByCounty(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	county, countyID, err := h.resolveCountyQuery(c)
	if err != nil {
		fmt.Printf("[ListDatasetRecordsByCounty] Error resolving county query: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": fmt.Sprintf("Invalid county_id: %v", err)},
		})
		return
	}

	if county == "" && countyID == nil {
		fmt.Printf("[ListDatasetRecordsByCounty] County parameter is empty\n")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "County parameter is required"},
		})
		return
	}

	fmt.Printf("[ListDatasetRecordsByCounty] Resolved county: %q, countyID: %v\n", county, countyID)

	summaryOnly := c.Query("summary") == "true" || c.Query("summary") == "1"

	params := &service.DatasetListParams{
		County:             county,
		CountyID:           countyID,
		District:           c.Query("district"),
		Gender:             c.Query("gender"),
		RegistrationStatus: c.Query("registration_status"),
		NationalID:         c.Query("national_id"),
		Name:               c.Query("name"),
		Page:               page,
		PageSize:           pageSize,
		SortBy:             c.DefaultQuery("sort_by", "row_number"),
		SortOrder:          c.DefaultQuery("sort_order", "ASC"),
	}

	if summaryOnly {
		summary, err := h.svc.GetDatasetSummaryByCounty(c.Request.Context(), params)
		if err != nil {
			fmt.Printf("[ListDatasetRecordsByCounty] DB error for county=%q summary: %v\n", county, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("Failed to summarize dataset records: %v", err)},
			})
			return
		}

		c.JSON(http.StatusOK, summary)
		return
	}

	result, err := h.svc.ListAllDatasetRecordsByCounty(c.Request.Context(), params)
	if err != nil {
		fmt.Printf("[ListDatasetRecordsByCounty] DB error for county=%q: %v\n", county, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("Failed to list dataset records: %v", err)},
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// RegisterDatasetRecord registers a person from a dataset record
// POST /dataset-records/register
func (h *DatasetHandler) RegisterDatasetRecord(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"},
		})
		return
	}

	var body struct {
		RecordID   string `json:"record_id"`
		CampaignID string `json:"campaign_id"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid request body"},
		})
		return
	}

	if body.RecordID == "" || body.CampaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "record_id and campaign_id are required"},
		})
		return
	}

	recordID, err := uuid.Parse(body.RecordID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid record ID"},
		})
		return
	}

	campaignID, err := uuid.Parse(body.CampaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	if err := h.svc.RegisterDatasetRecord(c.Request.Context(), recordID, campaignID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": fmt.Sprintf("Failed to register: %v", err)},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Record registered successfully"})
}
func (h *DatasetHandler) RegisterDatasetRecordFromCampaign(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "UNAUTHORIZED", "message": "User not authenticated"}})
		return
	}

	var req struct {
		RecordID   string `json:"record_id" binding:"required"`
		CampaignID string `json:"campaign_id" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid request"}})
		return
	}

	recordID, err := uuid.Parse(req.RecordID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid record ID"}})
		return
	}

	campaignID, err := uuid.Parse(req.CampaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"}})
		return
	}

	if err := h.svc.RegisterDatasetRecord(c.Request.Context(), recordID, campaignID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "Registration failed"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Record registered successfully"})
}
