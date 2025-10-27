import { useRef, useEffect } from "react";

import { basicSetup } from "codemirror"
import { EditorView } from "@codemirror/view"
// import {
//     defaultHighlightStyle, syntaxHighlighting
// } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"; // Any language support you need
import { vscodeDark } from "@uiw/codemirror-theme-vscode"; // VS Code dark theme



const Editor = () => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const editor = new EditorView({
            doc: "// Happy Coding!",
            extensions: [
                basicSetup,
                javascript(),      // Add languages as required
                vscodeDark,        // The VS Code theme extension
            ],
            parent: editorRef.current!,
        });

        return () => {
            editor.destroy();
        }
    }, []);


    return (
        <div ref={editorRef} className="editor"></div>
    )
}
export default Editor;