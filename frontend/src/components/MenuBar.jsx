import React, { useState, useEffect, useRef } from 'react';
import './menuBar.css';

export default function MenuBar({ onNewFile, onNewFolder, onRun }) {
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    const menus = {
        'File': [
            { label: 'New File', action: onNewFile, shortcut: 'Ctrl+N' },
            { label: 'New Folder', action: onNewFolder },
            { type: 'separator' },
            { label: 'Save', action: () => { }, shortcut: 'Ctrl+S' },
            { label: 'Save As...', action: () => { } },
            { type: 'separator' },
            { label: 'Share', action: () => { } },
            { label: 'Exit', action: () => window.close() }
        ],
        'Edit': [
            { label: 'Undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', shortcut: 'Ctrl+Y' },
            { type: 'separator' },
            { label: 'Cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', shortcut: 'Ctrl+V' }
        ],
        'Selection': [
            { label: 'Select All', shortcut: 'Ctrl+A' },
            { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' }
        ],
        'View': [
            { label: 'Explorer', action: () => { }, shortcut: 'Ctrl+Shift+E' },
            { label: 'Search', action: () => { }, shortcut: 'Ctrl+Shift+F' },
            { type: 'separator' },
            { label: 'Appearance', action: () => { } },
            { label: 'Editor Layout', action: () => { } }
        ],
        'Go': [
            { label: 'Back', shortcut: 'Alt+Left' },
            { label: 'Go to File...', shortcut: 'Ctrl+P' }
        ],
        'Run': [
            { label: 'Run Without Debugging', action: onRun, shortcut: 'Ctrl+F5' },
            { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' }
        ],
        'Help': [
            { label: 'Documentation' },
            { label: 'Check for Updates...' },
            { type: 'separator' },
            { label: 'About TeachGrid', action: () => alert('TeachGrid IDE v2.0 - Realistic Edition') }
        ]
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="menu-bar" ref={menuRef}>
            <div className="menu-logo">
                <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                    <path d="M50 5L10 25V75L50 95L90 75V25L50 5Z" stroke="currentColor" strokeWidth="8" fill="rgba(0,122,204,0.1)" />
                    <path d="M50 30L30 40V60L50 70L70 60V40L50 30Z" fill="currentColor" />
                </svg>
                <span>TeachGrid</span>
            </div>

            {Object.keys(menus).map(menuName => (
                <div key={menuName} style={{ position: 'relative' }}>
                    <div
                        className={`menu-trigger ${activeMenu === menuName ? 'active' : ''}`}
                        onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
                        onMouseOver={() => activeMenu && setActiveMenu(menuName)}
                    >
                        {menuName}
                    </div>

                    {activeMenu === menuName && (
                        <div className="menu-dropdown">
                            {menus[menuName].map((item, idx) => (
                                item.type === 'separator' ? (
                                    <div key={idx} className="menu-separator" />
                                ) : (
                                    <div
                                        key={idx}
                                        className="menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(null);
                                            if (item.action) item.action();
                                        }}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            ))}

            <div className="menu-info">
                Professional Edition
            </div>
        </div>
    );
}

