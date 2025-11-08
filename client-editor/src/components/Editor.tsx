import { useRef, useEffect } from "react";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

const CollaborationEditor = ({
  socket,
  roomId,
  username
}: {
  socket: WebSocket;
  roomId: string;
  username: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const fullHeightTheme = EditorView.theme({
      "&": {
        height: "100vh",        // Full viewport height
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      },
      ".cm-scroller": {
        flexGrow: 1,
      }
    });
    const editor = new EditorView({
      doc: "// Start coding...",
      extensions: [
        basicSetup,
        javascript(),
        vscodeDark,
        fullHeightTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const code = update.state.doc.toString();
            socket.send(
              JSON.stringify({
                event: "EDITOR_CHANGE",
                roomId,
                code,
                username,
              })
            );
          }
        }),
      ],
      parent: editorRef.current,
    });

    editorInstanceRef.current = editor;
    return () => editor.destroy();
  }, []);

  // Listen for incoming code changes
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data);
        if (username !== data.username && event === "EDITOR_CHANGE" && data.roomId === roomId) {
          
          const code = data.code;
          const editor = editorInstanceRef.current;
          if (editor && editor.state.doc.toString() !== code) {
            console.log("Updating editor content");
            editor.dispatch({
              changes: { from: 0, to: editor.state.doc.length, insert: code },
            });
          }
        }
      } catch (err) {
        console.error("Invalid WS message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, roomId]);

  return <div ref={editorRef} className="editor"></div>;
};

export default CollaborationEditor;
