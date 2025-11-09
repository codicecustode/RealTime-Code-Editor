package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	//"strings"
	"sync"
)


type IncomingMessage struct {
	Event    string `josn:"event"`
	RoomId   string `josn:"roomId"`
	Username string `josn:"username"`
	Code     string `json:"code,omitempty"`
}

type BroadcastMessage struct {
	Event string      `josn:"event"`
	Data  interface{} `json:"data"`
}

type JoinData struct {
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
	Clients  []map[string]string `json:"clients"`
}

type LeaveData struct {
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
	Clients  []map[string]string `josn:"clients"`
}

type EditorChangeData struct {
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
	Code     string `json:"code"`
}

type ClientInfo struct {
	Username string
	Conn     *websocket.Conn
}

type BroadcastData struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

var rooms = make(map[string]map[*ClientInfo]bool)

var mu sync.Mutex
var messageChan = make(chan BroadcastData)

//var rooms = make(map[string]map[*websocket.Conn]bool)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Accept any origin - not recommended for production!
	},
}

func getClientByRoomId(roomId string) []map[string]string {
	var clientList []map[string]string
	for client := range rooms[roomId] {
		clientList = append(clientList, map[string]string{
			"username": client.Username
		})
	}
	return clientList
}

func handlerConnection(w http.ResponseWriter, r *http.Request) {
	// roomId := strings.TrimPrefix(r.URL.Path, "/ws/")
	// fmt.Println(roomId)
	vars := mux.Vars(r)
	roomId := vars["roomId"]
	fmt.Println(roomId)
	if roomId == "" {
		log.Println("Room Id is required to connect with Server.")
		http.Error(w, "Room Id is required", http.StatusBadRequest)
		return
	}

	mu.Lock()
	if _, exist := rooms[roomId]; !exist {
		fmt.Println("RoomId is not exist. Creating New...")
		rooms[roomId] = make(map[*websocket.Conn]bool)
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade", err)
		//conn.Close()
		return
	}

	rooms[roomId][conn] = true
	mu.Unlock()

	messageChan <- Message{Event: "join", Data: "A user Joined", RoomId: roomId}

	defer func() {
	
		delete(rooms[roomId], conn)
		if len(rooms[roomId]) == 0 {
			delete(rooms, roomId)
			log.Println("Room deleted:", roomId)
		}
		conn.Close()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			delete(rooms[roomId], conn)
			if len(rooms[roomId]) == 0 {
				delete(rooms, roomId)
			}
			break
		}

		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Println(err)
			break
		}

		switch msg.Event {
		case "JOINED":
			// Create a new client
			client := &ClientInfo{
				Username: msg.Username,
				Conn:     conn,
			}

			// If room doesn't exist, initialize it
			if rooms[msg.RoomId] == nil {
				rooms[msg.RoomId] = make(map[*ClientInfo]bool)
			}

			//add client in room
			rooms[roomId][client] = true

			log.Printf("✅ %s joined room %s\n", msg.Username, msg.RoomId)

			clients = getClientByRoomId(msg.RoomId)
			//pass the join msg in channel for broadcasting
			messageChan <- BroadcastData{
				Event: msg.Event,
				Data: JoinData{
					Username: msg.Username,
					RoomId:   msg.RoomId,
					Clients:  clients,
				},
			}

		case "LEAVE":
			clients, exists := rooms[msg.RoomId]
			if !exists {
				log.Println("⚠️ Room not found:", msg.RoomId)
				return
			}

			for client := range clients {
				if client.Username == msg.Username && client.Conn == conn {
					delete(clients, client)
					log.Printf("❌ %s left room %s\n", client.Username, msg.RoomId)
					if len(clients) == 0 {
						delete(rooms, msg.RoomId)
					}
					clients = getClientByRoomId(msg.RoomId)
					//send leave msg in channel for braocasting
					messageChan <- BroadcastData{
						Event: msg.Event,
						Data: LeaveData{
							Username: msg.Username,
							RoomId:   msg.RoomId,
							Clients:  clients,
						},
					}
					return
				}
			}
		case "EDITOR_CHANGE":
			messageChan <- BroadcastData{
				Event: msg.Event,
				Data: EditorChangeData{
					Username: msg.Username,
					RoomId:   msg.RoomId,
					Code:     msg.Code,
				},
			}
		}
	}

}

func broadcastMessage() {

	for {
		broadcastMsg := <-messageChan

		var roomId string
		var eventData interface{}

		switch data := broadcastMsg.Data.(type) {
		case JoinData:
			roomId = data.RoomId
			eventData = data
		case LeaveData:
			roomId = data.RoomId
			eventData = data
		case EditorChangeData:
			roomId = data.RoomId
			eventData = data
		default:
			log.Println("Unknown data type in broadcast channel")
			continue

		}

		if roomId == "" {
			log.Println("Could not find RoomId in broadcast message")
			continue
		}

		finalMessage := BroadcastMessage{
			Event: broadcastMsg.Event,
			Data:  eventData,
		}

		messageBytes, err := json.Marshal(finalMessage)
		if err != nil {
			log.Println("Failed to marshal broadcast message:", err)
			continue
		}

		clientInfo, exist := rooms[roomId]
		if !exist {
			log.Println("Room Id not eixst")
			return
		}
		for client := range clientInfo {
			err := client.Conn.WriteMessage(websocket.TextMessage, messageBytes)
			if err != nil {
				log.Println("Write Error, removing client:", err)
				client.Conn.Close()
				delete(clientInfo, client)
			}
		}

		if len(rooms[roomId]) == 0 {
			delete(rooms, roomId)
			log.Println("Room deleted (empty after write error):", roomId)
		}
	}
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/ws/{roomId}", handlerConnection)

	// Start broadcaster
	go broadcastMessage()

	log.Println("Server started on port 3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Println("ListenAndServe error:", err)
	}
}
