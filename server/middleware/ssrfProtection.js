/**
 * SSRF (Server-Side Request Forgery) Protection Middleware and Utilities
 * Prevents access to internal networks, localhost, private IP ranges, and unauthorized domains.
 */

const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');

// Allowed CDN domains for media streaming
const ALLOWED_CDN_SUFFIXES = [
  '.cdninstagram.com',
  '.fbcdn.net',
  '.instagram.com',
  'instagram.com',
  'commondatastorage.googleapis.com',
];

/**
 * Checks if an IP string is private, loopback, link-local, or reserved
 * @param {string} ipString
 * @returns {boolean}
 */
function isPrivateIp(ipString) {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Dangerous ranges in IPv4 & IPv6
    const forbiddenRanges = [
      'loopback',
      'private',
      'linkLocal',
      'uniqueLocal',
      'broadcast',
      'carrierGradeNat',
      'reserved',
    ];

    return forbiddenRanges.includes(range);
  } catch {
    // If it cannot be parsed as valid IP, treat as unsafe
    return true;
  }
}

/**
 * Validates a video CDN URL against SSRF and allowed domain whitelist
 * @param {string} urlString
 * @returns {Promise<{ valid: boolean, error?: string, url?: URL }>}
 */
async function validateMediaUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL media tidak valid.' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { valid: false, error: 'Format URL media tidak sah.' };
  }

  // Only allow HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Hanya protokol HTTPS yang diizinkan.' };
  }

  const host = parsed.hostname.toLowerCase();

  // Explicitly disallow localhost and loopback hostnames
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { valid: false, error: 'Akses ke host internal dilarang (SSRF detected).' };
  }

  // Check if host belongs to Instagram / Meta CDN
  const isAllowedHost = ALLOWED_CDN_SUFFIXES.some(
    suffix => host === suffix || host.endsWith(suffix)
  );

  if (!isAllowedHost) {
    return {
      valid: false,
      error: 'Domain media tidak sah atau bukan berasal dari server Instagram.',
    };
  }

  // Resolve hostname via DNS and ensure it does not resolve to private IP
  try {
    const addresses = await dns.lookup(host, { all: true });
    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return {
          valid: false,
          error: `Domain me-resolve ke alamat IP privat/internal (${record.address}). Akses ditolak.`,
        };
      }
    }
  } catch {
    return {
      valid: false,
      error: 'Gagal menyelesaikan domain media (DNS lookup failed).',
    };
  }

  return { valid: true, url: parsed };
}

/**
 * Express middleware for protecting download / stream endpoints
 */
async function ssrfMediaProtect(req, res, next) {
  const mediaUrl = req.query.url || req.body?.url;

  if (!mediaUrl) {
    return res.status(400).json({
      success: false,
      error: 'Parameter URL media wajib disertakan.',
      code: 'MISSING_MEDIA_URL',
    });
  }

  const check = await validateMediaUrl(mediaUrl);
  if (!check.valid) {
    return res.status(403).json({
      success: false,
      error: check.error,
      code: 'SSRF_BLOCKED',
    });
  }

  req.validatedMediaUrl = mediaUrl;
  next();
}

module.exports = {
  isPrivateIp,
  validateMediaUrl,
  ssrfMediaProtect,
  ALLOWED_CDN_SUFFIXES,
};
