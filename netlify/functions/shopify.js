// netlify/functions/shopify.js
// Proxy for Shopify Admin API — avoids CORS from browser
// All requests go through this function server-side

const SHOPIFY_STORE = 'cellpowerx.myshopify.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, endpoint, query, variables } = body;

  try {
    let result;

    if (type === 'graphql') {
      // GraphQL request
      const resp = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2026-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          },
          body: JSON.stringify({ query, variables: variables || {} }),
        }
      );
      result = await resp.json();

    } else if (type === 'rest') {
      // REST request
      const resp = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/2026-01/${endpoint}`,
        {
          headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
        }
      );
      result = await resp.json();

    } else {
      return { statusCode: 400, body: 'Invalid type — use "graphql" or "rest"' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error('Shopify proxy error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
