/**
 * ReelSnap Server
 * Production-ready Express.js server for Instagram Reels Downloader
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const healthRouter = require('./routes/health');
const reelsRouter = require('./routes/reels');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.cdninstagram.com',
          'https://*.fbcdn.net',
          'https://images.unsplash.com',
        ],
        mediaSrc: [
          "'self'",
          'blob:',
          'https://*.cdninstagram.com',
          'https://*.fbcdn.net',
        ],
        connectSrc: ["'self'", 'https://unpkg.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser with strict size limit
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: false, limit: '15kb' }));

// Serve frontend static files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir, { maxAge: IS_PROD ? '1d' : 0 }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/reels', reelsRouter);

// Fallback for SPA/HTML serving
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 Route Handler for undefined APIs
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint API tidak ditemukan.',
    code: 'NOT_FOUND',
  });
});

// Centralized Error Handling Middleware (No Stack Trace Leak)
app.use((err, req, res, _next) => {
  const status = err.status || (err.response?.status) || 500;
  const isClientError = status >= 400 && status < 500;

  // Log error safely internally
  if (!isClientError) {
    console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err.message || err);
  }

  const message =
    isClientError || err.code
      ? err.message
      : 'Terjadi kesalahan pada server saat memproses permintaan Anda. Silakan coba beberapa saat lagi.';

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'SERVER_ERROR',
    needsCookie: Boolean(err.needsCookie),
  });
});

// Start Server only if invoked directly
let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  🚀 ReelSnap Server running at http://localhost:${PORT}`);
    console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  🕒 Started at: ${new Date().toLocaleString()}`);
    console.log(`===============================================`);
  });

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('Server closed. Process terminating.');
      process.exit(0);
    });
  }

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

module.exports = app;
