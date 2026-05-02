import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './db.js';

// Route Imports
import authRoutes from './routes/AuthRoutes.js';
import adminRoutes from './routes/AdminRoutes.js';
import customerRoutes from './routes/CustomerRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Initialize Database connection
database();

// Mount Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running successfully!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
