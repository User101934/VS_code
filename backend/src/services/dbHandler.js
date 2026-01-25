import { MongoClient } from 'mongodb';
import { Client as PGClient } from 'pg';
import mysql from 'mysql2/promise';

class DBHandler {
    static async connect(uri) {
        if (uri.startsWith('mongodb')) {
            const client = new MongoClient(uri);
            await client.connect();
            return { type: 'mongodb', client };
        } else if (uri.startsWith('postgresql') || uri.startsWith('postgres')) {
            const client = new PGClient({ connectionString: uri });
            await client.connect();
            return { type: 'postgres', client };
        } else if (uri.startsWith('mysql')) {
            const connection = await mysql.createConnection({
                uri,
                multipleStatements: true
            });
            return { type: 'mysql', client: connection };
        }
        throw new Error('Unsupported database type or invalid URI');
    }

    static async fetchMetadata(connection) {
        const { type, client } = connection;

        if (type === 'mongodb') {
            const admin = client.db().admin();
            const { databases } = await admin.listDatabases();
            const result = [];

            for (const dbInfo of databases) {
                const db = client.db(dbInfo.name);
                const collections = await db.listCollections().toArray();
                result.push({
                    name: dbInfo.name,
                    type: 'database',
                    children: collections.map(c => ({ name: c.name, type: 'collection' }))
                });
            }
            return result;
        }

        if (type === 'postgres') {
            const res = await client.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            `);
            const schemas = {};
            res.rows.forEach(row => {
                if (!schemas[row.table_schema]) schemas[row.table_schema] = [];
                schemas[row.table_schema].push({ name: row.table_name, type: 'table' });
            });
            return Object.keys(schemas).map(s => ({
                name: s,
                type: 'schema',
                children: schemas[s]
            }));
        }

        if (type === 'mysql') {
            const [rows] = await client.query('SHOW DATABASES');
            const result = [];
            for (const row of rows) {
                const dbName = row.Database;
                if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;

                const [tables] = await client.query(`SHOW TABLES FROM \`${dbName}\``);
                result.push({
                    name: dbName,
                    type: 'database',
                    children: tables.map(t => ({ name: Object.values(t)[0], type: 'table' }))
                });
            }
            return result;
        }
    }

    static async runQuery(connection, query, context = {}) {
        const { type, client } = connection;

        if (type === 'mongodb') {
            const { dbName, collectionName, operation, params } = context;
            const db = client.db(dbName);

            if (query && query.trim().startsWith('{')) {
                try {
                    const cmd = JSON.parse(query);
                    return await db.command(cmd);
                } catch (e) {
                    // fall back
                }
            }

            if (!collectionName) {
                return { message: "SQL editor ready. Click a table or type a command." };
            }

            const collection = db.collection(collectionName);
            if (operation === 'find') {
                return await collection.find(params?.[0] || {}).limit(50).toArray();
            }
            if (operation === 'updateOne') {
                return await collection.updateOne(params[0], params[1]);
            }
            if (operation === 'deleteOne') {
                return await collection.deleteOne(params[0]);
            }

            const result = await collection[operation](...params).toArray?.() || await collection[operation](...params);
            return result;
        }

        if (type === 'postgres' || type === 'mysql') {
            if (type === 'mysql' && context.dbName) {
                await client.query(`USE \`${context.dbName}\``);
            }
            const [result] = type === 'postgres' ? [await client.query(query)] : await client.query(query);

            if (type === 'mysql' && Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
                const rowResult = result.find(res => Array.isArray(res));
                return rowResult || result[result.length - 1];
            }

            return type === 'postgres' ? result.rows : result;
        }
    }

    static async updateRecord(connection, context) {
        const { type, client } = connection;
        const { dbName, tableName, identity, delta } = context;

        if (type === 'mongodb') {
            const db = client.db(dbName);
            // Dynamic import for ObjectId if needed or just use from mongodb package
            const { ObjectId } = await import('mongodb');
            const query = { ...identity };
            if (query._id && typeof query._id === 'string') query._id = new ObjectId(query._id);

            return await db.collection(tableName).updateOne(query, { $set: delta });
        }

        if (type === 'postgres' || type === 'mysql') {
            const setClause = Object.keys(delta).map((k, i) =>
                type === 'postgres' ? `"${k}" = $${i + 1}` : `\`${k}\` = ?`
            ).join(', ');

            const whereClause = Object.keys(identity).map((k, i) =>
                type === 'postgres' ? `"${k}" = $${Object.keys(delta).length + i + 1}` : `\`${k}\` = ?`
            ).join(' AND ');

            const sql = `UPDATE ${type === 'mysql' ? `\`${dbName}\`.\`${tableName}\`` : `"${tableName}"`} SET ${setClause} WHERE ${whereClause}`;
            const params = [...Object.values(delta), ...Object.values(identity)];

            return await client.query(sql, params);
        }
    }

    static async insertRecord(connection, context) {
        const { type, client } = connection;
        const { dbName, tableName, record } = context;

        if (type === 'mongodb') {
            const db = client.db(dbName);
            return await db.collection(tableName).insertOne(record);
        }

        if (type === 'postgres' || type === 'mysql') {
            const columns = Object.keys(record);
            const placeholders = columns.map((_, i) =>
                type === 'postgres' ? `$${i + 1}` : '?'
            ).join(', ');

            const sql = `INSERT INTO ${type === 'mysql' ? `\`${dbName}\`.\`${tableName}\`` : `"${tableName}"`} (${columns.map(c => type === 'mysql' ? `\`${c}\`` : `"${c}"`).join(', ')}) VALUES (${placeholders})`;
            return await client.query(sql, Object.values(record));
        }
    }

    static async deleteRecord(connection, context) {
        const { type, client } = connection;
        const { dbName, tableName, identity } = context;

        if (type === 'mongodb') {
            const db = client.db(dbName);
            const { ObjectId } = await import('mongodb');
            const query = { ...identity };
            if (query._id && typeof query._id === 'string') query._id = new ObjectId(query._id);

            return await db.collection(tableName).deleteOne(query);
        }

        if (type === 'postgres' || type === 'mysql') {
            const whereClause = Object.keys(identity).map((k, i) =>
                type === 'postgres' ? `"${k}" = $${i + 1}` : `\`${k}\` = ?`
            ).join(' AND ');

            const sql = `DELETE FROM ${type === 'mysql' ? `\`${dbName}\`.\`${tableName}\`` : `"${tableName}"`} WHERE ${whereClause}`;
            const params = Object.values(identity);

            return await client.query(sql, params);
        }
    }

    static async createDatabase(connection, dbName) {
        const { type, client } = connection;

        if (type === 'mongodb') {
            const db = client.db(dbName);
            await db.createCollection('_init');
            return { message: `Database ${dbName} initialized with _init collection` };
        }

        if (type === 'postgres' || type === 'mysql') {
            const sql = `CREATE DATABASE ${type === 'mysql' ? `\`${dbName}\`` : `"${dbName}"`}`;
            return await client.query(sql);
        }
    }

    static async createTable(connection, dbName, tableName) {
        const { type, client } = connection;

        if (type === 'mongodb') {
            const db = client.db(dbName);
            return await db.createCollection(tableName);
        }

        if (type === 'mysql') {
            const sql = `CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`${tableName}\` (id INT AUTO_INCREMENT PRIMARY KEY)`;
            return await client.query(sql);
        }

        if (type === 'postgres') {
            const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (id SERIAL PRIMARY KEY)`;
            return await client.query(sql);
        }
    }

    static async disconnect(connection) {
        const { type, client } = connection;
        if (type === 'mongodb') await client.close();
        else if (type === 'postgres') await client.end();
        else if (type === 'mysql') await client.end();
    }
}

export default DBHandler;
