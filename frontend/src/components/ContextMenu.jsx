import React, { useEffect, useRef } from 'react';
import { Pencil, Trash2, FilePlus, FolderPlus, Copy, X } from 'lucide-react';
import './contextMenu.css';

export default function ContextMenu({ position, onClose, onAction, item }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    if (!position) return null;

    const actions = item.isDir
        ? [
            { id: 'new-file', label: 'New File', icon: <FilePlus size={14} /> },
            { id: 'new-folder', label: 'New Folder', icon: <FolderPlus size={14} /> },
            { id: 'rename', label: 'Rename', icon: <Pencil size={14} /> },
            { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, danger: true },
        ]
        : [
            { id: 'rename', label: 'Rename', icon: <Pencil size={14} /> },
            { id: 'copy-path', label: 'Copy Path', icon: <Copy size={14} /> },
            { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, danger: true },
        ];

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ top: position.y, left: position.x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {actions.map(action => (
                <div
                    key={action.id}
                    className={`context-menu-item ${action.danger ? 'danger' : ''}`}
                    onClick={() => {
                        onAction(action.id, item);
                        onClose();
                    }}
                >
                    <span className="context-icon">{action.icon}</span>
                    <span className="context-label">{action.label}</span>
                </div>
            ))}
        </div>
    );
}
