import React, { useState, useRef, useLayoutEffect } from "react";
import "./terminal.css";

export default function Terminal({ output, onCommand, path = "~", isExecuting = false }) {
    const endRef = useRef(null);
    const inputRef = useRef(null);
    const [input, setInput] = useState("");

    useLayoutEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
    }, [output]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !isExecuting) {
            onCommand(input);
            setInput("");
        }
    };

    const handleClick = () => {
        if (!isExecuting) {
            inputRef.current?.focus();
        }
    };

    return (
        <div className="terminal-container" onClick={handleClick} style={isExecuting ? { cursor: 'wait' } : {}}>
            {/* Header */}
            <div className="terminal-header">
                <span>Terminal</span>
                {isExecuting && <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.7 }}>Running...</span>}
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
                <div className="terminal-input" style={{ opacity: isExecuting ? 0.5 : 1 }}>
                    <span className="prompt">➜</span>
                    <span className="path">{path}</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck="false"
                        autoComplete="off"
                        autoFocus={!isExecuting}
                        disabled={isExecuting}
                        placeholder={isExecuting ? "Waiting for process..." : ""}
                    />
                </div>

                <div ref={endRef} />
            </div>
        </div>
    );
}
