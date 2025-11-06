import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<
  string,
  {
    username: string,
    socketId: string,
    socket: WebSocket
  }[]
>();

wss.on("connection", (ws: WebSocket) => {
  console.log("New client connected");
  ws.on("message", (message: string) => {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.event === "editorChange") {
      // Broadcast the change to all other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              event: "applyChange",
              changes: parsedMessage.changes,
            })
          );
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});


