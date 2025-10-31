import { useRef, useEffect } from "react";
import toast from 'react-hot-toast';
import { basicSetup } from "codemirror"
import { EditorView } from "@codemirror/view"
// import {
//     defaultHighlightStyle, syntaxHighlighting
// } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"; // Any language support you need
import { vscodeDark } from "@uiw/codemirror-theme-vscode"; // VS Code dark theme
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";

const Editor = ({ roomId, onProviderReady }: { roomId: string, onProviderReady: (args: { provider: WebsocketProvider}) => void
 }) => {

    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        const ydoc = new Y.Doc();

        const ytext = ydoc.getText("codemirror");

        const provider = new WebsocketProvider("ws://localhost:8080/ws", roomId, ydoc);

        let ws = provider.ws || null;
        provider.on("status", (event: { status: string }) => {
            console.log("WebSocket Provider status:", event.status);
            if (event.status === "connected") {
                onProviderReady({
                    provider,
                });
            }
        })

        console.log("WebSocket connected:", provider);

        if (ws) {
            ws.onmessage = (event: MessageEvent) => {
                console.log("WebSocket message received in Editor:", event.data);
                toast.success("A user has joined the room!");
                
            }
        }

        const awareness = provider.awareness;

        const editor = new EditorView({
            doc: "// Happy Coding!",
            extensions: [
                basicSetup,
                javascript(),      // Add languages as required
                vscodeDark,        // The VS Code theme extension
                yCollab(ytext, awareness), // Yjs collaboration extension
            ],
            parent: editorRef.current!,
        });

        return () => {
            editor.destroy();
            provider.destroy();
            ydoc.destroy();
        }
    }, []);


    return (
        <div ref={editorRef} className="editor"></div>
    )
}
export default Editor;