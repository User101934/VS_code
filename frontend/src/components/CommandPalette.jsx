import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Play, Eye, FilePlus, FolderPlus, Settings, X } from 'lucide-react';
import './commandPalette.css';

export default function CommandPalette({ isOpen, onClose, commands }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const filteredCommands = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="command-palette-search">
                    <Search size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command to run..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                </div>
                <div className="command-palette-list" ref={listRef}>
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => {
                                    cmd.action();
                                    onClose();
                                }}
                            >
                                <span className="command-icon">{cmd.icon}</span>
                                <span className="command-label">{cmd.label}</span>
                                <span className="command-shortcut">{cmd.shortcut}</span>
                            </div>
                        ))
                    ) : (
                        <div className="command-palette-empty">No commands found</div>
                    )}
                </div>
            </div>
        </div>
    );
}
