import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  listPlans,
  status,
  createCheckout,
  confirmCheckout,
  cancelSubscription,
  billingHistory,
} from '../controllers/billing.controller.js';

const router = Router();

router.get('/plans', listPlans); // public

router.use(requireAuth);
router.get('/status', status);
router.post('/checkout', createCheckout);
router.post('/confirm', confirmCheckout);
router.post('/cancel', cancelSubscription);
router.get('/history', billingHistory);

export default router;
