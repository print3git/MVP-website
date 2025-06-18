const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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
