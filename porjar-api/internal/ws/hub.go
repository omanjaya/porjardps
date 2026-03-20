package ws

import (
	"log/slog"
	"sync"
)

const (
	maxConnsPerIP         = 20
	maxSubscriptionsPerClient = 50
)

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	mu         sync.RWMutex
	maxConns   int
	connPerIP  map[string]int // tracks connection count per IP
	clientSubs map[*Client]int // tracks subscription count per client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		broadcast:  make(chan *Message, 4096),
		connPerIP:  make(map[string]int),
		clientSubs: make(map[*Client]int),
	}
}

// NewHubWithLimit creates a Hub that enforces a maximum connection limit.
func NewHubWithLimit(maxConns int) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		broadcast:  make(chan *Message, 4096),
		maxConns:   maxConns,
		connPerIP:  make(map[string]int),
		clientSubs: make(map[*Client]int),
	}
}

// Stop closes all active WebSocket connections and drains the hub.
// Call this before app.Shutdown() so clients receive a proper close frame.
func (h *Hub) Stop() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.clients {
		client.closeSend()
		delete(h.clients, client)
	}
	h.rooms = make(map[string]map[*Client]bool)
	h.connPerIP = make(map[string]int)
	h.clientSubs = make(map[*Client]int)
}

func (h *Hub) Run() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("ws hub recovered from panic", "error", r)
			go h.Run() // restart the loop
		}
	}()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.maxConns > 0 && len(h.clients) >= h.maxConns {
				h.mu.Unlock()
				client.conn.Close()
				slog.Warn("ws connection limit reached, rejecting client", "limit", h.maxConns)
				continue
			}
			// Per-IP connection limit
			if client.IP != "" && h.connPerIP[client.IP] >= maxConnsPerIP {
				h.mu.Unlock()
				client.conn.Close()
				slog.Warn("ws per-IP connection limit reached, rejecting client", "ip", client.IP, "limit", maxConnsPerIP)
				continue
			}
			h.clients[client] = true
			if client.IP != "" {
				h.connPerIP[client.IP]++
			}
			h.mu.Unlock()
			slog.Debug("ws client connected", "total", h.ConnectionCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.closeSend()
				// Decrement per-IP counter
				if client.IP != "" {
					h.connPerIP[client.IP]--
					if h.connPerIP[client.IP] <= 0 {
						delete(h.connPerIP, client.IP)
					}
				}
				// Clean up subscription tracking
				delete(h.clientSubs, client)
				// Remove from all rooms
				for room, clients := range h.rooms {
					delete(clients, client)
					if len(clients) == 0 {
						delete(h.rooms, room)
					}
				}
			}
			h.mu.Unlock()
			slog.Debug("ws client disconnected", "total", h.ConnectionCount())

		case msg := <-h.broadcast:
			h.mu.RLock()
			if msg.Room != "" {
				// Broadcast to specific room
				if clients, ok := h.rooms[msg.Room]; ok {
					for client := range clients {
						select {
						case client.send <- msg.Data:
						default:
							go func(c *Client) {
								h.unregister <- c
							}(client)
						}
					}
				}
			} else {
				// Broadcast to all clients
				for client := range h.clients {
					select {
					case client.send <- msg.Data:
					default:
						go func(c *Client) {
							h.unregister <- c
						}(client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Subscribe adds a client to a room
func (h *Hub) Subscribe(client *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Per-client subscription limit
	if h.clientSubs[client] >= maxSubscriptionsPerClient {
		slog.Warn("ws per-client subscription limit reached, ignoring", "limit", maxSubscriptionsPerClient)
		return
	}

	if _, ok := h.rooms[room]; !ok {
		h.rooms[room] = make(map[*Client]bool)
	}
	// Only increment if not already subscribed to this room
	if !h.rooms[room][client] {
		h.rooms[room][client] = true
		h.clientSubs[client]++
	}
}

// Unsubscribe removes a client from a room
func (h *Hub) Unsubscribe(client *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.rooms[room]; ok {
		if clients[client] {
			delete(clients, client)
			h.clientSubs[client]--
		}
		if len(clients) == 0 {
			delete(h.rooms, room)
		}
	}
}

// BroadcastToRoom sends a message to all clients in a room
func (h *Hub) BroadcastToRoom(room string, data []byte) {
	h.broadcast <- &Message{Room: room, Data: data}
}

// BroadcastToAll sends a message to all connected clients
func (h *Hub) BroadcastToAll(data []byte) {
	h.broadcast <- &Message{Data: data}
}

// ConnectionCount returns the total number of connected clients
func (h *Hub) ConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// RoomConnectionCount returns the number of clients subscribed to a specific room
func (h *Hub) RoomConnectionCount(room string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.rooms[room]; ok {
		return len(clients)
	}
	return 0
}

// Register exposes the register channel
func (h *Hub) Register() chan<- *Client {
	return h.register
}

// Unregister exposes the unregister channel
func (h *Hub) Unregister() chan<- *Client {
	return h.unregister
}
