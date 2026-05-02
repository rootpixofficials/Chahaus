import pool from './db.js';

const migrate = async () => {
  try {
    console.log('Starting migration...');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE products ALTER COLUMN subcategory_id DROP NOT NULL');
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
};

migrate();
