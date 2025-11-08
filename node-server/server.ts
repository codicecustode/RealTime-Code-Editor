import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import winston from "winston";


// Winston Logger Setup
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "server.log" }),
  ],
});


// Express + WebSocket Setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });


// In-Memory Room Store
type ClientInfo = { username: string; socket: WebSocket };
const rooms = new Map<string, ClientInfo[]>();


// Broadcast Helper
const broadcastRoomMessage = (roomId: string, data: any) => {
  const room = rooms.get(roomId);
  if (!room) return;
  room.forEach(({ socket }) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  });
};

// WebSocket Connection
wss.on("connection", (ws: WebSocket) => {
  logger.info("🔌 New WebSocket client connected");

  ws.on("message", (msg: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(msg);
    } catch {
      logger.error(`❌ Invalid JSON: ${msg}`);
      return;
    }

    const { event, roomId, username, code } = parsed;
    logger.debug(`Received event ${event} from ${username || "unknown"}`);
    logger.debug(`Received data: ${parsed}`);

    switch (event) {
      
      // JOIN ROOM
      case "JOINED": {
        const room = rooms.get(roomId) || [];
        room.push({ username, socket: ws });
        rooms.set(roomId, room);

        const clients = room.map((c) => ({ username: c.username }));

        broadcastRoomMessage(roomId, {
          event: "JOINED",
          data: { username, clients },
        });

        logger.info(`✅ ${username} joined room ${roomId}`);
        break;
      }

      
      // EDITOR CHANGE
      case "EDITOR_CHANGE": {
        if (!rooms.has(roomId)) return;
        broadcastRoomMessage(roomId, {
          event: "EDITOR_CHANGE",
          data: { username, roomId, code },
        });
        break;
      }

      
      // 🟡 LEAVE ROOM
      
      case "LEAVE": {
        const room = rooms.get(roomId);
        if (!room) return;

        const updated = room.filter((c) => c.username !== username);
        rooms.set(roomId, updated);

        broadcastRoomMessage(roomId, {
          event: "LEAVE",
          data: { username, clients: updated.map((c) => ({ username: c.username })) },
        });

        logger.info(`👋 ${username} left room ${roomId}`);
        break;
      }

      default:
        logger.warn(`⚠️ Unknown event: ${event}`);
    }
  });

  
  // Handle Disconnect
  ws.on("close", () => {
    rooms.forEach((clients, roomId) => {
      const leavingClient = clients.find((c) => c.socket === ws);
      if (!leavingClient) return;

      const updated = clients.filter((c) => c.socket !== ws);
      rooms.set(roomId, updated);

      broadcastRoomMessage(roomId, {
        event: "LEAVE",
        data: { username: leavingClient.username, clients: updated.map((c) => ({ username: c.username })) },
      });

      logger.info(`🧹 Removed ${leavingClient.username} from room ${roomId}`);
    });
  });
});


// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});
