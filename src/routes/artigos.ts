import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { listarArtigos, obterArtigoPorSlug } from '../controllers/artigosController';
import {
  listarArtigosAdmin,
  obterArtigoAdmin,
  criarArtigo,
  atualizarArtigo,
  alterarPublicacao,
  excluirArtigo,
  gerarUrlCapa,
} from '../controllers/artigosAdminController';

const router = Router();

// Public routes
router.get('/', listarArtigos);

// Protected routes (admin) — must come BEFORE '/:slug'
router.get('/admin', authMiddleware, listarArtigosAdmin);
router.post('/admin', authMiddleware, criarArtigo);
router.post('/admin/capa', authMiddleware, gerarUrlCapa);
router.get('/admin/:id', authMiddleware, obterArtigoAdmin);
router.put('/admin/:id', authMiddleware, atualizarArtigo);
router.patch('/admin/:id/publicacao', authMiddleware, alterarPublicacao);
router.delete('/admin/:id', authMiddleware, excluirArtigo);

// Must stay LAST: otherwise '/admin' would be read as a slug
router.get('/:slug', obterArtigoPorSlug);

export default router;
