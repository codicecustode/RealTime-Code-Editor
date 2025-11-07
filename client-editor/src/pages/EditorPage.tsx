//EditorPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Editor from '../components/Editor';
import Actions from '../../Actions';


const EditorPage = () => {

  const location = useLocation();
  const { roomId } = useParams();
  const socketRef = useRef<WebSocket | null>(null);
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState<{ username: string }[]>([]);

  useEffect(() => {
    if (!location.state || !(location.state as any).username) {
      toast.error('Username is required. Redirecting to Home Page');
      reactNavigator('/');
      return;
    }
    socketRef.current = new WebSocket('ws://localhost:5000');
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      toast.success('Connected to the server');
      
      socketRef.current?.send(JSON.stringify({
        event: "JOINED",
        roomId,
        username: (location.state as any).username,
      }));
    };

    socketRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message from server:", data);
      switch (data.event) {
        case "JOINED": {
          const joinedUser = data.data.username;
          const myUsername = (location.state as any).username;
          const clientsList = (data.clients || []).map((c: any) =>
            typeof c === "string" ? { username: c } : c
          );

          setClients(clientsList); // ✅ Always update
          if (joinedUser !== myUsername) {
            toast.success(`${joinedUser} joined the room.`);
          }
          break;
        }
        case "LEAVE": {
          const clientsList = (data.data.clients || []).map((c: any) =>
            typeof c === "string" ? { username: c } : c
          );
          setClients(clientsList);
          toast.success(`${data.data.username} left the room.`);
          break;
        }
      }
    }

    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      toast.error('Disconnected from the server');
      //sednd leave notification

    };

    return () => {
      socketRef.current?.send(JSON.stringify({
        event: "LEAVE",
        roomId,
        username: (location.state as any).username,
      }));
      socketRef.current?.close();

    };

  }, []);





  const handleCopyRoomId = async () => {
    try {
      if (!roomId) return toast.error("Room ID missing");
      await navigator.clipboard.writeText(roomId);
      toast.success('ROOM ID has been copied to your clipboard');
    } catch (err) {
      console.error('Failed to copy ROOM ID:', err);
      toast.error('Could not copy ROOM ID');
    }
  };

  const handleLeaveRoom = () => {
    toast.success('You have left the room');
    reactNavigator('/');
  };

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img
              className="logoImage"
              src="/code-sync.png"
              alt="logo"
            />
          </div>
          <h3>Connected Forks</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <h4 key={client.username}>{client.username}</h4>
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={handleCopyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={handleLeaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        {
          socketRef.current && (
            <Editor roomId={roomId!} socket={socketRef.current} />
          )
        }
      </div>
    </div>
  );
};


export default EditorPage;