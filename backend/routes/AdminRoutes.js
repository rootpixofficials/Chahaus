import express from 'express';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { 
    getAdminDashboardStats, 
    getSalesChartData,
    getCategories, addCategory, updateCategory, deleteCategory,
    getSubcategories, addSubcategory, updateSubcategory, deleteSubcategory,
    getProducts, addProduct, updateProduct, deleteProduct,
    getAllBills, getBillItems,
    uploadImage
} from '../controllers/AdminController.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = express.Router();

router.use(verifyAdmin);

router.get('/stats', getAdminDashboardStats);
router.get('/chart-data', getSalesChartData);
router.post('/upload-image', upload.single('image'), uploadImage);

// Categories
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Subcategories
router.get('/subcategories', getSubcategories);
router.post('/subcategories', addSubcategory);
router.put('/subcategories/:id', updateSubcategory);
router.delete('/subcategories/:id', deleteSubcategory);

// Products
router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Bills
router.get('/bills', getAllBills);
router.get('/bills/:id/items', getBillItems);

export default router;
