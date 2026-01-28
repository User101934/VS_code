import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

class StorageService {
    async init() {
        // 1. Connect to default 'postgres' to ensure the target DB exists
        const adminPool = new Pool({
            connectionString: process.env.DATABASE_URL.replace('/teachgrid_autosave', '/postgres')
        });

        const adminClient = await adminPool.connect();
        try {
            const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname='teachgrid_autosave'");
            if (res.rowCount === 0) {
                console.log('[StorageService] Creating database teachgrid_autosave...');
                await adminClient.query('CREATE DATABASE teachgrid_autosave');
            }
        } finally {
            adminClient.release();
            await adminPool.end();
        }

        // 2. Initialize tables in the target DB
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS workspace_files (
                    path TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    content TEXT,
                    is_dir BOOLEAN NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('[StorageService] PostgreSQL Table initialized');

            // 3. Migration: If DB is empty, sync from local disk
            const rowCheck = await client.query('SELECT count(*) FROM workspace_files');
            console.log(`[StorageService] Current DB row count: ${rowCheck.rows[0].count}`);
            if (parseInt(rowCheck.rows[0].count) <= 1) { // Allow 1 for partial previous attempts
                console.log('[StorageService] Starting disk-to-DB migration...');
                const projectRoot = path.join(os.tmpdir(), 'teachgrid-workspace');
                if (fs.existsSync(projectRoot)) {
                    await this.migrateFromDisk(projectRoot, '');
                    console.log('[StorageService] Migration complete!');
                } else {
                    console.log('[StorageService] Temp workspace not found at', projectRoot);
                }
            }
        } catch (err) {
            console.error('[StorageService] Initialization error stack:', err.stack);
            throw err;
        } finally {
            client.release();
        }
    }

    async migrateFromDisk(absPath, relPath) {
        const items = fs.readdirSync(absPath);
        for (const item of items) {
            try {
                const itemAbs = path.join(absPath, item);
                const itemRel = relPath ? `${relPath}/${item}` : item;
                console.log(`[Migration] Processing: ${itemRel}`);
                const stats = fs.statSync(itemAbs);
                const isDir = stats.isDirectory();

                let content = null;
                if (!isDir) {
                    content = fs.readFileSync(itemAbs, 'utf8');
                }

                await this.saveFile(itemRel, item, content, isDir);
                console.log(`[Migration] Synced: ${itemRel}`);

                if (isDir) {
                    await this.migrateFromDisk(itemAbs, itemRel);
                }
            } catch (itemErr) {
                console.error(`[Migration] Failed for ${item}:`, itemErr.message);
            }
        }
    }

    async listFiles() {
        const res = await pool.query('SELECT * FROM workspace_files ORDER BY is_dir DESC, path ASC');
        return this.buildTree(res.rows);
    }

    async saveFile(filePath, name, content, isDir) {
        const query = `
            INSERT INTO workspace_files (path, name, content, is_dir, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (path) DO UPDATE 
            SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP;
        `;
        await pool.query(query, [filePath, name, content, isDir]);
    }

    async deleteFile(filePath) {
        // Recursive delete for directories
        await pool.query('DELETE FROM workspace_files WHERE path = $1 OR path LIKE $2', [filePath, `${filePath}/%`]);
    }

    async renameFile(oldPath, newPath) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Re-map all children if it's a directory
            const res = await client.query('SELECT * FROM workspace_files WHERE path = $1 OR path LIKE $2', [oldPath, `${oldPath}/%`]);

            for (const row of res.rows) {
                const subPath = row.path.replace(oldPath, newPath);
                const name = subPath.split('/').pop();

                await client.query('DELETE FROM workspace_files WHERE path = $1', [row.path]);
                await client.query(
                    'INSERT INTO workspace_files (path, name, content, is_dir, updated_at) VALUES ($1, $2, $3, $4, $5)',
                    [subPath, name, row.content, row.is_dir, row.updated_at]
                );
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async readFile(filePath) {
        const res = await pool.query('SELECT content FROM workspace_files WHERE path = $1', [filePath]);
        return res.rows[0]?.content || '';
    }

    buildTree(rows) {
        const nodes = {};
        const tree = [];

        rows.forEach(row => {
            const node = {
                id: row.path,
                name: row.name,
                isDir: row.is_dir,
                content: row.content,
                children: row.is_dir ? [] : undefined,
                isOpen: false
            };
            nodes[row.path] = node;

            const parts = row.path.split('/');
            if (parts.length === 1) {
                tree.push(node);
            } else {
                const parentPath = parts.slice(0, -1).join('/');
                if (nodes[parentPath]) {
                    nodes[parentPath].children.push(node);
                } else {
                    // Orphaned or root level
                    tree.push(node);
                }
            }
        });

        return tree;
    }
}

export default new StorageService();
