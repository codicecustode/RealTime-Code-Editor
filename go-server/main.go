package main

import (
	"encoding/json"
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
			"username": client.Username,
		})
	}
	return clientList
}

func handlerConnection(w http.ResponseWriter, r *http.Request) {

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade", err)
		conn.Close()
		return
	}

	//wait untill first message and fisrt message should be join 
	_, message, err := conn.ReadMessage()
	if err != nil{
		log.Println("Read Error (pre-join):", err)
		conn.Close()
		return
	}

	var msg IncomingMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Println("Unmarshal Error (pre-join):", err)
		conn.Close()
		return
	}

	if msg.Event != "JOINED" || msg.Username == "" || msg.RoomId == ""{
		log.Printf("Invalid first message: Event=%s, User=%s, Room=%s", msg.Event, msg.Username, msg.RoomId)
		conn.Close()
		return
	}

	//Create the client struct and add them to the room
	client := &ClientInfo{
		Username: msg.Username,
		Conn: conn,
	}

	//apply lock so that not two people create same room
	mu.Lock()
	if _, exist := rooms[msg.RoomId]; !exist {
		rooms[msg.RoomId] = make(map[*ClientInfo]bool)
	}
	rooms[msg.RoomId][client] = true
	//get the client while lock applied
	clientList := getClientByRoomId(msg.RoomId)
	mu.Unlock()

	log.Printf("✅ %s joined room %s\n", client.Username, msg.RoomId)

	// Send the "JOINED" event to the broadcast channel
	messageChan <- BroadcastData{
		Event: "JOINED",
		Data: JoinData{
			Username: client.Username,
			RoomId:   msg.RoomId,
			Clients:  clientList, 
		},
	}

	defer func() {

		var clientsListAfterLeave []map[string]string
		mu.Lock()
		delete(rooms[msg.RoomId], client)
		if len(rooms[msg.RoomId]) == 0 {
			delete(rooms, msg.RoomId)
			log.Println("Room deleted:", msg.RoomId)
		} else {
			clientsListAfterLeave = getClientByRoomId(msg.RoomId)
		}
		mu.Unlock()

		conn.Close()
		log.Printf("❌ %s left room %s\n", client.Username, msg.RoomId)

		messageChan <- BroadcastData{
			Event: "LEAVE",
			Data: LeaveData{
				Username: msg.Username,
				RoomId: msg.RoomId,
				Clients: clientsListAfterLeave,
			},
		}
		
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break // break will invoke defer
		}

		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Println(err)
			break
		}

		switch msg.Event {

		case "LEAVE":
			break // Exit loop, triggers 'defer'
			
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

		finalMessage := BroadcastData{
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
	r.HandleFunc("/", handlerConnection)

	// Start broadcaster
	go broadcastMessage()

	log.Println("Server started on port 3000")
	if err := http.ListenAndServe(":3000", r); err != nil {
		log.Println("ListenAndServe error:", err)
	}
}
