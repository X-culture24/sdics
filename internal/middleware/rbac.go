package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/service"
	"gorm.io/gorm"
)

const (
	CtxAllowedUnits = "allowedUnits" // []uuid.UUID
)

type permissionCacheEntry struct {
	permissions map[string]bool
	expiresAt   time.Time
}

type rbacCache struct {
	mu      sync.RWMutex
	entries map[string]permissionCacheEntry
}

var cache = &rbacCache{
	entries: make(map[string]permissionCacheEntry),
}

const cacheTTL = 5 * time.Minute

func init() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		for range ticker.C {
			cache.mu.Lock()
			now := time.Now()
			for k, v := range cache.entries {
				if v.expiresAt.Before(now) {
					delete(cache.entries, k)
				}
			}
			cache.mu.Unlock()
		}
	}()
}

func getCachedPermissions(db *gorm.DB, roleID uuid.UUID) (map[string]bool, error) {
	key := roleID.String()

	cache.mu.RLock()
	entry, exists := cache.entries[key]
	cache.mu.RUnlock()

	if exists && entry.expiresAt.After(time.Now()) {
		return entry.permissions, nil
	}

	var role model.Role
	if err := db.Preload("Permissions").First(&role, "id = ?", roleID).Error; err != nil {
		return nil, err
	}

	perms := make(map[string]bool, len(role.Permissions))
	for _, p := range role.Permissions {
		perms[p.Name] = true
	}

	cache.mu.Lock()
	cache.entries[key] = permissionCacheEntry{
		permissions: perms,
		expiresAt:   time.Now().Add(cacheTTL),
	}
	cache.mu.Unlock()

	return perms, nil
}

func InvalidatePermissionCache(roleID uuid.UUID) {
	cache.mu.Lock()
	delete(cache.entries, roleID.String())
	cache.mu.Unlock()
}

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

		if roleName == "System Administrator" {
			c.Next()
			return
		}

		userIDStr, _ := c.Get(CtxUserID)
		userID, ok := userIDStr.(uuid.UUID)
		if !ok || userID == uuid.Nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"},
			})
			return
		}

		var user model.User
		if err := adminUnitSvc.DB().First(&user, "id = ?", userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"},
			})
			return
		}

		perms, err := getCachedPermissions(adminUnitSvc.DB(), user.RoleID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"},
			})
			return
		}

		if !perms[permission] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "PERMISSION_DENIED",
					"message": "You do not have the required permission: " + permission,
				},
			})
			return
		}

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

		roleName := GetRoleName(c)
		if roleName == "System Administrator" || roleName == "National Administrator" {
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
