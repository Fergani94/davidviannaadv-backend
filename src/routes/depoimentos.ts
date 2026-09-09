import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  obterDepoimentos,
  enviarDepoimento,
  gerarLinkDepoimento,
  obterDepoimentosAdmin,
  atualizarStatusDepoimento
} from '../controllers/depoimentosController';

const router = Router();

// Public routes
router.get('/', obterDepoimentos);
router.post('/submit', enviarDepoimento);

// Protected routes (admin)
router.post('/admin/gerar-link', authMiddleware, gerarLinkDepoimento);
router.get('/admin', authMiddleware, obterDepoimentosAdmin);
router.put('/admin/:id', authMiddleware, atualizarStatusDepoimento);

export default router;
