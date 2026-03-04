// lib/db.js
import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('PostgreSQL pool error:', err));
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  const start = Date.now();
  const res = await p.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log('query', { text: text.substring(0, 80), ms: Date.now() - start, rows: res.rowCount });
  }
  return res;
}