module.exports = async function handler(request, response) {
  const target = String(request.query.target || '').trim();

  if (!target) {
    response.status(400).json({ success: false, message: 'Falta el parametro target.' });
    return;
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(target);
      Object.entries(request.query).forEach(([key, value]) => {
        if (key === 'target') return;
        url.searchParams.set(key, String(value));
      });

      const proxied = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
      });
      const text = await proxied.text();
      response.setHeader('Content-Type', proxied.headers.get('content-type') || 'application/json; charset=utf-8');
      response.status(proxied.status).send(text);
      return;
    }

    if (request.method === 'POST') {
      const proxied = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {}),
      });

      const text = await proxied.text();
      response.setHeader('Content-Type', proxied.headers.get('content-type') || 'application/json; charset=utf-8');
      response.status(proxied.status).send(text);
      return;
    }

    response.status(405).json({ success: false, message: 'Metodo no soportado.' });
  } catch (error) {
    response.status(500).json({ success: false, message: error.message || 'Error del proxy.' });
  }
}
