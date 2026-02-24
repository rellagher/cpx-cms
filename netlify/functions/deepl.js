// netlify/functions/deepl.js
// Proxy for DeepL API — keeps API key server-side

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { texts, target_lang, source_lang = 'EN', tag_handling, action } = body;

  // Usage endpoint
  if (action === 'usage') {
    const resp = await fetch('https://api-free.deepl.com/v2/usage', {
      headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}` },
    });
    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  }

  if (!texts || !texts.length || !target_lang) {
    return { statusCode: 400, body: 'Missing texts or target_lang' };
  }

  try {
    const params = new URLSearchParams();
    for (const t of texts) params.append('text', t);
    params.append('target_lang', target_lang); // keep as-is, e.g. PT-PT not PT
    params.append('source_lang', source_lang.toUpperCase());
    if (tag_handling) params.append('tag_handling', tag_handling);
    params.append('formality', 'prefer_more'); // formal tone for brand content

    const resp = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: err }) };
    }

    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error('DeepL proxy error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
