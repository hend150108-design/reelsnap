const axios = require('axios');

async function testEndpoints(shortcode) {
  console.log('Testing GraphQL query_hash for:', shortcode);
  const hashes = [
    'b3055c2c47792275417003735295e411',
    '2b0673e32d10f601b305beedd731707c',
    '477b65a57045375f4c7d7f0f66413206',
    '9f8827793ef34641b2fb195d4d41151c',
  ];

  for (const hash of hashes) {
    try {
      const url = `https://www.instagram.com/graphql/query/?query_hash=${hash}&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'X-IG-App-ID': '936619743392459',
          'Referer': `https://www.instagram.com/p/${shortcode}/`
        },
        timeout: 5000,
        validateStatus: () => true
      });
      console.log('Hash', hash, 'status:', res.status, 'len:', String(JSON.stringify(res.data)).length);
      if (res.data?.data) {
        console.log('Got data!', JSON.stringify(res.data).slice(0, 200));
      }
    } catch (e) {
      console.log('Hash', hash, 'err:', e.message);
    }
  }
}

testEndpoints('DAmN7uXh7uN');
