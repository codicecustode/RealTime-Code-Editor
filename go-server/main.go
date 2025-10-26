package main

import (
	"log"
	"net/http"
	

	"github.com/gorilla/websocket"
	
)

type Message struct {
	Event string `json: "event"`
	Data string `json: "data"`
}

//mu := sync.Mutex
var clients = make(map[*websocket.Conn] bool)
var messageChan = make(chan []byte)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Accept any origin - not recommended for production!
	},
}

func handlerConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
		return
	}

	//always close the connection(Although this line not close instant, it schedule the closing connection)
	defer conn.Close()

	clients[conn] = true
	messageChan <- []byte("A user joined")

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
				messageChan <- []byte (message.Data)
			case "join":
				messageChan <- []byte ("A user Joined room")
		}
	}
}

func broadcastMessage(){

	for {
	// receive the broadcasting message from message channel
		msg := <- messageChan 

		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err!= nil{
				log.Fatal("Erro while writing broadcasting msg.", err)
				delete(clients, client)
			}
		}
  }
}

func main() {
	http.HandleFunc("/ws", handlerConnection)
	go broadcastMessage()
	log.Println("Server started on 8080 port")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("Error in Listen and Serve:", err)
	}
}
