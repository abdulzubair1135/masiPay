import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/details', requireAuth, WalletController.getWalletDetails);
router.post('/recharge', requireAuth, WalletController.rechargeWallet);
router.post('/pay', requireAuth, WalletController.payOrderWithWallet);

export default router;
