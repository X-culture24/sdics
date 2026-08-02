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
	svc        *service.DashboardService
	adminSvc   *service.AdminUnitService
}

func NewDashboardHandler(svc *service.DashboardService, adminSvc *service.AdminUnitService) *DashboardHandler {
	return &DashboardHandler{svc: svc, adminSvc: adminSvc}
}

// resolveScope merges (1) the user's RBAC allowed-units scope from the auth
// middleware with (2) an explicit admin_unit_id query parameter that the
// dashboard filter UI sends. The intersection keeps the effective scope
// consistent with RBAC while still honouring the county selection dropdown.
func (h *DashboardHandler) resolveScope(c *gin.Context) []uuid.UUID {
	allowed := middleware.GetAllowedUnits(c)
	selectedRaw := c.Query("admin_unit_id")
	if selectedRaw == "" {
		return allowed
	}
	selectedID, err := uuid.Parse(selectedRaw)
	if err != nil || selectedID == uuid.Nil {
		return allowed
	}
	var selectedSet []uuid.UUID
	explicit, err := h.adminSvc.GetDescendants(selectedID)
	if err == nil {
		selectedSet = append(explicit, selectedID)
	} else {
		selectedSet = []uuid.UUID{selectedID}
	}
	if len(allowed) == 0 {
		return selectedSet
	}
	allowedIndex := make(map[uuid.UUID]struct{}, len(allowed))
	for _, id := range allowed {
		allowedIndex[id] = struct{}{}
	}
	intersection := make([]uuid.UUID, 0, len(selectedSet))
	for _, id := range selectedSet {
		if _, ok := allowedIndex[id]; ok {
			intersection = append(intersection, id)
		}
	}
	if len(intersection) == 0 {
		return selectedSet
	}
	return intersection
}

func (h *DashboardHandler) GetKPIs(c *gin.Context) {
	var campaignID *uuid.UUID
	if cid := c.Query("campaign_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err == nil {
			campaignID = &parsed
		}
	}
	scopedUnits := h.resolveScope(c)
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
	scopedUnits := h.resolveScope(c)
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
	scopedUnits := h.resolveScope(c)
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
	scopedUnits := h.resolveScope(c)
	rows, err := h.svc.PerformanceTable(int16(level), campaignID, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows, "level": level})
}
