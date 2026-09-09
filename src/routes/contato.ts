import { Router } from 'express';
import { enviarContato } from '../controllers/contatoController';

const router = Router();

router.post('/', enviarContato);

export default router;
