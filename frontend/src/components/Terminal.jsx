import React, { useState, useRef, useLayoutEffect } from "react";
import "./terminal.css";

export default function Terminal({ output, onCommand, path = "~" }) {
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const [input, setInput] = useState("");

    useLayoutEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
    }, [output]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            onCommand(input);
            setInput("");
        }
    };

    const handleClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="terminal-container" onClick={handleClick}>
            {/* Header */}
            <div className="terminal-header">
                <span>Terminal</span>
            </div>

            {/* Body */}
            <div className="terminal-body">
                <div className="terminal-welcome">
                    TeachGrid Terminal v1.1.0<br />
                    type <span>help</span> to get started
                </div>

                {output.map((line, i) => (
                    <div key={i} className="terminal-line">
                        {line.startsWith("➜") ? (
                            <>
                                <span className="prompt">➜</span>
                                <span className="command">
                                    {line.slice(1)}
                                </span>
                            </>
                        ) : (
                            line
                        )}
                    </div>
                ))}

                {/* Input */}
                <div className="terminal-input">
                    <span className="prompt">➜</span>
                    <span className="path">{path}</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck="false"
                        autoComplete="off"
                        autoFocus
                    />
                </div>

                <div ref={endRef} />
            </div>
        </div>
    );
}
