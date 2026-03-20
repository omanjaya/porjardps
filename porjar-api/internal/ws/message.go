package ws

import "encoding/json"

// Message is an internal message sent through the hub
type Message struct {
	Room string
	Data []byte
}

// SubscribeMessage is sent by the client to subscribe/unsubscribe to channels
type SubscribeMessage struct {
	Action  string `json:"action"`  // "subscribe" or "unsubscribe"
	Channel string `json:"channel"` // e.g. "tournament:uuid", "match:uuid"
}

// BroadcastMessage is the format sent to clients
type BroadcastMessage struct {
	Type string      `json:"type"` // "score_update", "match_status", etc.
	Data interface{} `json:"data"`
}

// NewBroadcastData creates a JSON-encoded broadcast message
func NewBroadcastData(msgType string, data interface{}) ([]byte, error) {
	msg := BroadcastMessage{
		Type: msgType,
		Data: data,
	}
	return json.Marshal(msg)
}
