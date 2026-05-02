import pool from './db.js';

const checkColumns = async () => {
  try {
    console.log('Checking columns...');
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log('Current columns:', result.rows.map(r => r.column_name));
    
    if (!result.rows.find(r => r.column_name === 'category_id')) {
        console.log('category_id missing, adding...');
        await pool.query('ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE');
        console.log('Added category_id successfully');
    } else {
        console.log('category_id already exists');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
};

checkColumns();
