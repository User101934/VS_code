import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import Terminal from "./Terminal";
import FileTreeItem from "./FileTreeItem";
import ActivityBar from "./ActivityBar";
import StatusBar from "./StatusBar";
import MenuBar from "./MenuBar";
import SearchView from "./SearchView";
import FileIcon from "./FileIcon";
import {
    FilePlus,
    FolderPlus,
    FolderOpen as FolderOpenIcon,
    X,
    Search as SearchIcon,
    Play,
    SplitSquareHorizontal,
    Save,
    MoreHorizontal,
    ChevronRight,
    Trash2,
    Edit2,
    Eye,
    EyeOff,
    Settings,
    Package
} from "lucide-react";
import io from "socket.io-client";
import WebPreview from "./WebPreview";
import { getFileLanguage, stripAnsi } from "../utils/helpers";
import { LANGUAGES } from "../config/languages";
import "./ideLayout.css";
import "./activityBar.css";
import "./menuBar.css";
import CommandPalette from "./CommandPalette";
import ContextMenu from "./ContextMenu";
import "./contextMenu.css";
import "./commandPalette.css";
import DBExplorer from './DBExplorer';
import QueryPane from './QueryPane';
import { CORE_MODULES } from '../config/modules';

const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function IDELayout() {
    /* ================= STATE ================= */
    const [files, setFiles] = useState([]);
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);

    const [activeSidebarView, setActiveSidebarView] = useState("explorer");
    const [modules, setModules] = useState(CORE_MODULES);
    const [activePanel, setActivePanel] = useState("terminal");

    const [terminals, setTerminals] = useState([{ id: "t1", title: "terminal", output: [] }]);
    const [activeTerminalId, setActiveTerminalId] = useState("t1");
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentPath, setCurrentPath] = useState([]); // Array of folder names
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, item }
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [activeDB, setActiveDB] = useState(null); // { id, dbName, table }

    const socketRef = useRef(null);

    const activeFile = useMemo(
        () => openFiles.find(f => f.id === activeFileId) || null,
        [openFiles, activeFileId]
    );

    /* ================= EXECUTION ================= */

    const executeFile = useCallback((name, content, langOverride = null) => {
        if (isExecuting) {
            alert("Code is already running. Please wait.");
            return;
        }

        const langKey = langOverride || getFileLanguage(name);
        setIsExecuting(true);
        setActivePanel("terminal");
        setTerminals(prev => prev.map(t =>
            t.id === activeTerminalId ? { ...t, output: [...t.output, `▶ Executing ${name}...`] } : t
        ));
        console.log(`[Frontend] Emitting execute for ${name}`);
        if (socketRef.current?.connected) {
            socketRef.current.emit("execute", {
                language: langKey,
                code: content,
                fileName: name
            });
        } else {
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalId ? { ...t, output: [...t.output, "\n❌ Error: Socket not connected. Please refresh or check server status.\n"] } : t
            ));
            setIsExecuting(false);
        }
    }, [activeTerminalId, isExecuting]);

    const handleRunCode = useCallback(() => {
        if (!activeFile) return;
        if (isExecuting) {
            alert("Code is already running. Please wait.");
            return;
        }

        setIsExecuting(true);
        setActivePanel("terminal");
        setTerminals(prev => prev.map(t =>
            t.id === activeTerminalId ? { ...t, output: [...t.output, `▶ Executing ${activeFile.name}...`] } : t
        ));
        console.log(`[Frontend] handleRunCode for ${activeFile.name}`);
        if (socketRef.current?.connected) {
            socketRef.current.emit("execute", {
                language: getFileLanguage(activeFile.name),
                code: activeFile.content,
                fileName: activeFile.name
            });
        } else {
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalId ? { ...t, output: [...t.output, "\n❌ Error: Socket not connected.\n"] } : t
            ));
            setIsExecuting(false);
        }
    }, [activeFile, activeTerminalId, isExecuting]);

    // --- AUTO-SAVE LOGIC ---
    useEffect(() => {
        const savedFiles = localStorage.getItem("teachgrid_files");
        const savedOpenFiles = localStorage.getItem("teachgrid_open_files");
        const savedActiveId = localStorage.getItem("teachgrid_active_id");

        if (savedFiles) {
            setFiles(JSON.parse(savedFiles));
        } else {
            // Default initial state if none saved
            setFiles([
                {
                    id: "src",
                    name: "src",
                    isDir: true,
                    isOpen: true,
                    children: [
                        { id: "app-jsx", name: "App.jsx", isDir: false, content: 'export default function App() {\n  return <h1>Hello from App.jsx</h1>\n}' },
                        { id: "main-py", name: "main.py", isDir: false, content: 'print("Hello from Python in TeachGrid!")' },
                        { id: "main-java", name: "Main.java", isDir: false, content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java in TeachGrid!");\n    }\n}' },
                        { id: "hello-c", name: "hello.c", isDir: false, content: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C in TeachGrid!\\n");\n    return 0;\n}' }
                    ]
                }
            ]);
        }
        if (savedOpenFiles) setOpenFiles(JSON.parse(savedOpenFiles));
        if (savedActiveId) setActiveFileId(savedActiveId);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Command Palette: Ctrl+Shift+P
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
            // Quick Open: Ctrl+P
            else if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
            // Toggle Sidebar: Ctrl+B
            else if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                setIsSidebarVisible(prev => !prev);
            }
            // Run Code: F5 or Ctrl+Enter
            else if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                handleRunCode();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleRunCode]); // Dependencies might need update if handleRunCode changes

    useEffect(() => {
        if (files.length === 0) return; // Wait for load or first init
        setIsSaving(true);
        const timeoutId = setTimeout(() => {
            localStorage.setItem("teachgrid_files", JSON.stringify(files));
            localStorage.setItem("teachgrid_open_files", JSON.stringify(openFiles));
            localStorage.setItem("teachgrid_active_id", activeFileId || "");
            setIsSaving(false);
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [files, openFiles, activeFileId]);


    /* ================= SOCKET ================= */

    const activeTerminalIdRef = useRef(activeTerminalId);
    useEffect(() => {
        activeTerminalIdRef.current = activeTerminalId;
    }, [activeTerminalId]);

    useEffect(() => {
        socketRef.current = io(BACKEND_URL);

        socketRef.current.on("connect", () => {
            console.log("[Socket] Connected to backend");
            // Initialize PTY session
            socketRef.current.emit("terminal:init");
        });

        socketRef.current.on("connect_error", (err) => {
            console.error("[Socket] Connection error:", err);
        });

        socketRef.current.on("output", data => {
            // Check if it's a run code output or terminal output?
            // "execute" uses "output" event.
            // We should ideally separate them, but for now append to terminal.
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalIdRef.current ? { ...t, output: [...t.output, data] } : t
            ));
        });

        // Handle PTY output (streaming raw data)
        socketRef.current.on("terminal:output", data => {
            console.log("[Terminal Output]", data);
            const lines = data.toString().split(/\r?\n/).map(stripAnsi);
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalIdRef.current ? { ...t, output: [...t.output, ...lines] } : t
            ));
        });



        socketRef.current.on("execution_complete", () => {
            setIsExecuting(false);
        });

        socketRef.current.on("error", errorMsg => {
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalIdRef.current ? { ...t, output: [...t.output, `\n❌ Error: ${errorMsg}\n`] } : t
            ));
            setIsExecuting(false);
        });

        return () => socketRef.current.disconnect();
    }, []);

    // ...



    /* ================= FILE TREE ================= */

    /* ================= HELPERS ================= */

    const addItem = (items, parentId, newItem) => {
        if (!parentId) return [...items, newItem];
        return items.map(item => {
            if (item.id === parentId && item.isDir) {
                return { ...item, isOpen: true, children: [...(item.children || []), newItem] };
            }
            if (item.children) {
                return { ...item, children: addItem(item.children, parentId, newItem) };
            }
            return item;
        });
    };

    const deleteItem = (items, itemId) => {
        return items
            .filter(item => item.id !== itemId)
            .map(item => {
                if (item.children) return { ...item, children: deleteItem(item.children, itemId) };
                return item;
            });
    };

    const toggleFolderRecursive = (items, folderId) => {
        return items.map(item => {
            if (item.id === folderId && item.isDir) return { ...item, isOpen: !item.isOpen };
            if (item.children) return { ...item, children: toggleFolderRecursive(item.children, folderId) };
            return item;
        });
    };

    const renameItemRecursive = (items, id, newName) => {
        return items.map(item => {
            if (item.id === id) return { ...item, name: newName };
            if (item.children) return { ...item, children: renameItemRecursive(item.children, id, newName) };
            return item;
        });
    };

    const handleRenameCommit = (id, newName) => {
        setFiles(prev => renameItemRecursive(prev, id, newName));
        // If it's an open file, update its name in openFiles too
        setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        setEditingId(null);
    };

    const handleRenameCancel = () => {
        setEditingId(null);
    };

    const openFile = file => {
        if (!openFiles.find(f => f.id === file.id)) {
            setOpenFiles(prev => [...prev, file]);
        }
        setActiveFileId(file.id);
    };

    const closeFile = (e, id) => {
        e.stopPropagation();
        const rest = openFiles.filter(f => f.id !== id);
        setOpenFiles(rest);
        if (id === activeFileId) {
            setActiveFileId(rest.length ? rest[rest.length - 1].id : null);
        }
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const getPathFromId = (items, id) => {
        if (!id) return [];
        for (const item of items) {
            if (item.id === id) return [item.name];
            if (item.children) {
                const path = getPathFromId(item.children, id);
                if (path) return [item.name, ...path];
            }
        }
        return null;
    };

    const handleCreateItem = (isDir) => {
        const name = prompt(`Enter ${isDir ? 'folder' : 'file'} name:`);
        if (!name) return;
        const newItem = {
            id: generateId(),
            name,
            isDir,
            isOpen: isDir,
            children: isDir ? [] : undefined,
            content: isDir ? undefined : ""
        };
        setFiles(prev => addItem(prev, selectedFolderId, newItem));

        // Sync to backend
        const parentPathArr = getPathFromId(files, selectedFolderId) || [];
        const fullPath = [...parentPathArr, name].join('/');

        if (socketRef.current?.connected) {
            if (isDir) {
                // Use terminal command for mkdir (works in cmd/bash usually)
                // Quote path for safety
                socketRef.current.emit("terminal:input", `mkdir "${fullPath}"\n`);
            } else {
                // Use file API for files
                socketRef.current.emit("file:save", { path: fullPath, content: "" });
            }
        }
    };

    const handleContextAction = (actionId, item) => {
        if (actionId === 'rename') setEditingId(item.id);
        if (actionId === 'delete') {
            if (window.confirm(`Delete ${item.name}?`)) {
                setFiles(prev => deleteItem(prev, item.id));
                setOpenFiles(prev => prev.filter(f => f.id !== item.id));
            }
        }
        if (actionId === 'new-file') {
            setSelectedFolderId(item.id);
            handleCreateItem(false);
        }
        if (actionId === 'new-folder') {
            setSelectedFolderId(item.id);
            handleCreateItem(true);
        }
        if (actionId === 'copy-path') {
            navigator.clipboard.writeText(item.name);
        }
    };

    const commands = [
        { id: 'run', label: 'Run Code', icon: <Play size={14} />, shortcut: 'F5', action: handleRunCode },
        { id: 'preview', label: 'Toggle Web Preview', icon: <Eye size={14} />, shortcut: 'Ctrl+Shift+P', action: () => setShowPreview(!showPreview) },
        { id: 'new-file', label: 'New File', icon: <FilePlus size={14} />, shortcut: 'Alt+N', action: () => handleCreateItem(false) },
        { id: 'new-folder', label: 'New Folder', icon: <FolderPlus size={14} />, shortcut: 'Alt+Shift+N', action: () => handleCreateItem(true) },
        { id: 'sidebar', label: 'Toggle Sidebar', icon: <ChevronRight size={14} />, shortcut: 'Ctrl+B', action: () => setIsSidebarVisible(!isSidebarVisible) },
        { id: 'settings', label: 'Open Settings', icon: <Settings size={14} />, shortcut: 'Ctrl+,', action: () => alert('Settings coming soon!') },
    ];

    const renderTree = (items, level = 0) =>
        items.map(item => (
            <div key={item.id}>
                <div
                    className={`file-tree-row ${activeFileId === item.id ? "active" : ""
                        } ${selectedFolderId === item.id ? "selected" : ""}`}
                    style={{ paddingLeft: `${level * 14 + 12}px` }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onClick={() => {
                        if (item.isDir) {
                            setFiles(prev => toggleFolderRecursive(prev, item.id));
                            setSelectedFolderId(item.id);
                        } else {
                            openFile(item);
                        }
                    }}
                >
                    <FileTreeItem
                        name={item.name}
                        isDir={item.isDir}
                        isOpen={item.isOpen}
                        isEditing={editingId === item.id}
                        onCommit={(newName) => handleRenameCommit(item.id, newName)}
                        onCancel={handleRenameCancel}
                    />
                </div>

                {item.isDir && item.isOpen && item.children && (
                    <div className="tree-children">{renderTree(item.children, level + 1)}</div>
                )}
            </div>
        ));

    /* ================= TERMINAL ================= */

    const getCurrentItems = (items, pathStack) => {
        if (pathStack.length === 0) return items;
        let currentItems = items;
        for (const folderName of pathStack) {
            const folder = currentItems.find(i => i.name === folderName && i.isDir);
            if (folder) currentItems = folder.children || [];
            else return [];
        }
        return currentItems;
    };

    const getCurrentFolderId = (items, pathStack) => {
        if (pathStack.length === 0) return null;
        let currentItems = items;
        let currentId = null;
        for (const folderName of pathStack) {
            const folder = currentItems.find(i => i.name === folderName && i.isDir);
            if (folder) {
                currentId = folder.id;
                currentItems = folder.children || [];
            } else return undefined;
        }
        return currentId;
    };

    const addTerminal = () => {
        const id = generateId();
        const newTerm = { id, title: `terminal ${terminals.length + 1}`, output: [] };
        setTerminals([...terminals, newTerm]);
        setActiveTerminalId(id);
    };

    const closeTerminal = (e, id) => {
        e.stopPropagation();
        if (terminals.length === 1) return;
        const rest = terminals.filter(t => t.id !== id);
        setTerminals(rest);
        if (id === activeTerminalId) {
            setActiveTerminalId(rest[0].id);
        }
    };

    const handleTerminalCommand = cmd => {
        const rawCmd = cmd.trim();
        if (!rawCmd) return;

        // Visual Echo
        const pathString = `~${currentPath.length > 0 ? '/' + currentPath.join('/') : ''}`;
        setTerminals(prev => prev.map(t =>
            t.id === activeTerminalId ? { ...t, output: [...t.output, `➜  ${pathString} ${rawCmd}`] } : t
        ));

        // Parse command
        // Basic parsing for "cd foo", "mkdir bar"
        const parts = rawCmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const command = parts[0]?.toLowerCase();
        const args = parts.slice(1).map(a => a.startsWith('"') && a.endsWith('"') ? a.slice(1, -1) : a);
        const fileName = args[0];

        const items = getCurrentItems(files, currentPath);

        // --- Local Navigation (Simulated) ---
        if (['ls', 'dir', 'll'].includes(command)) {
            const output = items.map(f => f.name + (f.isDir ? '/' : '')).join('  ');
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalId ? { ...t, output: [...t.output, output || '(empty)'] } : t
            ));
            return;
        }

        if (command === 'cd') {
            if (!args[0] || args[0] === '~') {
                setCurrentPath([]);
                // Sync backend to root (if possible, or just emit cd ~ aka cd projectroot?)
                // Backend is jailed to project root.
                // Assuming backend root == virtual root.
                // Emit nothing or 'cd /'? 'cd' in windows prints cwd.
                // We assume backend starts at root. If we are at root, do nothing?
                // Or best effort emit.
                if (socketRef.current?.connected) socketRef.current.emit("terminal:input", "cd " + (socketRef.current.projectRoot || ".") + "\n");
                return;
            }
            if (args[0] === '..') {
                setCurrentPath(prev => prev.slice(0, -1));
                if (socketRef.current?.connected) socketRef.current.emit("terminal:input", "cd ..\n");
                return;
            }
            const target = items.find(i => i.name === args[0] && i.isDir);
            if (target) {
                setCurrentPath(prev => [...prev, args[0]]);
                if (socketRef.current?.connected) socketRef.current.emit("terminal:input", `cd "${args[0]}"\n`);
            } else {
                setTerminals(prev => prev.map(t =>
                    t.id === activeTerminalId ? { ...t, output: [...t.output, `cd: no such directory: ${args[0]}`] } : t
                ));
            }
            return;
        }

        if (['clear', 'cls'].includes(command)) {
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalId ? { ...t, output: [] } : t
            ));
            return;
        }

        // --- Local File Management (Optional: update UI + Sync) ---
        // If user creates file in terminal, we want it to show in Explorer.
        if (command === 'mkdir' && args[0]) {
            const newItem = { id: generateId(), name: args[0], isDir: true, isOpen: true, children: [] };
            setFiles(prev => addItem(prev, getCurrentFolderId(files, currentPath), newItem));
            if (socketRef.current?.connected) socketRef.current.emit("terminal:input", rawCmd + '\n');
            return;
        }
        if (command === 'touch' && args[0]) {
            const newItem = { id: generateId(), name: args[0], isDir: false, content: "" };
            setFiles(prev => addItem(prev, getCurrentFolderId(files, currentPath), newItem));
            // For touch, on windows 'type nul > filename' or just emit raw?
            // 'touch' isn't windows CMD. 'TerminalManager' had alias logic? No.
            // Backend uses shell. Powershell has touch (ni). CMD doesn't.
            // If backend is CMD, 'touch' fails.
            // If I want to support 'touch' backend, I should alias it in TerminalManager.
            // But for now, UI update is key. Backend sync might fail if command unknown.
            // I'll emit anyway.
            if (socketRef.current?.connected) socketRef.current.emit("terminal:input", rawCmd + '\n');
            return;
        }

        // --- Everything else: Pass-through (git, npm, python, etc) ---
        if (socketRef.current?.connected) {
            socketRef.current.emit("terminal:input", rawCmd + '\n');
        } else {
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminalId ? { ...t, output: [...t.output, "Error: disconnected"] } : t
            ));
        }
    };





    const saveFile = () => {
        if (!activeFileId) return;
        const file = openFiles.find(f => f.id === activeFileId);
        if (!file) return;

        const pathArr = getPathFromId(files, activeFileId);
        if (pathArr) {
            const fullPath = pathArr.join('/');
            if (socketRef.current?.connected) {
                socketRef.current.emit("file:save", { path: fullPath, content: file.content });
                console.log("[IDELayout] Saved file:", fullPath);
                // Optional: Add visual indicator
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveFile();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFileId, files, openFiles]);

    /* ================= RENDER ================= */

    return (
        <div className="ide-root">
            <MenuBar onRun={handleRunCode} />

            <div className="ide-workspace">
                <ActivityBar
                    activeView={activeSidebarView}
                    onViewChange={setActiveSidebarView}
                    modules={modules}
                />

                {isSidebarVisible && (
                    <div className="ide-sidebar">
                        <div className="sidebar-header">
                            <span>{modules.find(m => m.id === activeSidebarView)?.title || 'VIEW'}</span>
                            {activeSidebarView === 'explorer' && (
                                <div className="sidebar-actions">
                                    <FilePlus size={16} onClick={() => handleCreateItem(false)} title="New File" />
                                    <FolderPlus size={16} onClick={() => handleCreateItem(true)} title="New Folder" />
                                    <FolderOpenIcon size={16} onClick={() => setSelectedFolderId(null)} title="Collapse Selection" />
                                </div>
                            )}
                        </div>

                        {activeSidebarView === "explorer" && (
                            <div className="sidebar-tree">{renderTree(files)}</div>
                        )}

                        {activeSidebarView === "search" && (
                            <SearchView files={files} onFileOpen={openFile} />
                        )}

                        {activeSidebarView === "database" && (
                            <DBExplorer onSelectTable={(id, db, table) => setActiveDB({ id, db, table })} />
                        )}

                        {/* Placeholder for dynamic modules */}
                        {!['explorer', 'search', 'database'].includes(activeSidebarView) && (
                            <div className="empty-editor" style={{ opacity: 0.5, fontSize: '13px', padding: 20 }}>
                                <Package size={40} style={{ marginBottom: 10 }} />
                                <div>{activeSidebarView.toUpperCase()} Module Loaded</div>
                                <div style={{ fontSize: '11px', marginTop: 10 }}>This is a dynamic placeholder for the newly added module.</div>
                            </div>
                        )}
                    </div>
                )}

                <div className="ide-main">
                    {/* Tabs */}
                    <div className="ide-tabs">
                        {openFiles.map(file => (
                            <div
                                key={file.id}
                                className={`ide-tab ${file.id === activeFileId ? "active" : ""
                                    }`}
                                onClick={() => setActiveFileId(file.id)}
                            >
                                <FileIcon name={file.name} size={14} />
                                <span className="tab-name">{file.name}</span>
                                <X size={14} onClick={e => closeFile(e, file.id)} />
                            </div>
                        ))}
                    </div>

                    {/* Breadcrumb */}
                    <div className="ide-breadcrumbs">
                        <span>src</span>
                        <ChevronRight size={12} />
                        <span>{activeFile ? activeFile.name : "No file"}</span>

                        <div className="editor-actions">
                            {['jsx', 'js', 'html'].includes(activeFile?.name.split('.').pop().toLowerCase()) && (
                                <div onClick={() => setShowPreview(!showPreview)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    {showPreview ? <EyeOff size={14} color="var(--accent)" /> : <Eye size={14} />}
                                </div>
                            )}
                            {isExecuting ? (
                                <div style={{ cursor: 'not-allowed', display: 'flex' }} title="Execution in progress...">
                                    <div className="spinner" style={{
                                        width: '14px', height: '14px', border: '2px solid var(--text-secondary)',
                                        borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite'
                                    }}></div>
                                </div>
                            ) : (
                                <Play size={14} onClick={handleRunCode} title="Run Code (F5)" style={{ cursor: 'pointer' }} />
                            )}
                            <Save size={14} onClick={saveFile} style={{ cursor: 'pointer' }} title="Save (Ctrl+S)" />
                            <MoreHorizontal size={14} />
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* Editor */}
                        <div className="ide-editor-content" style={{ flex: showPreview || activeDB ? 1 : '1 0 100%' }}>
                            {activeFile ? (
                                <CodeEditor
                                    activeFile={activeFile}
                                    onCodeChange={code => {
                                        // Update tab state
                                        setOpenFiles(prev =>
                                            prev.map(f =>
                                                f.id === activeFileId ? { ...f, content: code } : f
                                            )
                                        );
                                        // Update main file tree state
                                        const updateItemRecursive = (items, id, newCode) => {
                                            return items.map(item => {
                                                if (item.id === id) return { ...item, content: newCode };
                                                if (item.children) return { ...item, children: updateItemRecursive(item.children, id, newCode) };
                                                return item;
                                            });
                                        };
                                        setFiles(prev => updateItemRecursive(prev, activeFileId, code));
                                    }}
                                />
                            ) : (
                                <div className="empty-editor">Open a file to start coding</div>
                            )}
                        </div>

                        {/* Database Result Pane */}
                        {activeDB && (
                            <div style={{
                                flex: 1,
                                borderLeft: '1px solid var(--border-main)',
                                background: 'var(--vscode-editor-background)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <QueryPane
                                    connectionId={activeDB.id}
                                    dbName={activeDB.db}
                                    tablename={activeDB.table}
                                    onClose={() => setActiveDB(null)}
                                />
                            </div>
                        )}

                        {/* Web Preview */}
                        {showPreview && activeFile && (
                            <div style={{
                                flex: 1,
                                borderLeft: '1px solid var(--border-main)',
                                background: 'white'
                            }}>
                                <WebPreview
                                    fileName={activeFile.name}
                                    content={activeFile.content}
                                    files={files}
                                />
                            </div>
                        )}
                    </div>

                    {/* Bottom Panel */}
                    <div className="ide-panel">
                        <div className="panel-tabs">
                            <div className="panel-tabs-main">
                                {["PROBLEMS", "OUTPUT", "TERMINAL"].map(t => (
                                    <div
                                        key={t}
                                        className={`panel-tab ${activePanel === t.toLowerCase() ? "active" : ""
                                            }`}
                                        onClick={() => setActivePanel(t.toLowerCase())}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>

                            {activePanel === "terminal" && (
                                <div className="terminal-tabs">
                                    {terminals.map(t => (
                                        <div
                                            key={t.id}
                                            className={`terminal-tab ${t.id === activeTerminalId ? "active" : ""}`}
                                            onClick={() => setActiveTerminalId(t.id)}
                                        >
                                            <span className="term-title">{t.title}</span>
                                            <X size={12} onClick={(e) => closeTerminal(e, t.id)} />
                                        </div>
                                    ))}
                                    <div className="add-terminal" onClick={addTerminal}>+</div>
                                </div>
                            )}
                        </div>

                        <div className="panel-content">
                            {activePanel === "terminal" && (
                                <Terminal
                                    output={terminals.find(t => t.id === activeTerminalId)?.output || []}
                                    onCommand={handleTerminalCommand}
                                    path={`~${currentPath.length > 0 ? '/' + currentPath.join('/') : ''}`}
                                    isExecuting={isExecuting}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <StatusBar
                language={activeFile ? getFileLanguage(activeFile.name) : "No File"}
                isExecuting={isExecuting}
                isSaving={isSaving}
            />

            {/* Command Palette */}
            {isCommandPaletteOpen && (
                <CommandPalette
                    commands={commands}
                    onClose={() => setIsCommandPaletteOpen(false)}
                    onExecute={(cmd) => {
                        cmd.action();
                        setIsCommandPaletteOpen(false);
                    }}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    onAction={handleContextAction}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
