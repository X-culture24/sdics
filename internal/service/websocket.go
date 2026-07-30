package service

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/sdic/nvrcms/internal/model"
)

// WebSocketManager manages all active WebSocket connections
type WebSocketManager struct {
	mu         sync.RWMutex
	clients    map[*WebSocketClient]bool
	broadcast  chan interface{}
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	maxClients int
}

// WebSocketClient represents a connected client
type WebSocketClient struct {
	id          uuid.UUID
	conn        *websocket.Conn
	manager     *WebSocketManager
	send        chan interface{}
	adminUnitID uuid.UUID
	campaignID  *uuid.UUID
}

// MessageType defines the type of WebSocket message
type MessageType string

const (
	MsgTypeCitizenRegistered MessageType = "citizen_registered"
	MsgTypeCitizenUpdated    MessageType = "citizen_updated"
	MsgTypeExportReady       MessageType = "export_ready"
	MsgTypeError             MessageType = "error"
)

// WebSocketMessage is the structure of messages sent over WebSocket
type WebSocketMessage struct {
	Type      MessageType            `json:"type"`
	Timestamp string                 `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// NewWebSocketManager creates a new WebSocket manager
func NewWebSocketManager(maxClients int) *WebSocketManager {
	return &WebSocketManager{
		clients:    make(map[*WebSocketClient]bool),
		broadcast:  make(chan interface{}, 256),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
		maxClients: maxClients,
	}
}

// Run starts the WebSocket manager event loop
func (m *WebSocketManager) Run() {
	for {
		select {
		case client := <-m.register:
			m.registerClient(client)
		case client := <-m.unregister:
			m.unregisterClient(client)
		case message := <-m.broadcast:
			m.broadcastToClients(message)
		}
	}
}

// RegisterClient adds a client to the manager
func (m *WebSocketManager) RegisterClient(client *WebSocketClient) {
	m.register <- client
}

// UnregisterClient removes a client from the manager
func (m *WebSocketManager) UnregisterClient(client *WebSocketClient) {
	m.unregister <- client
}

// registerClient adds a client to the manager (internal)
func (m *WebSocketManager) registerClient(client *WebSocketClient) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.clients) >= m.maxClients {
		client.send <- WebSocketMessage{
			Type: MsgTypeError,
			Data: map[string]interface{}{"message": "Server at max capacity"},
		}
		client.conn.Close()
		return
	}

	m.clients[client] = true
	log.Printf("[WS] Client connected: %s (total: %d)", client.id, len(m.clients))
}

// unregisterClient removes a client from the manager (internal)
func (m *WebSocketManager) unregisterClient(client *WebSocketClient) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.clients[client]; ok {
		delete(m.clients, client)
		close(client.send)
		log.Printf("[WS] Client disconnected: %s (total: %d)", client.id, len(m.clients))
	}
}

// broadcastToClients sends a message to all connected clients
func (m *WebSocketManager) broadcastToClients(message interface{}) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for client := range m.clients {
		select {
		case client.send <- message:
		default:
			// Channel full, skip this client
			log.Printf("[WS] Client channel full, dropping message: %s", client.id)
		}
	}
}

// BroadcastCitizenRegistered sends a citizen registration event
func (m *WebSocketManager) BroadcastCitizenRegistered(citizen *model.Citizen, registeredBy uuid.UUID, campaignID uuid.UUID) {
	msg := WebSocketMessage{
		Type:      MsgTypeCitizenRegistered,
		Timestamp: citizen.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Data: map[string]interface{}{
			"citizen_id":          citizen.ID.String(),
			"national_id":         citizen.NationalID,
			"full_name":           citizen.FullName,
			"registration_status": citizen.RegistrationStatus,
			"registration_date":   citizen.RegistrationDate,
			"registered_by":       registeredBy.String(),
			"campaign_id":         campaignID.String(),
			"county_id":           citizen.CountyID.String(),
		},
	}

	m.broadcast <- msg
}

// BroadcastExportReady sends an export ready notification
func (m *WebSocketManager) BroadcastExportReady(filename string, campaignID uuid.UUID, citizensCount int) {
	msg := WebSocketMessage{
		Type:      MsgTypeExportReady,
		Timestamp: "",
		Data: map[string]interface{}{
			"filename":       filename,
			"campaign_id":    campaignID.String(),
			"citizens_count": citizensCount,
		},
	}

	m.broadcast <- msg
}

// NewWebSocketClient creates a new WebSocket client
func NewWebSocketClient(id uuid.UUID, conn *websocket.Conn, manager *WebSocketManager, adminUnitID uuid.UUID) *WebSocketClient {
	return &WebSocketClient{
		id:          id,
		conn:        conn,
		manager:     manager,
		send:        make(chan interface{}, 64),
		adminUnitID: adminUnitID,
	}
}

// ReadPump reads messages from the client
func (c *WebSocketClient) ReadPump() {
	defer func() {
		c.manager.UnregisterClient(c)
		c.conn.Close()
	}()

	for {
		var msg map[string]interface{}
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Error: %v", err)
			}
			break
		}
		// Handle incoming messages if needed
		// For now, we're mainly using WebSocket for broadcasting
	}
}

// WritePump sends messages to the client
func (c *WebSocketClient) WritePump() {
	defer func() {
		c.conn.Close()
	}()

	for message := range c.send {
		w, err := c.conn.NextWriter(websocket.TextMessage)
		if err != nil {
			return
		}

		data, err := json.Marshal(message)
		if err != nil {
			return
		}

		w.Write(data)
		if err := w.Close(); err != nil {
			return
		}
	}
}
