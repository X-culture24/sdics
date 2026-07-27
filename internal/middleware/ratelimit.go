package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket implements a simple token bucket for rate limiting
type bucket struct {
	tokens   int
	capacity int
	lastFill time.Time
	mu       sync.Mutex
}

type rateLimiter struct {
	mu      sync.RWMutex
	buckets map[string]*bucket
}

var limiter = &rateLimiter{
	buckets: make(map[string]*bucket),
}

// RateLimit enforces request rate limits.
// Unauthenticated: rateUnauth requests per minute per IP.
// Authenticated: rateAuth requests per minute per user.
func RateLimit(rateUnauth, rateAuth int) gin.HandlerFunc {
	// Background cleanup: remove stale buckets every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			limiter.mu.Lock()
			cutoff := time.Now().Add(-10 * time.Minute)
			for k, b := range limiter.buckets {
				b.mu.Lock()
				if b.lastFill.Before(cutoff) {
					delete(limiter.buckets, k)
				}
				b.mu.Unlock()
			}
			limiter.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		userID := c.GetString(CtxUserID)
		var key string
		var rate int

		if userID != "" {
			// Authenticated: rate limit by user
			key = "user:" + userID
			rate = rateAuth
		} else {
			// Unauthenticated: rate limit by IP
			key = "ip:" + c.ClientIP()
			rate = rateUnauth
		}

		limiter.mu.RLock()
		b, exists := limiter.buckets[key]
		limiter.mu.RUnlock()

		if !exists {
			limiter.mu.Lock()
			if b, exists = limiter.buckets[key]; !exists {
				b = &bucket{
					tokens:   rate,
					capacity: rate,
					lastFill: time.Now(),
				}
				limiter.buckets[key] = b
			}
			limiter.mu.Unlock()
		}

		b.mu.Lock()
		defer b.mu.Unlock()

		// Refill tokens based on time elapsed (1 token per second up to capacity)
		now := time.Now()
		elapsed := now.Sub(b.lastFill).Seconds()
		tokensToAdd := int(elapsed * float64(rate) / 60.0)
		if tokensToAdd > 0 {
			b.tokens += tokensToAdd
			if b.tokens > b.capacity {
				b.tokens = b.capacity
			}
			b.lastFill = now
		}

		if b.tokens <= 0 {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "Rate limit exceeded. Try again later.",
				},
			})
			return
		}

		b.tokens--
		c.Next()
	}
}
