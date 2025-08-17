// src/routes/paymentRoutes.ts
import { Router } from 'express';
import { createOrder, handleWebhook } from '../controllers/paymentController';
import { validateCreateOrder, validateWebhook } from '../validators/paymentValidators';

const router = Router();

// Create payment order
router.post('/create-order', validateCreateOrder, createOrder);

// Handle Razorpay webhook
router.post('/webhook', handleWebhook);

export default router;