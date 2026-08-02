package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type ImportHandler struct {
	svc *service.ImportService
	cfgUploadDir string
	cfgMaxMB     int64
}

func NewImportHandler(svc *service.ImportService, uploadDir string, maxMB int64) *ImportHandler {
	return &ImportHandler{svc: svc, cfgUploadDir: uploadDir, cfgMaxMB: maxMB}
}

type startFromDatasetsRequest struct {
	Confirm bool `json:"confirm" binding:"required"`
}

func (h *ImportHandler) StartFromDatasets(c *gin.Context) {
	var req startFromDatasetsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}
	if !req.Confirm {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "confirmation required"},
		})
		return
	}
	userID := middleware.GetUserID(c)
	job, err := h.svc.StartFromDatasets(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidFile) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "NO_DATASETS", "message": "No .xlsx files found in datasets folder"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusAccepted, job)
}

func (h *ImportHandler) UploadFile(c *gin.Context) {
	userID := middleware.GetUserID(c)

	maxBytes := h.cfgMaxMB * 1024 * 1024
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}
	defer file.Close()

	var campaignID *uuid.UUID
	if cid := c.PostForm("campaign_id"); cid != "" {
		p, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &p
		}
	}

	defaultCounty := c.PostForm("county")
	job, err := h.svc.StartFromUpload(c.Request.Context(), header.Filename, file, userID, campaignID, defaultCounty)
	if err != nil {
		if errors.Is(err, service.ErrInvalidFile) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_FILE", "message": "Only .xlsx files accepted"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusAccepted, job)
}

func (h *ImportHandler) ListJobs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	scopedUnits := middleware.GetAllowedUnits(c)
	jobs, total, err := h.svc.ListJobs(page, pageSize, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": jobs, "total": total, "page": page, "page_size": pageSize})
}

func (h *ImportHandler) GetJob(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid job ID"},
		})
		return
	}
	job, err := h.svc.GetJob(id)
	if err != nil {
		if errors.Is(err, service.ErrImportNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Import job not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, job)
}
