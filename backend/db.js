import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'teashop',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

export const database = async () => {
  try {
    const client = await pool.connect();
    console.log('db as connect');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

export default pool;
