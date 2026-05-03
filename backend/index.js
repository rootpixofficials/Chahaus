import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './db.js';

// Route Imports
import authRoutes from './routes/AuthRoutes.js';
import adminRoutes from './routes/AdminRoutes.js';
import customerRoutes from './routes/CustomerRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://chahaus.space', 
    'https://www.chahaus.space'
  ],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

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
