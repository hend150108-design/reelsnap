/**
 * Reels Routes
 * POST /api/reels/info - Validate URL & extract metadata
 * GET /api/reels/download - Stream & download real video file
 * POST /api/reels/download - Alternative download trigger
 */

const express = require('express');
const router = express.Router();

const { validateReelUrl } = require('../middleware/validator');
const { ssrfMediaProtect } = require('../middleware/ssrfProtection');
const { apiLimiter, downloadLimiter } = require('../middleware/rateLimiter');
const instagramService = require('../services/instagram');

/**
 * POST /api/reels/info
 * Validates Instagram Reel URL and extracts video metadata
 */
router.post('/info', apiLimiter, validateReelUrl, async (req, res, next) => {
  try {
    const { shortcode, cleanUrl } = req.reelData;

    const reelData = await instagramService.getReelInfo(shortcode, cleanUrl);

    res.json({
      success: true,
      message: 'Video Reels berhasil ditemukan.',
      data: reelData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reels/download
 * Proxies the video stream with proper download headers
 * Prevents SSRF attacks and bypasses browser cross-origin playback blocks
 */
router.get('/download', downloadLimiter, ssrfMediaProtect, async (req, res, next) => {
  try {
    const videoUrl = req.validatedMediaUrl;
    const shortcode = (req.query.code || 'video').replace(/[^A-Za-z0-9_-]/g, '');

    await instagramService.streamVideoDownload(videoUrl, shortcode, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reels/download
 * JSON-based download trigger
 */
router.post('/download', downloadLimiter, ssrfMediaProtect, async (req, res, next) => {
  try {
    const videoUrl = req.validatedMediaUrl;
    const shortcode = (req.body.code || 'video').replace(/[^A-Za-z0-9_-]/g, '');

    await instagramService.streamVideoDownload(videoUrl, shortcode, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reels/cookie
 * Check if an Instagram cookie is currently active
 */
router.get('/cookie', (req, res) => {
  const active = instagramService.getActiveCookie();
  res.json({
    success: true,
    hasCookie: Boolean(active),
    cookiePreview: active ? active.substring(0, 15) + '...' : null,
  });
});

/**
 * POST /api/reels/cookie
 * Set or update Instagram session cookie directly from the UI
 */
router.post('/cookie', apiLimiter, (req, res, next) => {
  try {
    const { cookie } = req.body || {};
    const result = instagramService.updateActiveCookie(cookie);
    res.json({
      success: true,
      message: result.hasCookie
        ? 'Cookie Instagram berhasil disimpan dan diterapkan.'
        : 'Cookie Instagram telah dihapus.',
      hasCookie: result.hasCookie,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
