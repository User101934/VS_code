import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Play, RefreshCw, X, ChevronDown, ChevronUp, Plus, Check, Trash2 } from 'lucide-react';
import './dbExplorer.css';

export default function QueryPane({ connectionId, dbName, tablename, onClose }) {
    const [query, setQuery] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEditor, setShowEditor] = useState(true);
    const [editingCell, setEditingCell] = useState(null); // { rowIndex, colName }
    const [pendingChanges, setPendingChanges] = useState({}); // { rowIndex: { delta: {}, identity: {}, isNew: boolean } }
    const [isSaved, setIsSaved] = useState(false);

    const storageKey = `sql_query_${connectionId}_${dbName || 'global'}_${tablename || 'schema'}`;

    useEffect(() => {
        const savedQuery = localStorage.getItem(storageKey);
        if (savedQuery) {
            setQuery(savedQuery);
            // If it's a table view and it's the first time, fetch data
            if (tablename && savedQuery.toUpperCase().includes('SELECT')) {
                fetchData(savedQuery);
            }
        } else if (tablename) {
            const initialQuery = tablename.includes('.')
                ? `SELECT * FROM ${tablename} LIMIT 50`
                : `SELECT * FROM \`${dbName}\`.\`${tablename}\` LIMIT 50`;
            setQuery(initialQuery);
            fetchData(initialQuery);
        } else if (dbName) {
            setQuery(`-- SQL Console for database: ${dbName}\n-- You can run CREATE TABLE or other management queries here.\n\n`);
            setData([]);
            setError(null);
        } else if (connectionId) {
            setQuery(`-- Global SQL Console\n-- You can run CREATE DATABASE or server-level commands here.\n\n`);
            setData([]);
            setError(null);
        }
    }, [connectionId, dbName, tablename]);

    // Auto-save logic
    useEffect(() => {
        if (!query) return;
        const timer = setTimeout(() => {
            localStorage.setItem(storageKey, query);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        }, 1000);
        return () => clearTimeout(timer);
    }, [query, storageKey]);

    const fetchData = async (overrideQuery) => {
        const queryToRun = overrideQuery || query;
        if (!queryToRun) return;

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:3001/api/db/${connectionId}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: { dbName, collectionName: tablename, operation: 'find', params: [{}] },
                    query: queryToRun
                })
            });
            const result = await response.json();
            if (response.ok) {
                setData(Array.isArray(result) ? result : [result]);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setPendingChanges({});
        }
    };

    const handleCellChange = (rowIndex, colName, value) => {
        const row = data[rowIndex];
        const change = pendingChanges[rowIndex] || { delta: {}, identity: {}, isNew: false };

        if (!change.isNew && Object.keys(change.identity).length === 0) {
            const identityFields = ['_id', 'id', 'ID', 'uuid'];
            identityFields.forEach(f => { if (row[f] !== undefined) change.identity[f] = row[f]; });
            if (Object.keys(change.identity).length === 0) Object.assign(change.identity, row);
        }

        setPendingChanges(prev => ({
            ...prev,
            [rowIndex]: {
                ...change,
                delta: { ...change.delta, [colName]: value }
            }
        }));
    };

    const saveRow = async (rowIndex) => {
        const change = pendingChanges[rowIndex];
        if (!change) return;

        setLoading(true);
        try {
            const endpoint = change.isNew ? 'insert' : 'update';
            const body = change.isNew
                ? { dbName, tableName: tablename, record: change.delta }
                : { dbName, tableName: tablename, identity: change.identity, delta: change.delta };

            const response = await fetch(`http://localhost:3001/api/db/${connectionId}/${endpoint}`, {
                method: change.isNew ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchData();
            } else {
                const res = await response.json();
                alert(`Error: ${res.message}`);
                setLoading(false);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
            setLoading(false);
        }
    };

    const insertNewRow = () => {
        if (!tablename) return;
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        const emptyRow = columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});

        setData([emptyRow, ...data]);
        setPendingChanges(prev => {
            const nextPending = {};
            // Shift existing pending changes down
            Object.keys(prev).forEach(idx => {
                nextPending[parseInt(idx) + 1] = prev[idx];
            });
            nextPending[0] = { delta: emptyRow, identity: {}, isNew: true };
            return nextPending;
        });
    };

    const deleteRow = async (rowIndex) => {
        if (pendingChanges[rowIndex]?.isNew) {
            setData(prev => prev.filter((_, i) => i !== rowIndex));
            const nextPending = {};
            Object.keys(pendingChanges).forEach(idx => {
                const i = parseInt(idx);
                if (i < rowIndex) nextPending[i] = pendingChanges[i];
                if (i > rowIndex) nextPending[i - 1] = pendingChanges[i];
            });
            setPendingChanges(nextPending);
            return;
        }

        if (!window.confirm('Delete this record?')) return;

        const row = data[rowIndex];
        const identityFields = ['_id', 'id', 'ID', 'uuid'];
        const identity = {};
        identityFields.forEach(f => { if (row[f] !== undefined) identity[f] = row[f]; });
        if (Object.keys(identity).length === 0) Object.assign(identity, row);

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/db/${connectionId}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbName, tableName: tablename, identity })
            });
            if (response.ok) await fetchData();
            else alert('Delete failed');
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!tablename && !dbName) return null;

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <div className="query-pane" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
            borderLeft: '1px solid var(--vscode-panel-border)', overflow: 'hidden'
        }}>
            <div className="query-pane-header" style={{
                padding: '10px', display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-sideBar-background)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' }}>
                        {tablename ? `Table: ${tablename}` : (dbName ? `Database: ${dbName}` : 'Global Console')}
                    </span>
                    {isSaved && <span style={{ fontSize: '10px', color: '#4caf50', opacity: 0.8 }}>● Auto-saved</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => fetchData()} className="db-action-btn" title="Run Query (F5)">
                        <Play size={14} fill="currentColor" color="#4caf50" stroke="#4caf50" />
                    </button>
                    <button onClick={() => setShowEditor(!showEditor)} className="db-action-btn" title="Toggle Editor">
                        {showEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={onClose} className="db-action-btn" title="Close"><X size={14} /></button>
                </div>
            </div>

            {showEditor && (
                <div style={{ height: '200px', flexShrink: 0, borderBottom: '1px solid var(--vscode-panel-border)', position: 'relative' }}>
                    <Editor height="100%" language="sql" theme="vs-dark" value={query} onChange={setQuery}
                        options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "on", scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 10 } }} />
                </div>
            )}

            <div className="query-pane-content" style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', fontSize: '10px', opacity: 0.5 }}>
                    <span style={{ fontWeight: 600 }}>RESULTS {data.length > 0 ? `(${data.length} ROWS)` : ''}</span>
                    {tablename && (
                        <button onClick={insertNewRow} className="db-action-btn" title="Insert New Row" style={{ color: '#4caf50', opacity: 1, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Plus size={12} /> ADD ROW
                        </button>
                    )}
                </div>

                {loading && <div style={{ padding: 20 }}>Processing...</div>}
                {error && <div style={{ padding: 20, color: 'rgb(244, 71, 71)', fontSize: '13px', background: 'rgba(244, 71, 71, 0.1)' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error}</pre>
                </div>}

                {!loading && !error && data.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: 'var(--vscode-list-hoverBackground)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '8px', borderRight: '1px solid var(--vscode-panel-border)', width: '60px' }}>Actions</th>
                                {columns.map(col => (
                                    <th key={col} style={{ padding: '10px 12px', borderRight: '1px solid var(--vscode-panel-border)', textAlign: 'left', fontWeight: 600 }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => {
                                const isNew = pendingChanges[i]?.isNew;
                                const isModified = pendingChanges[i] && !isNew;
                                return (
                                    <tr key={i} style={{
                                        borderBottom: '1px solid var(--vscode-panel-border)',
                                        background: isNew ? 'rgba(76, 175, 80, 0.1)' : (isModified ? 'rgba(255, 193, 7, 0.1)' : 'transparent')
                                    }}>
                                        <td style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid var(--vscode-panel-border)' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                {pendingChanges[i] ? (
                                                    <button onClick={() => saveRow(i)} className="db-grid-btn" style={{ color: '#4caf50', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Save"><Check size={14} /></button>
                                                ) : null}
                                                <button onClick={() => deleteRow(i)} className="db-grid-btn" style={{ color: '#f44336', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                        {columns.map(col => {
                                            const isEditing = editingCell?.rowIndex === i && editingCell?.colName === col;
                                            const displayValue = pendingChanges[i]?.delta[col] !== undefined ? pendingChanges[i].delta[col] : row[col];
                                            return (
                                                <td key={col} onDoubleClick={() => setEditingCell({ rowIndex: i, colName: col })}
                                                    style={{ padding: '8px 12px', borderRight: '1px solid var(--vscode-panel-border)', cursor: 'text' }}>
                                                    {isEditing ? (
                                                        <input autoFocus style={{ width: '100%', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: 'none', outline: '1px solid var(--vscode-focusBorder)' }}
                                                            value={typeof displayValue === 'object' ? JSON.stringify(displayValue) : displayValue}
                                                            onBlur={() => setEditingCell(null)}
                                                            onChange={(e) => handleCellChange(i, col, e.target.value)}
                                                        />
                                                    ) : (
                                                        <span style={{ opacity: pendingChanges[i]?.delta[col] !== undefined ? 1 : 0.8 }}>
                                                            {typeof displayValue === 'object' ? JSON.stringify(displayValue) : String(displayValue)}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
