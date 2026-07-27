package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type AuditLogHandler struct {
	svc *service.AuditLogService
}

func NewAuditLogHandler(svc *service.AuditLogService) *AuditLogHandler {
	return &AuditLogHandler{svc: svc}
}

func (h *AuditLogHandler) List(c *gin.Context) {
	var actorID *uuid.UUID
	if a := c.Query("actor_id"); a != "" {
		parsed, err := uuid.Parse(a)
		if err == nil {
			actorID = &parsed
		}
	}
	var action *string
	if a := c.Query("action"); a != "" {
		action = &a
	}
	var entityType *string
	if e := c.Query("entity_type"); e != "" {
		entityType = &e
	}
	var entityID *uuid.UUID
	if e := c.Query("entity_id"); e != "" {
		parsed, err := uuid.Parse(e)
		if err == nil {
			entityID = &parsed
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	filter := &service.ListAuditLogFilter{
		ActorID:    actorID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Page:       page,
		PageSize:   pageSize,
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	logs, total, err := h.svc.List(filter, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs, "total": total, "page": page, "page_size": pageSize})
}

func (h *AuditLogHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid ID"},
		})
		return
	}
	log, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, log)
}

func (h *AuditLogHandler) LogEvent(c *gin.Context) {
	var body struct {
		Action     string      `json:"action" binding:"required"`
		EntityType string      `json:"entity_type" binding:"required"`
		EntityID   *uuid.UUID  `json:"entity_id,omitempty"`
		Details    interface{} `json:"details,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}
	actorID := middleware.GetUserID(c)
	actorP := &actorID
	err := h.svc.Log(actorP, body.Action, body.EntityType, body.EntityID, body.Details, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "logged", "at": time.Now().UTC().Format(time.RFC3339)})
}

type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

func parseFormat(q string) service.ReportFormat {
	switch strings.ToLower(q) {
	case "xlsx", "excel":
		return service.FormatXLSX
	default:
		return service.FormatCSV
	}
}

func (h *ReportHandler) ExportCitizens(c *gin.Context) {
	format := parseFormat(c.Query("format"))
	filter := service.CitizenReportFilter{}
	if cid := c.Query("county_id"); cid != "" {
		if p, err := uuid.Parse(cid); err == nil {
			filter.CountyID = &p
		}
	}
	if did := c.Query("district_id"); did != "" {
		if p, err := uuid.Parse(did); err == nil {
			filter.DistrictID = &p
		}
	}
	if div := c.Query("division_id"); div != "" {
		if p, err := uuid.Parse(div); err == nil {
			filter.DivisionID = &p
		}
	}
	if loc := c.Query("location_id"); loc != "" {
		if p, err := uuid.Parse(loc); err == nil {
			filter.LocationID = &p
		}
	}
	if rs := c.Query("registration_status"); rs != "" {
		filter.RegStatus = &rs
	}
	if cam := c.Query("campaign_id"); cam != "" {
		if p, err := uuid.Parse(cam); err == nil {
			filter.CampaignID = &p
		}
	}
	filter.ScopedUnits = middleware.GetAllowedUnits(c)

	buf, filename, err := h.svc.ExportCitizens(format, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	contentType := "text/csv"
	if format == service.FormatXLSX {
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, buf.Bytes())
}

func (h *ReportHandler) PerformanceReport(c *gin.Context) {
	format := parseFormat(c.Query("format"))
	level, _ := strconv.Atoi(c.DefaultQuery("level", "3"))
	if level < 2 {
		level = 2
	}
	if level > 8 {
		level = 8
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	buf, filename, err := h.svc.PerformanceReport(format, int16(level), scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	contentType := "text/csv"
	if format == service.FormatXLSX {
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, buf.Bytes())
}

func (h *ReportHandler) CampaignReport(c *gin.Context) {
	format := parseFormat(c.Query("format"))
	cid := c.Param("campaign_id")
	campaignID, err := uuid.Parse(cid)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	buf, filename, err := h.svc.CampaignReport(format, campaignID, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	contentType := "text/csv"
	if format == service.FormatXLSX {
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, buf.Bytes())
}
