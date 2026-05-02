import pool from '../db.js';

export const getPosData = async (req, res) => {
  try {
    const categories = await pool.query('SELECT * FROM categories');
    // Get products with their total sales count from bill_items
    const products = await pool.query(`
      SELECT p.*, 
      (SELECT COALESCE(SUM(quantity), 0) FROM bill_items WHERE name = p.name) as sales_count
      FROM products p 
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
    `);
    res.json({ categories: categories.rows, products: products.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createBill = async (req, res) => {
  const { total_amount, payment_method, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get last bill number
    const lastBill = await client.query('SELECT bill_number FROM bills WHERE bill_number LIKE \'CH%\' ORDER BY id DESC LIMIT 1');
    let nextNumber = 1;
    if (lastBill.rows[0]) {
      const lastNum = parseInt(lastBill.rows[0].bill_number.replace('CH', ''));
      nextNumber = lastNum + 1;
    }
    const bill_number = `CH${String(nextNumber).padStart(5, '0')}`;

    const billResult = await client.query(
      'INSERT INTO bills (bill_number, total_amount, payment_method) VALUES ($1, $2, $3) RETURNING id, bill_number',
      [bill_number, total_amount, payment_method]
    );

    const billId = billResult.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO bill_items (bill_id, product_id, name, price, quantity, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [billId, item.product_id || null, item.name, item.price, item.quantity, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: billId, bill_number });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

export const updateBill = async (req, res) => {
  const { id } = req.params;
  const { total_amount, payment_method, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update bill total
    await client.query(
      'UPDATE bills SET total_amount = $1, payment_method = $2 WHERE id = $3',
      [total_amount, payment_method, id]
    );

    // Delete old items and insert new ones
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [id]);

    for (const item of items) {
      await client.query(
        'INSERT INTO bill_items (bill_id, product_id, name, price, quantity, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, item.product_id || null, item.name, item.price, item.quantity, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Bill updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

export const getCustomerBills = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 50');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
};

export const getCustomerBillItems = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM bill_items WHERE bill_id = $1', [id]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
};
