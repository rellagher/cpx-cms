// netlify/functions/translations.js
// Reads and writes translations.json directly to GitHub repository
// Translations persist independently of CMS deploys

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const FILE_PATH    = 'translations.json';

const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

const headers = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

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

  const { action } = body;

  // ── GET translations ──────────────────────────────────────
  if (action === 'get') {
    try {
      const resp = await fetch(GITHUB_API, { headers });

      if (resp.status === 404) {
        // File doesn't exist yet — return empty
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translations: {} }),
        };
      }

      if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);

      const data = await resp.json();
      const content = JSON.parse(
        Buffer.from(data.content, 'base64').toString('utf-8')
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translations: content, sha: data.sha }),
      };

    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── SAVE translations ─────────────────────────────────────
  if (action === 'save') {
    const { translations, sha } = body;
    if (!translations) {
      return { statusCode: 400, body: 'Missing translations' };
    }

    try {
      const content = Buffer.from(
        JSON.stringify(translations, null, 2)
      ).toString('base64');

      const payload = {
        message: `Update translations — ${new Date().toISOString()}`,
        content,
        ...(sha ? { sha } : {}), // sha required for updates, omit for first create
      };

      const resp = await fetch(GITHUB_API, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || `GitHub API error: ${resp.status}`);
      }

      const data = await resp.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, sha: data.content.sha }),
      };

    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 400, body: 'Invalid action — use "get" or "save"' };
};
