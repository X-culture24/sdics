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

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

type createUserRequest struct {
	FullName    string    `json:"full_name" binding:"required,min=1,max=255"`
	Email       string    `json:"email" binding:"required,email"`
	Password    string    `json:"password" binding:"required,min=8"`
	RoleID      uuid.UUID `json:"role_id" binding:"required"`
	AdminUnitID uuid.UUID `json:"admin_unit_id" binding:"required"`
}

type updateUserRequest struct {
	FullName    *string    `json:"full_name,omitempty" binding:"omitempty,min=1,max=255"`
	Email       *string    `json:"email,omitempty" binding:"omitempty,email"`
	RoleID      *uuid.UUID `json:"role_id,omitempty"`
	AdminUnitID *uuid.UUID `json:"admin_unit_id,omitempty"`
}

type setActiveRequest struct {
	IsActive bool `json:"is_active" binding:"required"`
}

type resetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required,min=1"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *UserHandler) Create(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	params := &service.CreateUserParams{
		FullName:    req.FullName,
		Email:       req.Email,
		Password:    req.Password,
		RoleID:      req.RoleID,
		AdminUnitID: req.AdminUnitID,
	}

	user, err := h.svc.Create(params)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrPasswordTooShort):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "PASSWORD_TOO_SHORT", "message": err.Error()},
			})
		case errors.Is(err, service.ErrEmailExists):
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{"code": "EMAIL_EXISTS", "message": err.Error()},
			})
		case errors.Is(err, service.ErrRoleNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ROLE_NOT_FOUND", "message": err.Error()},
			})
		case errors.Is(err, service.ErrAdminUnitRefNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ADMIN_UNIT_NOT_FOUND", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create user"},
			})
		}
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid user ID"},
		})
		return
	}

	user, err := h.svc.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch user"},
		})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.svc.GetByID(userID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch profile"},
		})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) List(c *gin.Context) {
	var roleID *uuid.UUID
	if r := c.Query("role_id"); r != "" {
		parsed, err := uuid.Parse(r)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid role_id parameter"},
			})
			return
		}
		roleID = &parsed
	}

	var adminUnitID *uuid.UUID
	if a := c.Query("admin_unit_id"); a != "" {
		parsed, err := uuid.Parse(a)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid admin_unit_id parameter"},
			})
			return
		}
		adminUnitID = &parsed
	}

	var isActive *bool
	if a := c.Query("is_active"); a != "" {
		parsed, err := strconv.ParseBool(a)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid is_active parameter"},
			})
			return
		}
		isActive = &parsed
	}

	nameFilter := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := &service.ListUsersFilter{
		RoleID:      roleID,
		AdminUnitID: adminUnitID,
		IsActive:    isActive,
		NameFilter:  nameFilter,
		Page:        page,
		PageSize:    pageSize,
	}

	scopedUnits := middleware.GetAllowedUnits(c)

	users, total, err := h.svc.List(filter, scopedUnits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list users"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid user ID"},
		})
		return
	}

	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	params := &service.UpdateUserParams{
		FullName:    req.FullName,
		Email:       req.Email,
		RoleID:      req.RoleID,
		AdminUnitID: req.AdminUnitID,
	}

	user, err := h.svc.Update(id, params)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
		case errors.Is(err, service.ErrEmailExists):
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{"code": "EMAIL_EXISTS", "message": err.Error()},
			})
		case errors.Is(err, service.ErrRoleNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ROLE_NOT_FOUND", "message": err.Error()},
			})
		case errors.Is(err, service.ErrAdminUnitRefNotFound):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "ADMIN_UNIT_NOT_FOUND", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update user"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) SetActive(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid user ID"},
		})
		return
	}

	var req setActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	actorID := middleware.GetUserID(c)

	user, err := h.svc.SetActive(id, req.IsActive, actorID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
		case errors.Is(err, service.ErrCannotDeactivateSelf):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "CANNOT_DEACTIVATE_SELF", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update user status"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid user ID"},
		})
		return
	}

	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	if err := h.svc.ResetPassword(id, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
		case errors.Is(err, service.ErrPasswordTooShort):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "PASSWORD_TOO_SHORT", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to reset password"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	if err := h.svc.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
			})
		case errors.Is(err, service.ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "INVALID_OLD_PASSWORD", "message": "Current password is incorrect"},
			})
		case errors.Is(err, service.ErrPasswordTooShort):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "PASSWORD_TOO_SHORT", "message": err.Error()},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to change password"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func (h *UserHandler) ListRoles(c *gin.Context) {
	nameFilter := c.Query("q")
	filter := &service.RoleListFilter{NameFilter: nameFilter}

	roles, err := h.svc.ListRoles(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list roles"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": roles})
}
