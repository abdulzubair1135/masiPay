import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/details', authenticate, WalletController.getWalletDetails);
router.post('/recharge', authenticate, WalletController.rechargeWallet);
router.post('/pay', authenticate, WalletController.payOrderWithWallet);

export default router;
