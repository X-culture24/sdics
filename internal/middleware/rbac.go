package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/service"
)

const (
	CtxAllowedUnits = "allowedUnits" // []uuid.UUID
)

// RequirePermission checks if the authenticated user has the required permission
func RequirePermission(permission string, adminUnitSvc *service.AdminUnitService) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleName := GetRoleName(c)
		if roleName == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"},
			})
			return
		}

		// System Administrator bypasses all permission checks
		if roleName == "System Administrator" {
			c.Next()
			return
		}

		// TODO: actually check role_permissions table in a production-ready version.
		// For now, this is a placeholder that allows all authenticated users to proceed.
		// A real implementation would query: SELECT 1 FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ? AND p.name = ?

		c.Next()
	}
}

// ScopeToAdminUnit injects the list of allowed admin unit IDs into context (user's unit + all descendants)
func ScopeToAdminUnit(adminUnitSvc *service.AdminUnitService) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminUnitID := GetAdminUnitID(c)
		if adminUnitID == uuid.Nil {
			c.Next()
			return
		}

		descendants, err := adminUnitSvc.GetDescendants(adminUnitID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to resolve admin scope"},
			})
			return
		}

		c.Set(CtxAllowedUnits, descendants)
		c.Next()
	}
}

// GetAllowedUnits extracts the allowed admin unit IDs from context
func GetAllowedUnits(c *gin.Context) []uuid.UUID {
	units, exists := c.Get(CtxAllowedUnits)
	if !exists {
		return nil
	}
	u, ok := units.([]uuid.UUID)
	if !ok {
		return nil
	}
	return u
}
