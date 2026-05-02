import pool from './db.js';

const testQuery = async () => {
  try {
    console.log('Testing query...');
    const result = await pool.query(`
      SELECT p.*, s.name as subcategory_name, c.name as category_name,
      (SELECT COALESCE(SUM(quantity), 0) FROM bill_items WHERE name = p.name) as sales_count
      FROM products p 
      LEFT JOIN subcategories s ON p.subcategory_id = s.id 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    console.log('Query successful! Row count:', result.rows.length);
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    process.exit();
  }
};

testQuery();
