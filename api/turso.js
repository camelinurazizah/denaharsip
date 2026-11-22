/**
 * VERCEL SERVERLESS PROXY API FOR TURSO DATABASE
 * Menyediakan jalur aman eksekusi SQL Turso di server Vercel
 * Menggunakan Environment Variables (TURSO_DATABASE_URL & TURSO_AUTH_TOKEN)
 */

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const rawUrl = process.env.TURSO_DATABASE_URL || 'https://denaharsip-camelinurazizah.aws-ap-southeast-1.turso.io';
  const token = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicm8iLCJpYXQiOjE3OTUwMTAzNzIsImlkIjoiMDFhMWU4OTEtNDgwMS03OTc5LThlZjItODU1YjZjMGZkOTkxIiwia2lkIjoiaFBuOFloLV9QZHU4d3B5LUFZdUdNZ3RDVnVJT2gzWlRTa0JQMTVDeVpxWSIsInJpZCI6IjdhODk1NTQ1LTc3NTctNDFjMy04ZmNmLTdlZDJlM2JiNzRjYiJ9.LEnLP5IefRjJFUJAv5TynU8UIpzE1YthZeKYaCT8qI3TrCKIy6PHfzuVz3CoP2JM1AXBOGp_HtpaPue66ur2Dw';

  let cleanUrl = String(rawUrl).trim();
  if (cleanUrl.startsWith('libsql://')) {
    cleanUrl = 'https://' + cleanUrl.slice('libsql://'.length);
  }
  cleanUrl = cleanUrl.replace(/\/+$/, '');
  const pipelineUrl = cleanUrl + '/v2/pipeline';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const requests = body.requests;

    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({ error: 'Format permintaan tidak valid: array requests dibutuhkan.' });
    }

    const response = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Turso Serverless Proxy Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
