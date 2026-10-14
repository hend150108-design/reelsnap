/**
 * Instagram Service
 * Handles extraction of Instagram Reels & Photos metadata and media streams.
 * Complies with strict security guidelines: no password storage, no private bypass,
 * informative error messages, and safe streaming without permanent disk storage.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Known GraphQL doc_ids for media web info
const DOC_IDS = [
  '8845758582119845',
  '27128499623469141',
  '9510064595728286',
  '10015901848480474',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
];

// Runtime cookie cache
let runtimeCookie = process.env.INSTAGRAM_COOKIE || '';

/**
 * Get active cookie
 */
function getActiveCookie() {
  return runtimeCookie || process.env.INSTAGRAM_COOKIE || '';
}

/**
 * Updates active cookie in memory and persists to .env
 */
function updateActiveCookie(newCookie) {
  let cleaned = (newCookie || '').trim();

  // If user cleared the cookie
  if (!cleaned) {
    runtimeCookie = '';
    process.env.INSTAGRAM_COOKIE = '';
    persistCookieToEnv('');
    return { success: true, hasCookie: false };
  }

  // Guard: If user accidentally pasted an Instagram URL
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.includes('instagram.com') ||
    cleaned.includes('/reel/') ||
    cleaned.includes('/p/')
  ) {
    const err = new Error(
      'Teks yang Anda masukkan adalah tautan URL Instagram, bukan nilai Cookie / Session ID. Silakan buka tab Instagram, tekan F12, lalu salin nilai sessionid.'
    );
    err.code = 'INVALID_COOKIE_FORMAT';
    err.status = 400;
    throw err;
  }

  // If user only pasted sessionid value without prefix
  if (!cleaned.includes('=')) {
    cleaned = `sessionid=${cleaned};`;
  }

  // Extract ds_user_id from sessionid if present and not already specified
  const userMatch = cleaned.match(/sessionid=(\d+)(?:%3A|:)/);
  if (userMatch && !cleaned.includes('ds_user_id=')) {
    cleaned += ` ds_user_id=${userMatch[1]};`;
  }

  // Ensure csrftoken is present if not already
  if (!cleaned.includes('csrftoken=')) {
    const dummyCsrf = 'csrf_' + Math.random().toString(36).substring(2, 12);
    cleaned += ` csrftoken=${dummyCsrf};`;
  }

  // Add ig_did and mid if missing
  if (!cleaned.includes('ig_did=')) {
    const dummyDid = 'did_' + Math.random().toString(36).substring(2, 12);
    cleaned += ` ig_did=${dummyDid};`;
  }
  if (!cleaned.includes('mid=')) {
    const dummyMid = 'mid_' + Math.random().toString(36).substring(2, 10);
    cleaned += ` mid=${dummyMid};`;
  }

  runtimeCookie = cleaned;
  process.env.INSTAGRAM_COOKIE = cleaned;

  persistCookieToEnv(cleaned);

  return { success: true, hasCookie: true };
}

function persistCookieToEnv(cookieStr) {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('INSTAGRAM_COOKIE=')) {
        content = content.replace(/INSTAGRAM_COOKIE=.*/, `INSTAGRAM_COOKIE="${cookieStr}"`);
      } else {
        content += `\nINSTAGRAM_COOKIE="${cookieStr}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
  } catch {
    // Ignore file write errors
  }
}

/**
 * Get random User-Agent header
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Convert Instagram shortcode to media numeric ID (BigInt)
 */
function shortcodeToMediaId(shortcode) {
  try {
    let id = BigInt(0);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < shortcode.length; i++) {
      const c = shortcode[i];
      const val = BigInt(alphabet.indexOf(c));
      if (val === BigInt(-1)) return null;
      id = id * BigInt(64) + val;
    }
    return id.toString();
  } catch {
    return null;
  }
}

/**
 * Strategy 1: Fetch via Instagram Mobile API (Highly reliable when cookie is provided)
 */
async function fetchViaMobileApi(shortcode) {
  const cookie = getActiveCookie();
  if (!cookie) return null;

  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId) return null;

  try {
    const response = await axios.get(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, {
      headers: {
        'User-Agent':
          'Instagram 219.0.0.12.117 Android (29/10; 420dpi; 1080x2134; samsung; SM-G973F; beyond1; exynos9820; en_US; 340367800)',
        'Cookie': cookie,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    });

    const items = response.data?.items;
    if (items && items.length > 0) {
      return parseMediaItem(items[0], shortcode, 'mobile_api');
    }
  } catch {
    // Fail gracefully to GraphQL
  }

  return null;
}

/**
 * Strategy 2: Fetch metadata via Instagram GraphQL API (xdt_api__v1__media__shortcode__web_info)
 * @param {string} shortcode
 * @returns {Promise<object|null>}
 */
async function fetchViaGraphQL(shortcode) {
  const ua = getRandomUserAgent();
  const cookie = getActiveCookie();

  let csrfToken = 'csrftoken_val';
  if (cookie) {
    const match = cookie.match(/csrftoken=([^;]+)/);
    if (match) csrfToken = match[1];
  }

  const headers = {
    'User-Agent': ua,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459',
    'X-CSRFToken': csrfToken,
    'Origin': 'https://www.instagram.com',
    'Referer': `https://www.instagram.com/p/${shortcode}/`,
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  for (const docId of DOC_IDS) {
    try {
      const variables = JSON.stringify({
        shortcode,
        fetch_tagged_user_count: null,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
      });

      const params = new URLSearchParams();
      params.append('doc_id', docId);
      params.append('variables', variables);

      const response = await axios.post(
        'https://www.instagram.com/graphql/query',
        params.toString(),
        {
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000,
        }
      );

      const data = response.data;
      if (!data) continue;

      // Extract media item from various response structures
      const media =
        data.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0] ||
        data.data?.xdt_shortcode_media ||
        data.data?.shortcode_media;

      if (media) {
        return parseMediaItem(media, shortcode, 'graphql');
      }
    } catch {
      // Continue to next docId on error
      continue;
    }
  }

  return null;
}

/**
 * Strategy 3: Fetch metadata via Instagram Embed Page
 * @param {string} shortcode
 * @returns {Promise<object|null>}
 */
async function fetchViaEmbed(shortcode, isReel = false) {
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

  try {
    const response = await axios.get(embedUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    });

    const html = response.data;
    if (!html || typeof html !== 'string') return null;

    const $ = cheerio.load(html);

    // 1. Direct <video> or <img> tag
    const videoSrc = $('video').attr('src');

    let rawVideoUrl = videoSrc;
    let captionText = $('div.Caption').text().trim() || '';
    let authorName = $('a.UsernameText').text().trim() || 'Instagram Creator';
    let thumbnailUrl = $('img.EmbeddedMediaImage').attr('src') || '';

    // Search JSON payload in scripts
    $('script').each((_, el) => {
      const text = $(el).html() || '';

      // Pattern: "video_url":"..."
      if (!rawVideoUrl) {
        const vMatch = text.match(/"video_url":"([^"]+)"/);
        if (vMatch && vMatch[1]) {
          rawVideoUrl = JSON.parse(`"${vMatch[1]}"`);
        }
      }

      // Pattern: display_url (thumbnail)
      if (!thumbnailUrl) {
        const tMatch = text.match(/"display_url":"([^"]+)"/);
        if (tMatch && tMatch[1]) {
          thumbnailUrl = JSON.parse(`"${tMatch[1]}"`);
        }
      }

      // Pattern: username
      if (authorName === 'Instagram Creator') {
        const uMatch = text.match(/"username":"([^"]+)"/);
        if (uMatch && uMatch[1]) {
          authorName = uMatch[1];
        }
      }

      // Pattern: caption text
      if (!captionText) {
        const cMatch = text.match(/"caption":{"text":"([^"]+)"/);
        if (cMatch && cMatch[1]) {
          try {
            captionText = JSON.parse(`"${cMatch[1]}"`);
          } catch {
            captionText = cMatch[1];
          }
        }
      }
    });

    // If it's a Reel, we MUST have a real video URL, otherwise return null
    // so we don't falsely return the cover thumbnail as the reel download.
    if (rawVideoUrl || (thumbnailUrl && !isReel)) {
      const isVideo = Boolean(rawVideoUrl);
      const mediaUrl = rawVideoUrl || thumbnailUrl;
      const mediaType = isVideo ? 'video' : 'image';

      return {
        id: shortcode,
        shortcode,
        title: captionText ? truncate(captionText, 120) : `Instagram ${isVideo ? 'Reel' : 'Foto'} #${shortcode}`,
        caption: captionText || 'Tidak ada deskripsi caption.',
        author: {
          username: authorName,
          name: authorName,
        },
        thumbnail: thumbnailUrl || null,
        videoUrl: isVideo ? rawVideoUrl : null,
        imageUrl: !isVideo ? thumbnailUrl : null,
        mediaUrl,
        mediaType,
        downloadUrl: `/api/reels/download?url=${encodeURIComponent(mediaUrl)}&code=${shortcode}&type=${mediaType}`,
        isReel: isVideo,
        source: 'embed',
      };
    }
  } catch {
    // Fail gracefully to next layer
  }

  return null;
}

/**
 * Strategy 4: Optional RapidAPI / Fallback Provider
 */
async function fetchViaRapidApi(shortcode, cleanUrl) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com';

  if (!apiKey) return null;

  try {
    const response = await axios.get(`https://${apiHost}/`, {
      params: { url: cleanUrl },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (data && (data.media || data.url || data.video_url || data.image)) {
      const media = data.media || data.video_url || data.url || data.image;
      const isVideo = Boolean(data.video_url || data.media?.includes('.mp4') || data.url?.includes('.mp4'));
      const mediaType = isVideo ? 'video' : 'image';

      return {
        id: shortcode,
        shortcode,
        title: data.title || `Instagram ${isVideo ? 'Reel' : 'Foto'} #${shortcode}`,
        caption: data.title || '',
        author: {
          username: data.owner || 'Instagram Creator',
        },
        thumbnail: data.thumbnail || (!isVideo ? media : null),
        videoUrl: isVideo ? media : null,
        imageUrl: !isVideo ? media : null,
        mediaUrl: media,
        mediaType,
        downloadUrl: `/api/reels/download?url=${encodeURIComponent(media)}&code=${shortcode}&type=${mediaType}`,
        isReel: isVideo,
        source: 'rapidapi',
      };
    }
  } catch {
    // Ignore fallback error
  }

  return null;
}

/**
 * Strategy 1b: Fetch via Instagram Web Media Info Endpoint
 * This endpoint matches the user's web browser session directly.
 */
async function fetchViaWebMediaInfo(shortcode) {
  const cookie = getActiveCookie();
  if (!cookie) return null;

  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId) return null;

  try {
    const response = await axios.get(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Cookie': cookie,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '936619743392459',
        'Origin': 'https://www.instagram.com',
        'Referer': `https://www.instagram.com/p/${shortcode}/`,
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      timeout: 8000,
    });

    const items = response.data?.items;
    if (items && items.length > 0) {
      return parseMediaItem(items[0], shortcode, 'web_media_info');
    }
  } catch {
    // Fail gracefully
  }

  return null;
}

/**
 * Strategy 1c: Fetch via Instagram Web Dis query
 */
async function fetchViaWebDDis(shortcode) {
  const cookie = getActiveCookie();
  if (!cookie) return null;

  try {
    const response = await axios.get(`https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Cookie': cookie,
        'Accept': '*/*',
        'X-IG-App-ID': '936619743392459',
        'Referer': `https://www.instagram.com/p/${shortcode}/`,
      },
      timeout: 8000,
    });

    const items = response.data?.items;
    if (items && items.length > 0) {
      return parseMediaItem(items[0], shortcode, 'web_dis');
    }
    const graphql = response.data?.graphql?.shortcode_media;
    if (graphql) {
      return parseMediaItem(graphql, shortcode, 'web_dis');
    }
  } catch {
    // Fail gracefully
  }

  return null;
}

/**
 * Normalizes media object from API/GraphQL response (Supports BOTH Video and Photo)
 */
function parseMediaItem(media, shortcode, sourceName) {
  // Check video versions
  const videoVersions = media.video_versions || [];
  let videoUrl = null;

  if (videoVersions.length > 0) {
    videoUrl = videoVersions[0]?.url;
  } else if (media.video_url) {
    videoUrl = media.video_url;
  }

  // Thumbnails / Image
  const candidates = media.image_versions2?.candidates || [];
  const thumbnail = candidates[0]?.url || media.display_url || null;

  // Is Video or Image
  const isVideo = Boolean(videoUrl || media.is_video === true);
  const mediaUrl = isVideo ? videoUrl : thumbnail;

  if (!mediaUrl) {
    return null;
  }

  const mediaType = isVideo ? 'video' : 'image';

  // Caption
  const captionText =
    media.caption?.text ||
    media.edge_media_to_caption?.edges?.[0]?.node?.text ||
    '';

  // Author
  const owner = media.owner || media.user || {};
  const username = owner.username || 'Instagram User';
  const fullName = owner.full_name || username;
  const profilePic = owner.profile_pic_url || null;

  // View & like count
  const playCount = media.play_count || media.view_count || null;
  const likeCount = media.like_count || media.edge_media_preview_like?.count || null;
  const videoDuration = media.video_duration || null;

  return {
    id: shortcode,
    shortcode,
    title: captionText
      ? truncate(captionText, 140)
      : `Instagram ${isVideo ? 'Reel' : 'Foto'} by @${username}`,
    caption: captionText || 'Tidak ada deskripsi caption.',
    author: {
      username,
      name: fullName,
      profilePic,
    },
    thumbnail,
    videoUrl: isVideo ? videoUrl : null,
    imageUrl: !isVideo ? thumbnail : null,
    mediaUrl,
    mediaType,
    downloadUrl: `/api/reels/download?url=${encodeURIComponent(mediaUrl)}&code=${shortcode}&type=${mediaType}`,
    duration: videoDuration ? Math.round(videoDuration) : null,
    stats: {
      likes: likeCount,
      plays: playCount,
    },
    isReel: isVideo,
    source: sourceName || 'instagram',
  };
}

/**
 * Truncates string safely
 */
function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.slice(0, length).trim() + '...' : str;
}

/**
 * Master method: orchestrates all extraction strategies in sequence
 * @param {string} shortcode
 * @param {string} cleanUrl
 * @returns {Promise<object>}
 */
async function getReelInfo(shortcode, cleanUrl) {
  const isReel = cleanUrl ? (cleanUrl.includes('/reel/') || cleanUrl.includes('/reels/')) : false;

  // Strategy 1: Web Media Info (Highest reliability when user cookie is provided)
  const webResult = await fetchViaWebMediaInfo(shortcode);
  if (webResult && webResult.mediaUrl) {
    return webResult;
  }

  // Strategy 2: Mobile App API
  const mobileResult = await fetchViaMobileApi(shortcode);
  if (mobileResult && mobileResult.mediaUrl) {
    return mobileResult;
  }

  // Strategy 3: GraphQL Web Query
  const gqlResult = await fetchViaGraphQL(shortcode);
  if (gqlResult && gqlResult.mediaUrl) {
    return gqlResult;
  }

  // Strategy 4: Web Dis API
  const disResult = await fetchViaWebDDis(shortcode);
  if (disResult && disResult.mediaUrl) {
    return disResult;
  }

  // Strategy 5: Embed Page Parser (Pass isReel to avoid returning cover photo as Reel download)
  const embedResult = await fetchViaEmbed(shortcode, isReel);
  if (embedResult && embedResult.mediaUrl) {
    return embedResult;
  }

  // Strategy 6: Optional RapidAPI / Fallback
  const apiResult = await fetchViaRapidApi(shortcode, cleanUrl);
  if (apiResult && apiResult.mediaUrl) {
    return apiResult;
  }

  // If all strategies fail, throw an honest, polite error with guidance
  const hasCookie = Boolean(getActiveCookie());
  let errorMessage = '';
  let errorCode = 'MEDIA_UNAVAILABLE';

  if (isReel) {
    errorCode = 'REEL_VIDEO_LOCKED';
    if (!hasCookie) {
      errorMessage =
        'Instagram mengunci file video (.MP4) untuk Reels ini dan membatasi akses tanpa login. Silakan masukkan Cookie / Session ID akun Instagram Anda melalui menu Pengaturan (ikon gear di kanan atas) atau tombol di bawah agar video dapat diunduh.';
    } else {
      errorMessage =
        'Gagal mengambil video Reels. Cookie / Session ID Anda mungkin telah kedaluwarsa atau video ini berada di akun privat. Silakan perbarui Session ID Anda melalui menu Pengaturan.';
    }
  } else {
    errorMessage =
      'Tidak dapat mengakses konten Instagram ini. Video/foto kemungkinan bersifat privat, telah dihapus, memiliki pembatasan wilayah/usia, atau Instagram membatasi akses tanpa login.';
  }

  const err = new Error(errorMessage);
  err.code = errorCode;
  err.status = 401;
  err.needsCookie = true;
  throw err;
}

/**
 * Streams the video or photo file from Instagram CDN directly to client response
 * with attachment header for real file download.
 * @param {string} mediaUrl
 * @param {string} shortcode
 * @param {import('express').Response} res
 */
async function streamVideoDownload(mediaUrl, shortcode, res) {
  const isImage =
    res.req?.query?.type === 'image' ||
    mediaUrl.includes('.jpg') ||
    mediaUrl.includes('.jpeg') ||
    mediaUrl.includes('.webp') ||
    mediaUrl.includes('photo');

  const ext = isImage ? 'jpg' : 'mp4';
  const defaultMime = isImage ? 'image/jpeg' : 'video/mp4';
  const safeFilename = `reelsnap-${shortcode || 'media'}.${ext}`;

  try {
    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/',
      },
      timeout: 25000,
    });

    const contentLength = response.headers['content-length'];
    const contentType = response.headers['content-type'] || defaultMime;

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe stream directly to client
    response.data.pipe(res);

    // Handle client disconnect gracefully
    res.on('close', () => {
      if (!res.writableEnded) {
        response.data.destroy();
      }
    });

    response.data.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'Gagal mengunduh stream media dari server penyedia.',
          code: 'STREAM_FAILED',
        });
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: 'Tautan media telah kedaluwarsa atau server media menolak koneksi.',
        code: 'CDN_FETCH_ERROR',
      });
    }
  }
}

module.exports = {
  getReelInfo,
  streamVideoDownload,
  updateActiveCookie,
  getActiveCookie,
};
