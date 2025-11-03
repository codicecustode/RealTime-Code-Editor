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

type Message struct {
	Event  string `json:"event"`
	Data   string `json:"data"`
	RoomId string `json:"roomId"`
}

var mu sync.Mutex
var messageChan = make(chan Message)
var rooms = make(map[string]map[*websocket.Conn]bool)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Accept any origin - not recommended for production!
	},
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
		mu.Lock()
		delete(rooms[roomId], conn)
		if len(rooms[roomId]) == 0 {
			delete(rooms, roomId)
			log.Println("Room deleted:", roomId)
		}
		mu.Unlock()

		conn.Close()
		messageChan <- Message{Event: "leave", Data: "A user Left", RoomId: roomId}
	}()

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			delete(rooms[roomId], conn)
			if len(rooms[roomId]) == 0 {
				delete(rooms, roomId)
			}
			break
		}

		switch messageType {

		case websocket.TextMessage:
			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Println(err)
				break
			}

			messageChan <- msg

		case websocket.BinaryMessage:
			mu.Lock()
			for client := range rooms[roomId] {

				if conn != client {

					err := client.WriteMessage(websocket.BinaryMessage, message)

					if err != nil {
						log.Println("Write error:", err)
						client.Close()
						delete(rooms[roomId], client)
						if len(rooms[roomId]) == 0 {
							delete(rooms, roomId)
						}
					}
				}
			}
			mu.Unlock()
		}
	}
}

func broadcastMessage() {

	for {
		msg := <-messageChan
		roomId := msg.RoomId
		mu.Lock()
		clients := rooms[roomId]
		mu.Unlock()
		for client := range clients {

			err := client.WriteMessage(websocket.TextMessage, []byte(msg.Data))

			if err != nil {
				log.Println(err)
				client.Close()
				delete(rooms[roomId], client)
				if len(rooms[roomId]) == 0 {
					delete(rooms, roomId)
				}
			}
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
