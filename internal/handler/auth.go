package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=1"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Login godoc
// @Summary      Authenticate user
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body loginRequest true "Credentials"
// @Success      200  {object} service.LoginResponse
// @Failure      400  {object} map[string]any
// @Failure      401  {object} map[string]any
// @Router       /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	resp, err := h.authSvc.Login(req.Email, req.Password, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "Invalid email or password"},
			})
		case errors.Is(err, service.ErrAccountDisabled):
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Account is disabled"},
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "An error occurred"},
			})
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Refresh godoc
// @Summary      Refresh access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body refreshRequest true "Refresh token"
// @Success      200  {object} service.LoginResponse
// @Failure      401  {object} map[string]any
// @Router       /api/v1/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()},
		})
		return
	}

	resp, err := h.authSvc.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired refresh token"},
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Logout godoc
// @Summary      Logout current user
// @Tags         auth
// @Security     BearerAuth
// @Success      200  {object} map[string]any
// @Router       /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := middleware.GetUserID(c)
	h.authSvc.Logout(userID, c.ClientIP(), c.GetHeader("User-Agent"))
	middleware.ClearSession(userID.String())
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
