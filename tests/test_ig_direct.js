const ig = require('instagram-url-direct');

async function testIgDirect() {
  const urls = [
    'https://www.instagram.com/reel/DAmN7uXh7uN/',
    'https://www.instagram.com/reel/DAj_c8jS5Uj/',
    'https://www.instagram.com/reel/DODi6v0TzY5/'
  ];

  for (const url of urls) {
    console.log('\n--- Testing with instagram-url-direct:', url);
    try {
      const res = await ig(url);
      console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testIgDirect();
