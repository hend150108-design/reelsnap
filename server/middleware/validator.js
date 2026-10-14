/**
 * Validator Middleware for Instagram Reels
 * Validates URLs and extracts reel shortcodes safely
 */

const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
  'www.instagr.am',
]);

/**
 * Extracts shortcode from an Instagram URL
 * @param {string} urlString
 * @returns {{ shortcode: string, type: string, cleanUrl: string } | null}
 */
function extractInstagramInfo(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;

  let parsed;
  try {
    let toParse = urlString.trim();
    if (!toParse.startsWith('http://') && !toParse.startsWith('https://')) {
      toParse = 'https://' + toParse;
    }
    parsed = new URL(toParse);
  } catch {
    return null;
  }

  // Check host
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return null;
  }

  // Match /reel/{code}, /p/{code}, /tv/{code}, /share/reel/{code}
  const pathname = parsed.pathname;
  const match = pathname.match(/\/(?:reel|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/);

  if (!match || !match[1]) {
    return null;
  }

  const shortcode = match[1];

  // Instagram shortcodes are typically 4-35 characters, alphanumeric + _ -
  if (!/^[A-Za-z0-9_-]{4,35}$/.test(shortcode)) {
    return null;
  }

  return {
    shortcode,
    type: pathname.includes('/p/') ? 'post' : 'reel',
    cleanUrl: `https://www.instagram.com/reel/${shortcode}/`,
  };
}

/**
 * Express middleware to validate Instagram Reel URL in request body
 */
function validateReelUrl(req, res, next) {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({
      success: false,
      error: 'URL Instagram Reels wajib diisi.',
      code: 'EMPTY_URL',
    });
  }

  const trimmed = url.trim();
  if (trimmed.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'URL terlalu panjang. Pastikan Anda memasukkan tautan Instagram yang valid.',
      code: 'URL_TOO_LONG',
    });
  }

  const extracted = extractInstagramInfo(trimmed);
  if (!extracted) {
    return res.status(400).json({
      success: false,
      error: 'Tautan tidak valid. Pastikan tautan berasal dari Instagram Reels (contoh: https://www.instagram.com/reel/...).',
      code: 'INVALID_INSTAGRAM_URL',
    });
  }

  // Attach extracted info to request
  req.reelData = extracted;
  next();
}

module.exports = {
  validateReelUrl,
  extractInstagramInfo,
  ALLOWED_HOSTS,
};
