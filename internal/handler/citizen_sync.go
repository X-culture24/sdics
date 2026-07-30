package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/service"
)

type CitizenSyncHandler struct {
	syncSvc *service.CitizenSyncService
}

func NewCitizenSyncHandler(syncSvc *service.CitizenSyncService) *CitizenSyncHandler {
	return &CitizenSyncHandler{
		syncSvc: syncSvc,
	}
}

// ExportRegisteredCitizens exports all registered citizens for a campaign
// @Summary Export registered citizens
// @Description Export registered citizens to Excel file with timestamp
// @Tags citizens
// @Param campaign_id query string false "Campaign ID"
// @Produce octet-stream
// @Success 200 {file} file
// @Router /citizens/export/registered [get]
func (h *CitizenSyncHandler) ExportRegisteredCitizens(c *gin.Context) {
	campaignIDStr := c.Query("campaign_id")
	campaignID := uuid.Nil
	if campaignIDStr != "" {
		var err error
		campaignID, err = uuid.Parse(campaignIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_CAMPAIGN_ID", "message": "Invalid campaign ID format"},
			})
			return
		}
	}

	filename, err := h.syncSvc.ExportRegisteredCitizens(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "EXPORT_FAILED", "message": err.Error()},
		})
		return
	}

	c.File(filename)
}

// GetSyncEvents returns recent sync events for real-time updates
// @Summary Get sync events
// @Description Get recent citizen registration events for real-time updates
// @Tags citizens
// @Param since query string false "ISO timestamp (default: last 5 minutes)"
// @Param limit query int false "Max events (default: 100)"
// @Produce json
// @Success 200 {array} service.SyncEvent
// @Router /citizens/sync/events [get]
func (h *CitizenSyncHandler) GetSyncEvents(c *gin.Context) {
	sinceStr := c.DefaultQuery("since", time.Now().Add(-5*time.Minute).Format(time.RFC3339))
	since, err := time.Parse(time.RFC3339, sinceStr)
	if err != nil {
		since = time.Now().Add(-5 * time.Minute)
	}

	limitStr := c.DefaultQuery("limit", "100")
	limit := 100
	if l, err := parseInt(limitStr); err == nil && l > 0 && l <= 1000 {
		limit = l
	}

	events, err := h.syncSvc.GetSyncEvents(c.Request.Context(), since, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "SYNC_ERROR", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, events)
}

// ExportDailyProgressReport exports daily registration progress
// @Summary Export daily progress
// @Description Export daily registration progress vs targets
// @Tags reports
// @Param campaign_id path string true "Campaign ID"
// @Produce octet-stream
// @Success 200 {file} file
// @Router /reports/progress/export/{campaign_id} [get]
func (h *CitizenSyncHandler) ExportDailyProgressReport(c *gin.Context) {
	campaignIDStr := c.Param("campaign_id")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_CAMPAIGN_ID", "message": "Invalid campaign ID format"},
		})
		return
	}

	filename, err := h.syncSvc.ExportDailyProgressReport(c.Request.Context(), campaignID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "EXPORT_FAILED", "message": err.Error()},
		})
		return
	}

	c.File(filename)
}

func parseInt(s string) (int, error) {
	if len(s) == 0 {
		return 0, fmt.Errorf("empty string")
	}
	val := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid integer")
		}
		val = val*10 + int(c-'0')
	}
	return val, nil
}
