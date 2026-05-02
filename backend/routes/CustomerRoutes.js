import express from 'express';
import { verifyCustomer } from '../middleware/authMiddleware.js';
import { 
    getPosData, 
    createBill, 
    updateBill,
    getCustomerBills, 
    getCustomerBillItems 
} from '../controllers/CustomerController.js';

const router = express.Router();

router.use(verifyCustomer);

router.get('/pos-data', getPosData);
router.post('/bills', createBill);
router.put('/bills/:id', updateBill);
router.get('/bills', getCustomerBills);
router.get('/bills/:id/items', getCustomerBillItems);

export default router;
