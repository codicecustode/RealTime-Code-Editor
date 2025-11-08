import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import CollaborationEditor from "../components/Editor";

const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();
  const socketRef = useRef<WebSocket | null>(null);
  const usernameRef = useRef<string | null>(null);
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState<{ username: string }[]>([]);

  useEffect(() => {
    const username = (location.state as any)?.username;
    usernameRef.current = username;
    if (!username) {
      toast.error("Username required. Redirecting...");
      reactNavigator("/");
      return;
    }

    const socket = new WebSocket("ws://localhost:3000");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
      toast.success("Connected to the server");

      socket.send(
        JSON.stringify({
          event: "JOINED",
          roomId,
          username,
        })
      );
    };

    socket.onmessage = (message) => {
      const { event, data } = JSON.parse(message.data);

      switch (event) {
        case "JOINED": {
          const joinedUser = data.username;
          const clientsList = (data.clients || []).map((c: any) =>
            typeof c === "string" ? { username: c } : c
          );
          setClients(clientsList);
          if (joinedUser !== username) {
            toast.success(`${joinedUser} joined the room.`);
          }
          break;
        }

        case "LEAVE": {
          const clientsList = (data.clients || []).map((c: any) =>
            typeof c === "string" ? { username: c } : c
          );
          setClients(clientsList);
          if (data.username !== username) {
            toast.success(`${data.username} left the room.`);
          }
          break;
        }

        default:
          console.log("⚠️ Unknown event:", data.event);
      }
    };

    socket.onclose = () => {
      toast.error("Disconnected from server");
    };

    // Cleanup on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            event: "LEAVE",
            roomId,
            username,
          })
        );
      }
      socket.close();
    };
  }, []);

  useEffect(() => {
    console.log("👥 Clients:", clients);
  }, [clients]);

  const handleCopyRoomId = async () => {
    if (!roomId) return toast.error("Missing Room ID");
    await navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied");
  };

  const handleLeaveRoom = () => {
    toast.success("You left the room");
    socketRef.current?.send(
      JSON.stringify({
        event: "LEAVE",
        roomId,
        username: usernameRef.current,
      })
    );
    reactNavigator("/");
  };

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected Users</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <h4 key={client.username}>{client.username}</h4>
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={handleCopyRoomId}>
          Copy Room ID
        </button>
        <button className="btn leaveBtn" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="editorWrap">
        {socketRef.current && usernameRef.current && (
          <CollaborationEditor roomId={roomId!} socket={socketRef.current} username={usernameRef.current} />
        )}
      </div>
    </div>
  );
};

export default EditorPage;
