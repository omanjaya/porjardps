package ws

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/fasthttp/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	sendOnce sync.Once
	IP       string // remote IP for per-IP connection limiting
}

func NewClient(hub *Hub, conn *websocket.Conn, ip string) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 512),
		IP:   ip,
	}
}

// closeSend safely closes the send channel exactly once.
func (c *Client) closeSend() {
	c.sendOnce.Do(func() {
		close(c.send)
	})
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Warn("ws unexpected close", "error", err)
			}
			break
		}

		var msg SubscribeMessage
		if err := json.Unmarshal(message, &msg); err == nil {
			switch msg.Action {
			case "subscribe":
				c.hub.Subscribe(c, msg.Channel)
				slog.Debug("ws client subscribed", "channel", msg.Channel)
			case "unsubscribe":
				c.hub.Unsubscribe(c, msg.Channel)
				slog.Debug("ws client unsubscribed", "channel", msg.Channel)
			}
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		// Recover from panic caused by writing to a connection that was already
		// closed by ReadPump (fasthttp hijackConn becomes nil after close).
		if r := recover(); r != nil {
			slog.Debug("ws WritePump recovered from panic", "error", r)
		}
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			// Check ok BEFORE SetWriteDeadline — when the hub closes c.send
			// the underlying connection may already be closed by ReadPump,
			// making SetWriteDeadline panic with a nil hijackConn.
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
