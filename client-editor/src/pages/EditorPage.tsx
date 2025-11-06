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
    socketRef.current = new WebSocket('ws://localhost:5000');
    setClients((prev) => {
      const existing = prev.some(client => client.username === (location.state as any).username);
      if (!existing) {
        return [...prev, { username: (location.state as any).username }];
      }
      return prev;
    })

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