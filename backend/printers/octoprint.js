const axios = require('axios');

async function getPrinterStatus(baseUrl, apiKey = '') {
  const url = `${baseUrl.replace(/\/$/, '')}/api/printer`;
  const res = await axios.get(url, {
    headers: apiKey ? { 'X-Api-Key': apiKey } : {},
    timeout: 5000,
  });
  const text = ((res.data && res.data.state && res.data.state.text) || '').toLowerCase();
  if (text.includes('printing') || text.includes('busy')) return 'printing';
  if (text.includes('error') || text.includes('offline')) return 'error';
  return 'idle';
}

module.exports = { getPrinterStatus };
