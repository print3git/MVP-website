const axios = require('axios');

async function getPrinterInfo(baseUrl, apiKey = '') {
  const root = baseUrl.replace(/\/$/, '');
  const headers = apiKey ? { 'X-Api-Key': apiKey } : {};
  const printerRes = await axios.get(`${root}/api/printer`, { headers, timeout: 5000 });
  let status = 'idle';
  const text = (
    (printerRes.data && printerRes.data.state && printerRes.data.state.text) ||
    ''
  ).toLowerCase();
  if (text.includes('printing') || text.includes('busy')) status = 'printing';
  if (text.includes('error') || text.includes('offline')) status = 'error';

  let queueLength = 0;
  try {
    const jobRes = await axios.get(`${root}/api/job`, { headers, timeout: 5000 });
    if (jobRes.data && jobRes.data.job && jobRes.data.job.file && jobRes.data.job.file.name) {
      queueLength = 1;
    }
  } catch (_) {
    // ignore
  }

  const error = printerRes.data?.state?.error || null;
  return { status, queueLength, error };
}

async function getPrinterStatus(baseUrl, apiKey = '') {
  const info = await getPrinterInfo(baseUrl, apiKey);
  return info.status;
}

module.exports = { getPrinterStatus, getPrinterInfo };
