import { useRef, useEffect } from "react";

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

const Editor = ({roomId}) => {

    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        const ydoc = new Y.Doc();

        const ytext = ydoc.getText("codemirror");

        const provider = new WebsocketProvider("ws://localhost:8080/ws", roomId, ydoc);

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