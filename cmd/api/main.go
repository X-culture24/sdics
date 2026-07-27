package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sdic/nvrcms/internal/config"
	"github.com/sdic/nvrcms/internal/handler"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/repository"
	"github.com/sdic/nvrcms/internal/service"
)

func main() {
	cfg := config.Load()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db := repository.NewDB(cfg)

	// Services
	authSvc := service.NewAuthService(db, cfg)

	// Handlers
	authHandler := handler.NewAuthHandler(authSvc)

	r := gin.Default()

	// ── Global middleware ─────────────────────────────────────
	r.Use(middleware.RateLimit(cfg.RateLimitUnauth, cfg.RateLimitAuth))

	// ── Health check ──────────────────────────────────────────
	r.GET("/health", func(c *gin.Context) {
		sqlDB, _ := db.DB()
		dbStatus := "connected"
		if err := sqlDB.Ping(); err != nil {
			dbStatus = "disconnected"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"db":      dbStatus,
			"env":     cfg.Env,
			"time":    time.Now().UTC().Format(time.RFC3339),
			"version": "0.1.0",
		})
	})

	// ── API v1 ────────────────────────────────────────────────
	v1 := r.Group("/api/v1")

	// Auth routes (public)
	auth := v1.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/logout", middleware.RequireAuth(authSvc), authHandler.Logout)
	}

	// Protected ping (for testing auth middleware)
	v1.GET("/ping", middleware.RequireAuth(authSvc), middleware.SessionTimeout(30), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "NVRCMS API is running",
			"user":    c.GetString(middleware.CtxEmail),
			"role":    c.GetString(middleware.CtxRoleName),
		})
	})

	fmt.Printf("NVRCMS API starting on port %s (env: %s)\n", cfg.Port, cfg.Env)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
