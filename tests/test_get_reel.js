const instagramService = require('../server/services/instagram');

async function testReel() {
  const shortcodes = ['DAj_c8jS5Uj', 'DNl8z81z5tW', 'DODi6v0TzY5', 'DAmN7uXh7uN'];
  for (const sc of shortcodes) {
    console.log('\n=== Testing getReelInfo for shortcode:', sc, '===');
    try {
      const info = await instagramService.getReelInfo(sc, `https://www.instagram.com/reel/${sc}/`);
      console.log('SUCCESS RESULT:');
      console.log('Source:', info.source);
      console.log('Media Type:', info.mediaType);
      console.log('Video URL:', info.videoUrl ? info.videoUrl.slice(0, 100) : 'NULL');
      console.log('Image URL:', info.imageUrl ? info.imageUrl.slice(0, 100) : 'NULL');
      console.log('Caption:', info.caption?.slice(0, 80));
    } catch (err) {
      console.log('FAILED:', err.message, 'status:', err.status);
    }
  }
}

testReel();
