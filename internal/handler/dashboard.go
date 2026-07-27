package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func (h *DashboardHandler) GetKPIs(c *gin.Context) {
	var campaignID *uuid.UUID
	if cid := c.Query("campaign_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &parsed
		}
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	kpi, err := h.svc.GetKPIs(campaignID, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, kpi)
}

func (h *DashboardHandler) DistrictPerformance(c *gin.Context) {
	var campaignID *uuid.UUID
	if cid := c.Query("campaign_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &parsed
		}
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	rows, err := h.svc.DistrictPerformance(campaignID, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (h *DashboardHandler) RegistrationTrend(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days < 7 {
		days = 7
	}
	if days > 365 {
		days = 365
	}
	var campaignID *uuid.UUID
	if cid := c.Query("campaign_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &parsed
		}
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	rows, err := h.svc.RegistrationTrend(campaignID, days, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows, "days": days})
}

func (h *DashboardHandler) PerformanceTable(c *gin.Context) {
	level, _ := strconv.Atoi(c.DefaultQuery("level", "3"))
	if level < 2 {
		level = 2
	}
	if level > 8 {
		level = 8
	}
	var campaignID *uuid.UUID
	if cid := c.Query("campaign_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &parsed
		}
	}
	scopedUnits := middleware.GetAllowedUnits(c)
	rows, err := h.svc.PerformanceTable(int16(level), campaignID, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows, "level": level})
}
