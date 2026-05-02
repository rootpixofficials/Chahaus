import { database } from './db.js';
import pool from './db.js';
import bcrypt from 'bcrypt';

const initDB = async () => {
  try {
    await database(); // verify connection

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer'
      );
    `;

    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );
    `;

    const createSubcategoriesTable = `
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL
      );
    `;

    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        image_url TEXT,
        production_cost DECIMAL(10, 2) NOT NULL,
        sales_rate DECIMAL(10, 2) NOT NULL
      );
    `;

    const createBillsTable = `
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        bill_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createBillItemsTable = `
      CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
        product_id INTEGER,
        name VARCHAR(150) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      );
    `;

    await pool.query(createUsersTable);
    await pool.query(createCategoriesTable);
    await pool.query(createSubcategoriesTable);
    await pool.query(createProductsTable);
    await pool.query(createBillsTable);
    await pool.query(createBillItemsTable);

    // Seed admin and customer users
    const adminExists = await pool.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminExists.rows.length === 0) {
      const adminHash = await bcrypt.hash('1234567890', 10);
      await pool.query(`INSERT INTO users (username, password, role) VALUES ('admin', $1, 'admin')`, [adminHash]);
      console.log('Seeded admin user');
    }

    const customerExists = await pool.query(`SELECT id FROM users WHERE username = 'chahaus'`);
    if (customerExists.rows.length === 0) {
      const customerHash = await bcrypt.hash('cha123', 10);
      await pool.query(`INSERT INTO users (username, password, role) VALUES ('chahaus', $1, 'customer')`, [customerHash]);
      console.log('Seeded customer user');
    }

    console.log('Database tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    pool.end();
  }
};

initDB();
