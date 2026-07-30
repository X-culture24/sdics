package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/sdic/nvrcms/docs"
	"github.com/sdic/nvrcms/internal/config"
	"github.com/sdic/nvrcms/internal/handler"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/repository"
	"github.com/sdic/nvrcms/internal/service"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	cfg := config.Load()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db := repository.NewDB(cfg)

	if cfg.UploadDir != "" {
		_ = os.MkdirAll(cfg.UploadDir, 0755)
	}
	_ = os.MkdirAll("./datasets", 0755)

	// WebSocket Manager
	wsManager := service.NewWebSocketManager(1000)
	go wsManager.Run()

	// Services
	authSvc := service.NewAuthService(db, cfg)
	adminUnitSvc := service.NewAdminUnitService(db)
	userSvc := service.NewUserService(db, authSvc, adminUnitSvc)
	campaignSvc := service.NewCampaignService(db)
	citizenSvc := service.NewCitizenService(db, adminUnitSvc, campaignSvc, wsManager)
	dashboardSvc := service.NewDashboardService(db, adminUnitSvc, campaignSvc)
	importSvc := service.NewImportService(db, cfg, adminUnitSvc, citizenSvc)

	// The supplied Excel files are the initial citizen data source. On a new
	// seeded installation, start one background import; existing databases are
	// left untouched and can still use the Import page on demand.
	go func() {
		// Check if there are already pending or running dataset import jobs
		var existingDatasetJobs int64
		if db.Model(&model.ImportJob{}).
			Where("filename LIKE ? AND status IN ?", "datasets/%", []string{service.ImportStatusPending, service.ImportStatusRunning}).
			Count(&existingDatasetJobs).Error != nil || existingDatasetJobs > 0 {
			return
		}

		// Check if dataset files exist
		dsPath := "./datasets"
		matches, err := filepath.Glob(filepath.Join(dsPath, "*.xlsx"))
		if err != nil || len(matches) == 0 {
			log.Println("No dataset files found in ./datasets directory")
			return
		}

		var administrator model.User
		if err := db.Where("is_active = ?", true).Order("created_at ASC").First(&administrator).Error; err != nil {
			log.Printf("Dataset import skipped: no active administrator is available: %v", err)
			return
		}
		if _, err := importSvc.StartFromDatasets(context.Background(), administrator.ID); err != nil {
			log.Printf("Dataset import could not start: %v", err)
			return
		}
		log.Println("Started dataset import for Excel files in ./datasets")
	}()
	auditSvc := service.NewAuditLogService(db)
	reportSvc := service.NewReportService(db)

	// Handlers
	authHandler := handler.NewAuthHandler(authSvc)
	adminUnitHandler := handler.NewAdminUnitHandler(adminUnitSvc)
	userHandler := handler.NewUserHandler(userSvc)
	campaignHandler := handler.NewCampaignHandler(campaignSvc)
	citizenHandler := handler.NewCitizenHandler(citizenSvc)
	dashboardHandler := handler.NewDashboardHandler(dashboardSvc)
	importHandler := handler.NewImportHandler(importSvc, cfg.UploadDir, cfg.MaxUploadMB)
	auditHandler := handler.NewAuditLogHandler(auditSvc)
	reportHandler := handler.NewReportHandler(reportSvc)
	wsHandler := handler.NewWebSocketHandler(wsManager)
	citizenSyncHandler := handler.NewCitizenSyncHandler(service.NewCitizenSyncService(db, reportSvc, cfg.UploadDir))

	r := gin.Default()

	// CORS
	origins := strings.Split(cfg.AllowedOrigins, ",")
	for i, o := range origins {
		origins[i] = strings.TrimSpace(o)
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Global middleware
	r.Use(middleware.RateLimit(cfg.RateLimitUnauth, cfg.RateLimitAuth))

	// Swagger
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/swagger/index.html")
	})

	// Serve React build dist folder (SPA)
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/index.html", "./frontend/dist/index.html")

	// SPA routing - serve index.html for all non-API routes
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			// Let API 404s through
			c.JSON(404, gin.H{"error": "endpoint not found"})
		} else if strings.HasPrefix(c.Request.URL.Path, "/swagger") {
			// Let Swagger through
			c.Next()
		} else {
			// Serve React SPA
			c.File("./frontend/dist/index.html")
		}
	})

	// Health check
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

	// API v1
	v1 := r.Group("/api/v1")

	// Auth routes (public)
	auth := v1.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/logout", middleware.RequireAuth(authSvc), authHandler.Logout)
	}

	// Protected routes with session timeout
	protected := v1.Group("/")
	protected.Use(middleware.RequireAuth(authSvc))
	protected.Use(middleware.SessionTimeout(30))

	// Ping (auth test)
	protected.GET("ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "NVRCMS API is running",
			"user":    c.GetString(middleware.CtxEmail),
			"role":    c.GetString(middleware.CtxRoleName),
		})
	})

	// Profile / Me
	protected.GET("me", userHandler.Me)
	protected.PUT("me/password", userHandler.ChangePassword)

	// Admin Units
	adminUnits := protected.Group("admin-units")
	adminUnits.Use(middleware.ScopeToAdminUnit(adminUnitSvc))
	{
		adminUnits.GET("", middleware.RequirePermission("admin_units:read", adminUnitSvc), adminUnitHandler.List)
		adminUnits.POST("", middleware.RequirePermission("admin_units:write", adminUnitSvc), adminUnitHandler.Create)
		adminUnits.GET(":id", middleware.RequirePermission("admin_units:read", adminUnitSvc), adminUnitHandler.GetByID)
		adminUnits.PUT(":id", middleware.RequirePermission("admin_units:write", adminUnitSvc), adminUnitHandler.Update)
		adminUnits.DELETE(":id", middleware.RequirePermission("admin_units:write", adminUnitSvc), adminUnitHandler.Delete)
		adminUnits.GET(":id/descendants", middleware.RequirePermission("admin_units:read", adminUnitSvc), adminUnitHandler.GetDescendants)
	}

	// Roles
	protected.GET("roles", middleware.RequirePermission("users:read", adminUnitSvc), userHandler.ListRoles)

	// Users
	users := protected.Group("users")
	users.Use(middleware.ScopeToAdminUnit(adminUnitSvc))
	{
		users.GET("", middleware.RequirePermission("users:read", adminUnitSvc), userHandler.List)
		users.POST("", middleware.RequirePermission("users:write", adminUnitSvc), userHandler.Create)
		users.GET(":id", middleware.RequirePermission("users:read", adminUnitSvc), userHandler.GetByID)
		users.PUT(":id", middleware.RequirePermission("users:write", adminUnitSvc), userHandler.Update)
		users.PATCH(":id/active", middleware.RequirePermission("users:write", adminUnitSvc), userHandler.SetActive)
		users.POST(":id/reset-password", middleware.RequirePermission("users:write", adminUnitSvc), userHandler.ResetPassword)
	}

	// Campaigns
	campaigns := protected.Group("campaigns")
	{
		campaigns.GET("", middleware.RequirePermission("campaigns:read", adminUnitSvc), campaignHandler.List)
		campaigns.POST("", middleware.RequirePermission("campaigns:write", adminUnitSvc), campaignHandler.Create)
		campaigns.GET(":id", middleware.RequirePermission("campaigns:read", adminUnitSvc), campaignHandler.GetByID)
		campaigns.PUT(":id", middleware.RequirePermission("campaigns:write", adminUnitSvc), campaignHandler.Update)
		campaigns.PATCH(":id/status", middleware.RequirePermission("campaigns:write", adminUnitSvc), campaignHandler.ChangeStatus)
		campaigns.DELETE(":id", middleware.RequirePermission("campaigns:write", adminUnitSvc), campaignHandler.Delete)
		campaigns.GET(":id/stats", middleware.RequirePermission("campaigns:read", adminUnitSvc), campaignHandler.GetStats)
	}

	// Citizens
	citizens := protected.Group("citizens")
	citizens.Use(middleware.ScopeToAdminUnit(adminUnitSvc))
	{
		citizens.GET("", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenHandler.List)
		citizens.GET("stats", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenHandler.GetStats)
		citizens.POST("", middleware.RequirePermission("citizens:write", adminUnitSvc), citizenHandler.Create)
		citizens.GET(":id", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenHandler.GetByID)
		citizens.GET("nid/:nid", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenHandler.GetByNationalID)
		citizens.PUT(":id", middleware.RequirePermission("citizens:write", adminUnitSvc), citizenHandler.Update)
		citizens.DELETE(":id", middleware.RequirePermission("citizens:write", adminUnitSvc), citizenHandler.Delete)
		citizens.POST(":id/register", middleware.RequirePermission("citizens:register", adminUnitSvc), citizenHandler.Register)
	}

	// Dashboard
	dash := protected.Group("dashboard")
	dash.Use(middleware.ScopeToAdminUnit(adminUnitSvc))
	{
		dash.GET("kpis", middleware.RequirePermission("citizens:read", adminUnitSvc), dashboardHandler.GetKPIs)
		dash.GET("district-performance", middleware.RequirePermission("citizens:read", adminUnitSvc), dashboardHandler.DistrictPerformance)
		dash.GET("registration-trend", middleware.RequirePermission("citizens:read", adminUnitSvc), dashboardHandler.RegistrationTrend)
		dash.GET("performance-table", middleware.RequirePermission("citizens:read", adminUnitSvc), dashboardHandler.PerformanceTable)
	}

	// Imports
	imports := protected.Group("imports")
	{
		imports.POST("from-datasets", middleware.RequirePermission("citizens:write", adminUnitSvc), importHandler.StartFromDatasets)
		imports.POST("upload", middleware.RequirePermission("citizens:write", adminUnitSvc), importHandler.UploadFile)
		imports.GET("", middleware.RequirePermission("citizens:read", adminUnitSvc), importHandler.ListJobs)
		imports.GET(":id", middleware.RequirePermission("citizens:read", adminUnitSvc), importHandler.GetJob)
	}

	// Audit Logs
	auditLogs := protected.Group("audit-logs")
	{
		auditLogs.GET("", middleware.RequirePermission("users:read", adminUnitSvc), auditHandler.List)
		auditLogs.POST("", auditHandler.LogEvent)
		auditLogs.GET(":id", middleware.RequirePermission("users:read", adminUnitSvc), auditHandler.GetByID)
	}

	// Reports
	reports := protected.Group("reports")
	reports.Use(middleware.ScopeToAdminUnit(adminUnitSvc))
	{
		reports.GET("citizens", middleware.RequirePermission("citizens:read", adminUnitSvc), reportHandler.ExportCitizens)
		reports.GET("performance", middleware.RequirePermission("citizens:read", adminUnitSvc), reportHandler.PerformanceReport)
		reports.GET("campaigns/:campaign_id", middleware.RequirePermission("campaigns:read", adminUnitSvc), reportHandler.CampaignReport)
		reports.GET("progress/export/:campaign_id", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenSyncHandler.ExportDailyProgressReport)
	}

	// Citizens Sync & Export
	sync := protected.Group("sync")
	{
		sync.GET("citizens/export", middleware.RequirePermission("citizens:read", adminUnitSvc), citizenSyncHandler.ExportRegisteredCitizens)
		sync.GET("events", citizenSyncHandler.GetSyncEvents)
	}

	// WebSocket (with auth)
	protected.GET("/ws", wsHandler.HandleWebSocket)
	v1.GET("/ws/url", middleware.RequireAuth(authSvc), wsHandler.GetWebSocketURL)

	fmt.Printf("NVRCMS API starting on port %s (env: %s)\n", cfg.Port, cfg.Env)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
