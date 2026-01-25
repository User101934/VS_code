import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, ChevronRight, ChevronDown, Table, Layers, Trash2 } from 'lucide-react';
import './dbExplorer.css';

export default function DBExplorer({ onSelectTable }) {
    const [connections, setConnections] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newUri, setNewUri] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCreateDbModal, setShowCreateDbModal] = useState(null); // connectionId
    const [showCreateTableModal, setShowCreateTableModal] = useState(null); // { connectionId, dbName }
    const [newDbName, setNewDbName] = useState('');
    const [newTableName, setNewTableName] = useState('');

    const connectDB = async () => {
        if (!newUri) return;
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/db/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uri: newUri })
            });
            const data = await response.json();
            if (data.success) {
                setConnections([...connections, { ...data, expanded: false, metadata: [] }]);
                setNewUri('');
                setShowModal(false);
                // Workbench Style: Auto-open console on connect
                onSelectTable(data.id, null, null);
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to connect: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshMetadata = async (id) => {
        const response = await fetch(`http://localhost:3001/api/db/${id}/explore`);
        const metadata = await response.json();
        setConnections(prev => prev.map(c => c.id === id ? { ...c, metadata } : c));
    };

    const toggleConnection = async (id) => {
        const updated = await Promise.all(connections.map(async (conn) => {
            if (conn.id === id) {
                const isExpanding = !conn.expanded;
                let metadata = conn.metadata;
                if (isExpanding && metadata.length === 0) {
                    const response = await fetch(`http://localhost:3001/api/db/${id}/explore`);
                    metadata = await response.json();
                }
                return { ...conn, expanded: isExpanding, metadata };
            }
            return conn;
        }));
        setConnections(updated);
    };

    const createDatabase = async () => {
        if (!newDbName || !showCreateDbModal) return;
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/db/${showCreateDbModal}/create-db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbName: newDbName })
            });
            const data = await response.json();
            if (data.success) {
                await refreshMetadata(showCreateDbModal);
                setNewDbName('');
                setShowCreateDbModal(null);
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to create database: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createTable = async () => {
        if (!newTableName || !showCreateTableModal) return;
        const { connectionId, dbName } = showCreateTableModal;
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/db/${connectionId}/create-table`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbName, tableName: newTableName })
            });
            const data = await response.json();
            if (data.success) {
                await refreshMetadata(connectionId);
                setNewTableName('');
                setShowCreateTableModal(null);
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to create table: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const removeConnection = async (e, id) => {
        e.stopPropagation();
        await fetch(`http://localhost:3001/api/db/${id}`, { method: 'DELETE' });
        setConnections(connections.filter(c => c.id !== id));
    };

    return (
        <div className="db-explorer">
            <div className="db-explorer-header">
                <h4>Database Explorer</h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="db-action-btn" onClick={() => setShowModal(true)} title="Add Connection">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="db-connections-list">
                {connections.map(conn => (
                    <div key={conn.id} className="db-connection-item">
                        <div className="db-connection-header" style={{ cursor: 'default' }}>
                            <div onClick={() => toggleConnection(conn.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                {conn.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <div onClick={() => onSelectTable(conn.id, null, null)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                <Database size={16} />
                                <span style={{ fontSize: '11px', fontWeight: 500 }}>{conn.type.toUpperCase()} - {conn.uri.split('@')[1] || conn.id}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Plus size={14} className="db-action-btn" onClick={(e) => { e.stopPropagation(); setShowCreateDbModal(conn.id); }} title="New Database" />
                                <RefreshCw size={14} className="db-action-btn" onClick={(e) => { e.stopPropagation(); refreshMetadata(conn.id); }} title="Refresh" />
                                <Trash2 size={14} className="db-action-btn" onClick={(e) => removeConnection(e, conn.id)} title="Remove Connection" />
                            </div>
                        </div>
                        {conn.expanded && (
                            <div className="db-connection-children">
                                {conn.metadata.map((db, idx) => (
                                    <div key={idx}>
                                        <div className="db-item" style={{ display: 'flex', justifyContent: 'space-between' }} onClick={() => onSelectTable(conn.id, db.name, null)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Layers size={14} />
                                                <span style={{ fontWeight: 600 }}>{db.name}</span>
                                            </div>
                                            <Plus size={12} className="db-small-btn" onClick={(e) => { e.stopPropagation(); setShowCreateTableModal({ connectionId: conn.id, dbName: db.name }); }} title="New Table/Collection" />
                                        </div>
                                        <div style={{ paddingLeft: 15 }}>
                                            {db.children?.map((child, cIdx) => (
                                                <div key={cIdx} className="db-item" onClick={() => onSelectTable(conn.id, db.name, child.name)}>
                                                    <Table size={14} />
                                                    <span>{child.name}</span>
                                                </div>
                                            ))}
                                            {(!db.children || db.children.length === 0) && (
                                                <div style={{ padding: '4px 12px', fontSize: '10px', opacity: 0.5 }}>No tables found. Click + to create.</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {conn.metadata.length === 0 && (
                                    <div style={{ padding: '8px 25px', fontSize: '11px', opacity: 0.5 }}>Empty or Unauthorized</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modals */}
            {showModal && (
                <div className="db-modal-overlay">
                    <div className="db-modal">
                        <h3>Connect to Database</h3>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Enter a connection string (MongoDB, PG, or MySQL)</p>
                        <input className="db-input" placeholder="mongodb+srv://..." value={newUri} onChange={(e) => setNewUri(e.target.value)} autoFocus />
                        <div className="db-modal-actions">
                            <button className="db-btn db-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="db-btn db-btn-primary" onClick={connectDB} disabled={loading}>Connect</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateDbModal && (
                <div className="db-modal-overlay">
                    <div className="db-modal">
                        <h3>Create New Database</h3>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Enter the name for your new database/schema</p>
                        <input className="db-input" placeholder="database_name" value={newDbName} onChange={(e) => setNewDbName(e.target.value)} autoFocus />
                        <div className="db-modal-actions">
                            <button className="db-btn db-btn-secondary" onClick={() => setShowCreateDbModal(null)}>Cancel</button>
                            <button className="db-btn db-btn-primary" onClick={createDatabase} disabled={loading}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateTableModal && (
                <div className="db-modal-overlay">
                    <div className="db-modal">
                        <h3>Create New Table / Collection</h3>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Enter Table or Collection name for <strong>{showCreateTableModal.dbName}</strong></p>
                        <input className="db-input" placeholder="table_name" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} autoFocus />
                        <div className="db-modal-actions">
                            <button className="db-btn db-btn-secondary" onClick={() => setShowCreateTableModal(null)}>Cancel</button>
                            <button className="db-btn db-btn-primary" onClick={createTable} disabled={loading}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
