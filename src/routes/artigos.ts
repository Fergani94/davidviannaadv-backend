import { Router } from 'express';
import { listarArtigos, obterArtigoPorSlug } from '../controllers/artigosController';

const router = Router();

// Public routes
router.get('/', listarArtigos);

// IMPORTANT: keep '/:slug' as the LAST route (admin routes are added above it in Task 5)
router.get('/:slug', obterArtigoPorSlug);

export default router;
