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

type CitizenHandler struct {
	svc *service.CitizenService
}

func NewCitizenHandler(svc *service.CitizenService) *CitizenHandler {
	return &CitizenHandler{svc: svc}
}

type createCitizenRequest struct {
	NationalID     string     `json:"national_id" binding:"required,min=1,max=50"`
	FullName       string     `json:"full_name" binding:"required,min=1,max=255"`
	Gender         string     `json:"gender" binding:"required,oneof=Male Female"`
	PhoneNumber    string     `json:"phone_number"`
	CountyID       uuid.UUID  `json:"county_id" binding:"required"`
	DistrictID     uuid.UUID  `json:"district_id" binding:"required"`
	DivisionID     *uuid.UUID `json:"division_id,omitempty"`
	LocationID     *uuid.UUID `json:"location_id,omitempty"`
	SubLocationID  *uuid.UUID `json:"sub_location_id,omitempty"`
	VillageID      *uuid.UUID `json:"village_id,omitempty"`
	PollingStation string     `json:"polling_station"`
}

type updateCitizenRequest struct {
	FullName           *string    `json:"full_name,omitempty" binding:"omitempty,min=1,max=255"`
	Gender             *string    `json:"gender,omitempty" binding:"omitempty,oneof=Male Female"`
	PhoneNumber        *string    `json:"phone_number,omitempty"`
	CountyID           *uuid.UUID `json:"county_id,omitempty"`
	DistrictID         *uuid.UUID `json:"district_id,omitempty"`
	DivisionID         *uuid.UUID `json:"division_id,omitempty"`
	LocationID         *uuid.UUID `json:"location_id,omitempty"`
	SubLocationID      *uuid.UUID `json:"sub_location_id,omitempty"`
	VillageID          *uuid.UUID `json:"village_id,omitempty"`
	PollingStation     *string    `json:"polling_station,omitempty"`
	RegistrationStatus *string    `json:"registration_status,omitempty" binding:"omitempty,oneof=Unregistered Registered Pending Ineligible"`
}

type registerCitizenRequest struct {
	CampaignID uuid.UUID `json:"campaign_id" binding:"required"`
	Source     string    `json:"source" binding:"omitempty,oneof=Manual Bulk Import Mobile"`
}

func (h *CitizenHandler) Create(c *gin.Context) {
	var req createCitizenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	userID := middleware.GetUserID(c)

	params := &service.CreateCitizenParams{
		NationalID:     req.NationalID,
		FullName:       req.FullName,
		Gender:         req.Gender,
		PhoneNumber:    req.PhoneNumber,
		CountyID:       req.CountyID,
		DistrictID:     req.DistrictID,
		DivisionID:     req.DivisionID,
		LocationID:     req.LocationID,
		SubLocationID:  req.SubLocationID,
		VillageID:      req.VillageID,
		PollingStation: req.PollingStation,
		CreatedBy:      userID,
	}

	citizen, err := h.svc.Create(params)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidGender):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_GENDER", "message": err.Error()},
			})
		case errors.Is(err, service.ErrNationalIDExists):
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{"code": "NATIONAL_ID_EXISTS", "message": err.Error()},
			})
		case errors.Is(err, service.ErrCountyRequired),
			errors.Is(err, service.ErrDistrictRequired),
			errors.Is(err, service.ErrAdminUnitNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ADMIN_UNIT_ERROR", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create citizen"},
			})
		}
		return
	}

	c.JSON(http.StatusCreated, citizen)
}

func (h *CitizenHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid citizen ID"},
		})
		return
	}

	citizen, err := h.svc.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrCitizenNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Citizen not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch citizen"},
		})
		return
	}

	c.JSON(http.StatusOK, citizen)
}

func (h *CitizenHandler) GetByNationalID(c *gin.Context) {
	nid := c.Param("nid")
	if nid == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "National ID is required"},
		})
		return
	}

	citizen, err := h.svc.GetByNationalID(nid)
	if err != nil {
		if errors.Is(err, service.ErrCitizenNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Citizen not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch citizen"},
		})
		return
	}

	c.JSON(http.StatusOK, citizen)
}

func (h *CitizenHandler) List(c *gin.Context) {
	var countyID *uuid.UUID
	if cid := c.Query("county_id"); cid != "" {
		parsed, err := uuid.Parse(cid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid county_id parameter"},
			})
			return
		}
		countyID = &parsed
	}

	var districtID *uuid.UUID
	if did := c.Query("district_id"); did != "" {
		parsed, err := uuid.Parse(did)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid district_id parameter"},
			})
			return
		}
		districtID = &parsed
	}

	var regStatus *string
	if rs := c.Query("registration_status"); rs != "" {
		regStatus = &rs
	}

	var gender *string
	if g := c.Query("gender"); g != "" {
		gender = &g
	}

	nameFilter := c.Query("q")
	nidFilter := c.Query("national_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := &service.ListCitizensFilter{
		CountyID:           countyID,
		DistrictID:         districtID,
		RegistrationStatus: regStatus,
		Gender:             gender,
		NameFilter:         nameFilter,
		NationalIDFilter:   nidFilter,
		Page:               page,
		PageSize:           pageSize,
	}

	scopedUnits := middleware.GetAllowedUnits(c)

	citizens, total, err := h.svc.List(filter, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list citizens"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      citizens,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *CitizenHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid citizen ID"},
		})
		return
	}

	var req updateCitizenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	params := &service.UpdateCitizenParams{
		FullName:           req.FullName,
		Gender:             req.Gender,
		PhoneNumber:        req.PhoneNumber,
		CountyID:           req.CountyID,
		DistrictID:         req.DistrictID,
		DivisionID:         req.DivisionID,
		LocationID:         req.LocationID,
		SubLocationID:      req.SubLocationID,
		VillageID:          req.VillageID,
		PollingStation:     req.PollingStation,
		RegistrationStatus: req.RegistrationStatus,
	}

	userID := middleware.GetUserID(c)

	citizen, err := h.svc.Update(id, params, userID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrCitizenNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Citizen not found"},
			})
		case errors.Is(err, service.ErrInvalidGender):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_GENDER", "message": err.Error()},
			})
		case errors.Is(err, service.ErrInvalidRegStatus):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_REG_STATUS", "message": err.Error()},
			})
		case errors.Is(err, service.ErrAdminUnitNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ADMIN_UNIT_NOT_FOUND", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update citizen"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, citizen)
}

func (h *CitizenHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid citizen ID"},
		})
		return
	}

	if err := h.svc.Delete(id); err != nil {
		if errors.Is(err, service.ErrCitizenNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Citizen not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to delete citizen"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Citizen deleted successfully"})
}

func (h *CitizenHandler) Register(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid citizen ID"},
		})
		return
	}

	var req registerCitizenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	source := req.Source
	if source == "" {
		source = "Manual"
	}

	userID := middleware.GetUserID(c)
	adminUnitID := middleware.GetAdminUnitID(c)

	record, err := h.svc.RegisterCitizen(id, req.CampaignID, userID, adminUnitID, source)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrCitizenNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "Citizen not found"},
			})
		case errors.Is(err, service.ErrCampaignNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "CAMPAIGN_NOT_FOUND", "message": "Campaign not found"},
			})
		case errors.Is(err, service.ErrCampaignNotActive):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "CAMPAIGN_NOT_ACTIVE", "message": err.Error()},
			})
		case errors.Is(err, service.ErrAlreadyRegistered):
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{"code": "ALREADY_REGISTERED", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to register citizen"},
			})
		}
		return
	}

	c.JSON(http.StatusCreated, record)
}

func (h *CitizenHandler) GetStats(c *gin.Context) {
	scopedUnits := middleware.GetAllowedUnits(c)
	stats, err := h.svc.GetStats(scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch citizen stats"},
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
