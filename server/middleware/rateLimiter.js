/**
 * Rate Limiter Middleware
 * Protects server resources and Instagram endpoints from abuse.
 */

const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '30', 10); // 30 requests per minute

const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan dari IP Anda. Silakan tunggu beberapa saat sebelum mencoba lagi.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Stricter limiter for downloads/streaming
const downloadLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.DOWNLOAD_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Batas unduhan per menit tercapai. Silakan coba sesaat lagi.',
    code: 'DOWNLOAD_LIMIT_EXCEEDED',
  },
});

module.exports = {
  apiLimiter,
  downloadLimiter,
};
