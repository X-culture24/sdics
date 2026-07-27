package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type CampaignHandler struct {
	svc *service.CampaignService
}

func NewCampaignHandler(svc *service.CampaignService) *CampaignHandler {
	return &CampaignHandler{svc: svc}
}

type createCampaignRequest struct {
	Name            string `json:"name" binding:"required,min=1,max=255"`
	Description     string `json:"description"`
	StartDate       string `json:"start_date" binding:"required"`
	EndDate         string `json:"end_date" binding:"required"`
	InitialNIDCount int    `json:"initial_nid_count" binding:"min=0"`
}

type updateCampaignRequest struct {
	Name            *string `json:"name,omitempty" binding:"omitempty,min=1,max=255"`
	Description     *string `json:"description,omitempty"`
	StartDate       *string `json:"start_date,omitempty"`
	EndDate         *string `json:"end_date,omitempty"`
	InitialNIDCount *int    `json:"initial_nid_count,omitempty" binding:"omitempty,min=0"`
}

type changeStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

func parseDate(s string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, err
	}
	return t, nil
}

func (h *CampaignHandler) Create(c *gin.Context) {
	var req createCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_DATE", "message": "Invalid start_date format, use YYYY-MM-DD"},
		})
		return
	}

	endDate, err := parseDate(req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_DATE", "message": "Invalid end_date format, use YYYY-MM-DD"},
		})
		return
	}

	userID := middleware.GetUserID(c)

	params := &service.CreateCampaignParams{
		Name:            req.Name,
		Description:     req.Description,
		StartDate:       startDate,
		EndDate:         endDate,
		InitialNIDCount: req.InitialNIDCount,
		CreatedBy:       userID,
	}

	campaign, err := h.svc.Create(params)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidDateRange):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_DATE_RANGE", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create campaign"},
			})
		}
		return
	}

	c.JSON(http.StatusCreated, campaign)
}

func (h *CampaignHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	campaign, err := h.svc.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrCampaignNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Campaign not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch campaign"},
		})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) List(c *gin.Context) {
	var status *string
	if s := c.Query("status"); s != "" {
		status = &s
	}

	nameFilter := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := &service.ListCampaignsFilter{
		Status:     status,
		NameFilter: nameFilter,
		Page:       page,
		PageSize:   pageSize,
	}

	campaigns, total, err := h.svc.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list campaigns"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      campaigns,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *CampaignHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	var req updateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	params := &service.UpdateCampaignParams{
		Name:            req.Name,
		Description:     req.Description,
		InitialNIDCount: req.InitialNIDCount,
	}

	if req.StartDate != nil {
		t, err := parseDate(*req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_DATE", "message": "Invalid start_date format, use YYYY-MM-DD"},
			})
			return
		}
		params.StartDate = &t
	}
	if req.EndDate != nil {
		t, err := parseDate(*req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_DATE", "message": "Invalid end_date format, use YYYY-MM-DD"},
			})
			return
		}
		params.EndDate = &t
	}

	campaign, err := h.svc.Update(id, params)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrCampaignNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Campaign not found"},
			})
		case errors.Is(err, service.ErrInvalidDateRange):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_DATE_RANGE", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update campaign"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) ChangeStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	var req changeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	campaign, err := h.svc.ChangeStatus(id, req.Status)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrCampaignNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Campaign not found"},
			})
		case errors.Is(err, service.ErrInvalidStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_STATUS", "message": "Invalid campaign status"},
			})
		case errors.Is(err, service.ErrInvalidStatusTransition):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_TRANSITION", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to change campaign status"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	if err := h.svc.Delete(id); err != nil {
		switch {
		case errors.Is(err, service.ErrCampaignNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Campaign not found"},
			})
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "DELETE_ERROR", "message": err.Error()},
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

func (h *CampaignHandler) GetStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid campaign ID"},
		})
		return
	}

	stats, err := h.svc.GetStats(id)
	if err != nil {
		if errors.Is(err, service.ErrCampaignNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Campaign not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch campaign stats"},
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
