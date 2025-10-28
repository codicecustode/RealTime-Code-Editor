package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type Message struct {
	Event string `json: "event"`
	Data string `json: "data"`
	RoomId string `json: "roomId"`
}

// mu := sync.Mutex
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
	roomId := r.URL.Query().Get("roomId")
	if roomId == "" {
		log.Fatal("Room Id is required to connect with Server.")
		return
	}

	if _, exist := rooms[roomId]; !exist {
		rooms[roomId] = make(map[*websocket.Conn]bool)
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade",err)
		return
	}

	//always close the connection(Although this line not close instant, it schedule the closing connection)
	
	defer conn.Close()


	rooms[roomId][conn] = true

	messageChan <- Message { Event: "join", Data: "A user Joined", RoomId: roomId}

	for {
		//send message to the client
		// err = conn.WriteMessage(websocket.TextMessage, []byte("egd"))
		// if err != nil {
		// 	log.Fatal(err)
		// 	return
		// }

		// //read the message from client
		// _, message, err := conn.ReadMessage()
		// if err != nil {
		// 	log.Fatal(err)
		// 	return
		// }

		var message Message
		err := conn.ReadJSON(&message)
		if err != nil {
			log.Fatal(err)
		}
		switch message.Event {
		case "message":
			messageChan <- Message{Event: "message", Data: "Some Message Received", RoomId: roomId}
		case "join":
			messageChan <- Message{Event: "join", Data: "A user Joined", RoomId: roomId}
		case "codeChange":

		}
	}
}

func broadcastMessage() {

	for {
		// receive the broadcasting message from message channel
		// msg := <-messageChan

		// for client := range clients {
		// 	err := client.WriteMessage(websocket.TextMessage, msg)
		// 	if err != nil {
		// 		log.Fatal("Erro while writing broadcasting msg.", err)
		// 		delete(clients, client)
		// 	}
		// }

		msg := <-messageChan
		roomId = msg.roomId
		for client := range rooms[roomId] {
			err := client.WriteMessage(websocket.TextMessage,msg.data)
			if err != nil {
				log.Fatal(err)
				delete(rooms[roomId], client)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handlerConnection)

	//use goroutine for concurrency
	go broadcastMessage()

	log.Println("Server started on 8080 port")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("Error in Listen and Serve:", err)
	}
}
