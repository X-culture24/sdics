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

// ScopeToAdminUnit injects the list of allowed admin unit IDs into context
// (user's unit + all descendants) while honouring an optional admin_unit_id
// query parameter for explicit county filtering.
func ScopeToAdminUnit(adminUnitSvc *service.AdminUnitService) gin.HandlerFunc {
	return func(c *gin.Context) {
		allowedUnits := resolveAllowedUnits(c, adminUnitSvc)
		if len(allowedUnits) > 0 {
			c.Set(CtxAllowedUnits, allowedUnits)
		}
		c.Next()
	}
}

func resolveAllowedUnits(c *gin.Context, adminUnitSvc *service.AdminUnitService) []uuid.UUID {
	roleName := GetRoleName(c)
	selectedID, selectedScope := parseAdminUnitQueryScope(c.Query("admin_unit_id"))

	if selectedID != uuid.Nil {
		if roleName == "System Administrator" || roleName == "National Administrator" {
			return selectedScope
		}

		adminUnitID := GetAdminUnitID(c)
		if adminUnitID == uuid.Nil {
			return selectedScope
		}

		baseScope, err := adminUnitSvc.GetDescendants(adminUnitID)
		if err != nil {
			return selectedScope
		}
		baseScope = append(baseScope, adminUnitID)
		return intersectAllowedUnits(roleName, baseScope, selectedScope)
	}

	adminUnitID := GetAdminUnitID(c)
	if adminUnitID == uuid.Nil {
		return nil
	}
	if roleName == "System Administrator" || roleName == "National Administrator" {
		return nil
	}

	descendants, err := adminUnitSvc.GetDescendants(adminUnitID)
	if err != nil {
		return nil
	}
	return append(descendants, adminUnitID)
}

func parseAdminUnitQueryScope(raw string) (uuid.UUID, []uuid.UUID) {
	if raw == "" {
		return uuid.Nil, nil
	}

	selectedID, err := uuid.Parse(raw)
	if err != nil || selectedID == uuid.Nil {
		return uuid.Nil, nil
	}

	return selectedID, []uuid.UUID{selectedID}
}

func intersectAllowedUnits(roleName string, allowed []uuid.UUID, selected []uuid.UUID) []uuid.UUID {
	if roleName == "System Administrator" || roleName == "National Administrator" {
		return selected
	}
	if len(allowed) == 0 {
		return selected
	}
	if len(selected) == 0 {
		return allowed
	}

	allowedIndex := make(map[uuid.UUID]struct{}, len(allowed))
	for _, id := range allowed {
		allowedIndex[id] = struct{}{}
	}

	intersection := make([]uuid.UUID, 0, len(selected))
	for _, id := range selected {
		if _, ok := allowedIndex[id]; ok {
			intersection = append(intersection, id)
		}
	}
	if len(intersection) == 0 {
		return selected
	}
	return intersection
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
