const axios = require('axios');
const fs = require('fs');

async function dumpEmbed() {
  const shortcode = 'DAmN7uXh7uN';
  const url = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = res.data;
  console.log('HTML length:', html.length);
  
  // Search for any cdninstagram or fbcdn links in the entire HTML
  const allUrls = html.match(/https?:\\\/\\\/[^"'\s<>]+\.mp4[^"'\s<>]*/g) || [];
  console.log('mp4 URLs found in raw embed:', allUrls.length);

  // Search for any video json keys
  const keys = ['video_versions', 'video_url', 'is_video', 'video_duration', 'has_audio', 'playback_url'];
  for (const k of keys) {
    const idx = html.indexOf(k);
    console.log(`Key ${k} found at index:`, idx);
    if (idx !== -1) {
      console.log('Context:', html.slice(idx - 50, idx + 200));
    }
  }

  // Look for EmbeddedMediaImage or EmbeddedMediaVideo
  const videoClass = html.indexOf('EmbeddedMediaVideo');
  console.log('EmbeddedMediaVideo index:', videoClass);
  if (videoClass !== -1) {
    console.log('Context:', html.slice(videoClass - 50, videoClass + 300));
  }
}

dumpEmbed();
