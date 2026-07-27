package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// sessionStore tracks last activity time per user ID (in-memory)
type sessionStore struct {
	mu      sync.RWMutex
	entries map[string]time.Time
}

var store = &sessionStore{
	entries: make(map[string]time.Time),
}

// SessionTimeout enforces a 30-minute idle timeout.
// Must be used AFTER RequireAuth so CtxUserID is already set.
func SessionTimeout(timeoutMinutes int) gin.HandlerFunc {
	// Background goroutine to clean up expired entries every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			store.mu.Lock()
			cutoff := time.Now().Add(-time.Duration(timeoutMinutes) * time.Minute)
			for k, v := range store.entries {
				if v.Before(cutoff) {
					delete(store.entries, k)
				}
			}
			store.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		userID := c.GetString(CtxUserID)
		if userID == "" {
			// Not authenticated — skip
			c.Next()
			return
		}

		now := time.Now()
		timeout := time.Duration(timeoutMinutes) * time.Minute

		store.mu.RLock()
		lastActivity, seen := store.entries[userID]
		store.mu.RUnlock()

		if seen && now.Sub(lastActivity) > timeout {
			// Remove the entry so a fresh login resets it
			store.mu.Lock()
			delete(store.entries, userID)
			store.mu.Unlock()

			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "SESSION_EXPIRED",
					"message": "Session expired due to inactivity. Please log in again.",
				},
			})
			return
		}

		// Refresh activity timestamp
		store.mu.Lock()
		store.entries[userID] = now
		store.mu.Unlock()

		c.Next()
	}
}

// ClearSession removes a user's idle-timeout record (call on logout)
func ClearSession(userID string) {
	store.mu.Lock()
	delete(store.entries, userID)
	store.mu.Unlock()
}
