import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import FileIcon from './FileIcon';

export default function FileTreeItem({
    name,
    isDir,
    isOpen,
    level = 0,
    onClick,
    isEditing = false,
    onCommit,
    onCancel,
}) {
    const [inputValue, setInputValue] = useState(name || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (inputValue.trim()) {
                onCommit(inputValue.trim());
            } else {
                onCancel();
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            onCommit(inputValue.trim());
        } else {
            onCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="tree-rename-container">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="tree-rename-input"
                />
            </div>
        );
    }

    return (
        <div className="tree-item-content">
            {/* Arrow for folders */}
            <span className={`tree-arrow ${isDir ? "visible" : ""}`}>
                {isDir && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
            </span>

            {/* Icon */}
            <span className="tree-icon">
                {isDir ? (
                    isOpen ? (
                        <FolderOpen size={16} color="#dcb67a" />
                    ) : (
                        <Folder size={16} color="#dcb67a" />
                    )
                ) : (
                    <FileIcon name={name} size={16} />
                )}
            </span>

            {/* Filename */}
            <span className="tree-label">
                {name}
            </span>
        </div>
    );
}

