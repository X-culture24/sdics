package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/sdic/nvrcms/internal/middleware"
	"github.com/sdic/nvrcms/internal/service"
)

type WebSocketHandler struct {
	wsManager *service.WebSocketManager
}

func NewWebSocketHandler(wsManager *service.WebSocketManager) *WebSocketHandler {
	return &WebSocketHandler{
		wsManager: wsManager,
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate the origin properly
		return true
	},
}

// HandleWebSocket upgrades HTTP connection to WebSocket
// @Summary WebSocket connection
// @Description Establish WebSocket connection for real-time updates
// @Tags websocket
// @Success 101
// @Router /ws [get]
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "UPGRADE_FAILED", "message": err.Error()},
		})
		return
	}

	userID := middleware.GetUserID(c)
	adminUnitID := middleware.GetAdminUnitID(c)

	client := service.NewWebSocketClient(userID, conn, h.wsManager, adminUnitID)
	h.wsManager.RegisterClient(client)

	// Start read and write pumps
	go client.WritePump()
	go client.ReadPump()
}

// GetWebSocketURL returns the WebSocket connection URL (for client reference)
// @Summary Get WebSocket URL
// @Description Get the WebSocket connection URL for the client
// @Tags websocket
// @Produce json
// @Success 200 {object} map[string]string
// @Router /ws/url [get]
func (h *WebSocketHandler) GetWebSocketURL(c *gin.Context) {
	scheme := "ws"
	if c.Request.TLS != nil {
		scheme = "wss"
	}

	url := scheme + "://" + c.Request.Host + "/api/v1/ws"
	c.JSON(http.StatusOK, gin.H{
		"url": url,
	})
}
