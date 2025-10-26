package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	
)



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

	//send message to the client
	err = conn.WriteMessage(websocket.TextMessage, []byte("egd"))
	if err != nil {
		log.Fatal(err)
		return
	}

	//read the message from client
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Fatal(err)
		return
	}
	log.Printf("Received from client %s", message)
}

func main() {
	http.HandleFunc("/ws", handlerConnection)
	log.Println("Server started on 8080 port")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("Error in Listen and Serve:", err)
	}
}
