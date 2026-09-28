import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import contatoRoutes from './routes/contato';
import depoimentosRoutes from './routes/depoimentos';
import artigosRoutes from './routes/artigos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(corsMiddleware);
// Artigos guardam HTML: o limite padrão (100 KB) recusaria textos longos
app.use(express.json({ limit: '1mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/contato', contatoRoutes);
app.use('/api/depoimentos', depoimentosRoutes);
app.use('/api/artigos', artigosRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
