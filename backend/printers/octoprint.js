const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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

async function uploadAndPrint(baseUrl, filePath, apiKey = '') {
  const sanitized = baseUrl.replace(/\/$/, '');
  const uploadUrl = `${sanitized}/api/files/local`;
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  await axios.post(uploadUrl, form, {
    headers: { ...form.getHeaders(), ...(apiKey ? { 'X-Api-Key': apiKey } : {}) },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  const fileName = path.basename(filePath);
  await axios.post(
    `${sanitized}/api/job`,
    { command: 'select', print: true, file: `local:${fileName}` },
    { headers: apiKey ? { 'X-Api-Key': apiKey } : {} }
  );
}

module.exports = { getPrinterStatus, uploadAndPrint };
