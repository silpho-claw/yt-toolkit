// Cloudflare Worker — Replicate API CORS Proxy
// Deploy: npx wrangler deploy
// Or paste into Cloudflare Dashboard > Workers > Quick Edit

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Only allow POST and GET
    if (!['POST', 'GET'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    // Get target URL from X-Target-URL header or path
    const targetUrl = request.headers.get('X-Target-URL');
    if (!targetUrl || !targetUrl.startsWith('https://api.replicate.com/')) {
      return new Response(JSON.stringify({ error: 'Invalid or missing X-Target-URL. Must start with https://api.replicate.com/' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // Forward the request
    const headers = new Headers();
    // Pass through auth and content-type
    const auth = request.headers.get('Authorization');
    if (auth) headers.set('Authorization', auth);
    headers.set('Content-Type', 'application/json');

    const fetchOptions = { method: request.method, headers };
    if (request.method === 'POST') {
      fetchOptions.body = await request.text();
    }

    try {
      const response = await fetch(targetUrl, fetchOptions);
      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL',
    'Access-Control-Max-Age': '86400',
  };
}
