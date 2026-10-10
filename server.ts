import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './src/server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// In production, serve static assets built by Vite
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// For SPA, send index.html for any non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('EdVyro Internship Board Server is running. Run `npm run build` to generate static frontend files.');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[EdVyro Server] Listening on http://0.0.0.0:${PORT}`);
});
