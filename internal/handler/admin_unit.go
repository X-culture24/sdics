package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/service"
)

type AdminUnitHandler struct {
	svc *service.AdminUnitService
}

func NewAdminUnitHandler(svc *service.AdminUnitService) *AdminUnitHandler {
	return &AdminUnitHandler{svc: svc}
}

type createAdminUnitRequest struct {
	Name     string     `json:"name" binding:"required,min=1,max=255"`
	Level    int16      `json:"level" binding:"required,min=1,max=8"`
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
	Code     string     `json:"code" binding:"omitempty,max=50"`
}

type updateAdminUnitRequest struct {
	Name *string `json:"name,omitempty" binding:"omitempty,min=1,max=255"`
	Code *string `json:"code,omitempty" binding:"omitempty,max=50"`
}

func (h *AdminUnitHandler) Create(c *gin.Context) {
	var req createAdminUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	unit := &model.AdminUnit{
		Name:     req.Name,
		Level:    req.Level,
		ParentID: req.ParentID,
		Code:     req.Code,
	}

	if err := h.svc.Create(unit); err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidLevel):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_LEVEL", "message": err.Error()},
			})
		case errors.Is(err, service.ErrInvalidParent):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_PARENT", "message": err.Error()},
			})
		case errors.Is(err, service.ErrParentLevelMismatch):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "PARENT_LEVEL_MISMATCH", "message": err.Error()},
			})
		case errors.Is(err, service.ErrNationalUnitNeedsNoParent):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "NATIONAL_PARENT_ERROR", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create administrative unit"},
			})
		}
		return
	}

	c.JSON(http.StatusCreated, unit)
}

func (h *AdminUnitHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid unit ID"},
		})
		return
	}

	preloadParent := c.Query("parent") == "true"
	preloadChildren := c.Query("children") == "true"

	unit, err := h.svc.GetByID(id, preloadParent, preloadChildren)
	if err != nil {
		if errors.Is(err, service.ErrAdminUnitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Administrative unit not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch administrative unit"},
		})
		return
	}

	c.JSON(http.StatusOK, unit)
}

func (h *AdminUnitHandler) List(c *gin.Context) {
	var level *int16
	if l := c.Query("level"); l != "" {
		parsed, err := strconv.ParseInt(l, 10, 16)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid level parameter"},
			})
			return
		}
		p := int16(parsed)
		level = &p
	}

	var parentID *uuid.UUID
	if p := c.Query("parent_id"); p != "" {
		parsed, err := uuid.Parse(p)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid parent_id parameter"},
			})
			return
		}
		parentID = &parsed
	}

	nameFilter := c.Query("name")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	units, total, err := h.svc.List(level, parentID, nameFilter, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list administrative units"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      units,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminUnitHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid unit ID"},
		})
		return
	}

	var req updateAdminUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Code != nil {
		updates["code"] = *req.Code
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "No valid fields to update"},
		})
		return
	}

	if err := h.svc.Update(id, updates); err != nil {
		if errors.Is(err, service.ErrAdminUnitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Administrative unit not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update administrative unit"},
		})
		return
	}

	unit, _ := h.svc.GetByID(id, false, false)
	c.JSON(http.StatusOK, unit)
}

func (h *AdminUnitHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid unit ID"},
		})
		return
	}

	if err := h.svc.Delete(id); err != nil {
		switch {
		case errors.Is(err, service.ErrAdminUnitNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Administrative unit not found"},
			})
		case errors.Is(err, service.ErrHasDependents):
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{"code": "HAS_DEPENDENTS", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to delete administrative unit"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Administrative unit deleted successfully"})
}

func (h *AdminUnitHandler) GetDescendants(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid unit ID"},
		})
		return
	}

	ids, err := h.svc.GetDescendants(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch descendants"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"descendant_ids": ids})
}
