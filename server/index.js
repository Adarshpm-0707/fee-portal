import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Routes imports
import statusRouter from './routes/status.js';
import qrRouter from './routes/qr.js';
import sendRouter from './routes/send.js';
import sendAllRouter from './routes/sendAll.js';
import sendBulkRouter from './routes/sendBulk.js';

// Init database to trigger env load
import { isFirebaseConfigured } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - Allow Vite frontend in development and production dynamically
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic origin matching to support Firebase hosting, local VPS, tunnels (Ngrok), etc.
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// API route connections
app.use('/api/whatsapp-status', statusRouter);
app.use('/api/qr', qrRouter);
app.use('/api/send-receipt', sendRouter);
app.use('/api/send-all', sendAllRouter);
app.use('/api/send-bulk', sendBulkRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    firebase: isFirebaseConfigured ? 'connected' : 'placeholder_mode',
    environment: process.env.NODE_ENV || 'development',
    time: new Date()
  });
});

// Serve frontend assets in production
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log(`Express is running in production. Hosting assets from ${distPath}`);
  app.use(express.static(distPath));
  
  // React fallback routing support
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('Vite distribution package not found. Serving as standalone REST API.');
  app.get('/', (req, res) => {
    res.send('Student Fee Portal API Server is running. Front-end React site is ready for build.');
  });
}

import { execSync } from 'child_process';

// Auto-recovery function to free the API port if occupied
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const pids = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && parseInt(pid) > 0 && pid !== String(process.pid)) {
          pids.add(pid);
        }
      });
      pids.forEach(pid => {
        console.log(`[Auto-Recover] Terminating conflicting process ${pid} on port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
        } catch (e) {}
      });
    } else {
      const output = execSync(`lsof -t -i:${port}`, { encoding: 'utf8' });
      const pids = output.trim().split('\n');
      pids.forEach(pid => {
        if (pid && pid !== String(process.pid)) {
          console.log(`[Auto-Recover] Terminating conflicting process ${pid} on port ${port}...`);
          try {
            execSync(`kill -9 ${pid}`);
          } catch (e) {}
        }
      });
    }
  } catch (e) {}
}

// Free port 3001 if occupied before starting
if (PORT === 3001 || PORT === '3001') {
  freePort(3001);
}

app.listen(PORT, () => {
  console.log(`Express API Server listening on port ${PORT}`);
});
