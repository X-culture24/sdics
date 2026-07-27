package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/service"
)

const (
	CtxUserID      = "userID"
	CtxEmail       = "userEmail"
	CtxRoleName    = "userRole"
	CtxAdminUnitID = "adminUnitID"
)

// RequireAuth validates the Bearer JWT on every protected route
func RequireAuth(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "Authorization header required"},
			})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := authSvc.ValidateAccessToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "Invalid or expired token"},
			})
			return
		}

		userID, err := uuid.Parse(claims.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "Invalid token claims"},
			})
			return
		}

		adminUnitID, _ := uuid.Parse(claims.AdminUnitID)

		c.Set(CtxUserID, userID)
		c.Set(CtxEmail, claims.Email)
		c.Set(CtxRoleName, claims.RoleName)
		c.Set(CtxAdminUnitID, adminUnitID)

		c.Next()
	}
}

// GetUserID extracts the authenticated user's UUID from gin context
func GetUserID(c *gin.Context) uuid.UUID {
	id, _ := c.Get(CtxUserID)
	uid, _ := id.(uuid.UUID)
	return uid
}

// GetRoleName extracts the role name from gin context
func GetRoleName(c *gin.Context) string {
	role, _ := c.Get(CtxRoleName)
	r, _ := role.(string)
	return r
}

// GetAdminUnitID extracts the admin unit UUID from gin context
func GetAdminUnitID(c *gin.Context) uuid.UUID {
	id, _ := c.Get(CtxAdminUnitID)
	uid, _ := id.(uuid.UUID)
	return uid
}
