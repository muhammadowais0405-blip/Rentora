import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from './server/db/database';
import { seedDatabase } from './server/db/seed';
import { attachAuthUser } from './server/middleware/auth';
import { createApiRouter } from './server/routes/api';
import { createAuthRouter } from './server/routes/auth';
import { createAiRouter } from './server/routes/ai';
import { createBookingsRouter } from './server/routes/bookings';
import { createAdminRouter } from './server/routes/admin';

const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  const db = getDatabase();
  seedDatabase(db);

  const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));
  app.use(attachAuthUser);

  app.use('/api/auth', createAuthRouter());
  app.use('/api/ai', createAiRouter());
  app.use('/api/admin', createAdminRouter());
  app.use('/api', createBookingsRouter());
  app.use('/api', createApiRouter());

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rentora server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Rentora server:', err);
  process.exit(1);
});
