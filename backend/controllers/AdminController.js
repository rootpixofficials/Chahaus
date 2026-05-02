import pool from '../db.js';

export const getAdminDashboardStats = async (req, res) => {
  try {
    const productsCount = await pool.query('SELECT COUNT(*) FROM products');
    const categoriesCount = await pool.query('SELECT COUNT(*) FROM categories');
    const billsCount = await pool.query('SELECT COUNT(*) FROM bills');
    const totalSales = await pool.query('SELECT SUM(total_amount) FROM bills');

    // High Selling Product
    const highSelling = await pool.query(`
      SELECT name, SUM(quantity) as total_qty 
      FROM bill_items 
      GROUP BY name 
      ORDER BY total_qty DESC 
      LIMIT 1
    `);

    // Low Selling Product (different from high if possible)
    const lowSelling = await pool.query(`
      SELECT name, SUM(quantity) as total_qty 
      FROM bill_items 
      GROUP BY name 
      ORDER BY total_qty ASC 
      LIMIT 1
    `);

    res.json({
      products: productsCount.rows[0].count,
      categories: categoriesCount.rows[0].count,
      bills: billsCount.rows[0].count,
      sales: totalSales.rows[0].sum || 0,
      topProduct: highSelling.rows[0] ? highSelling.rows[0].name : 'N/A',
      topQty: highSelling.rows[0] ? highSelling.rows[0].total_qty : 0,
      bottomProduct: lowSelling.rows[0] ? lowSelling.rows[0].name : 'N/A',
      bottomQty: lowSelling.rows[0] ? lowSelling.rows[0].total_qty : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSalesChartData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as total 
      FROM bills 
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Categories
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
      COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') as subcategories
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addCategory = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Subcategories
export const getSubcategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT s.*, c.name as category_name FROM subcategories s JOIN categories c ON s.category_id = c.id ORDER BY s.id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addSubcategory = async (req, res) => {
  const { name, category_id } = req.body;
  try {
    const result = await pool.query('INSERT INTO subcategories (name, category_id) VALUES ($1, $2) RETURNING *', [name, category_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSubcategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query('UPDATE subcategories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSubcategory = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM subcategories WHERE id = $1', [id]);
    res.json({ message: 'Subcategory deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Products
export const getProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.name as subcategory_name, c.name as category_name,
      (SELECT COALESCE(SUM(quantity), 0) FROM bill_items WHERE name = p.name) as sales_count
      FROM products p 
      LEFT JOIN subcategories s ON p.subcategory_id = s.id 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addProduct = async (req, res) => {
  const { name, category_id, subcategory_id, image_url, production_cost, sales_rate } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, category_id, subcategory_id, image_url, production_cost, sales_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, category_id, subcategory_id || null, image_url, production_cost, sales_rate]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, category_id, subcategory_id, image_url, production_cost, sales_rate } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name = $1, category_id = $2, subcategory_id = $3, image_url = $4, production_cost = $5, sales_rate = $6 WHERE id = $7 RETURNING *',
      [name, category_id, subcategory_id || null, image_url, production_cost, sales_rate, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Bills
export const getAllBills = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bills ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBillItems = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bill_items WHERE bill_id = $1', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
};
