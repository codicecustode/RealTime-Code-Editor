
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Editor from '../components/Editor';
import Actions from '../../Actions';
const EditorPage = () => {

  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  //const [clients, setClients] = useState([]);
  const clients = [
    { username: 'User1' },
    { username: 'User2' },
    { username: 'User3' },
  ];

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId!);
      toast.success('ROOM ID has been copied to your clipboard');
    } catch (err) {
      console.error('Failed to copy ROOM ID:', err);
      toast.error('Could not copy ROOM ID');
    }
  };

  const handleLeaveRoom = () => {
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
              <h4>{client.username}</h4>
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
        <Editor
        />
      </div>
    </div>
  );
};


export default EditorPage;