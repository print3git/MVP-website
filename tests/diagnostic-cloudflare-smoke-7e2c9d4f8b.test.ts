// Diagnostic Cloudflare smoke test

describe('diagnostic cloudflare smoke', () => {
  test('fetches zone details', async () => {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const zone = process.env.CLOUDFLARE_ZONE_ID;
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || /<|example|token/i.test(token)) {
      throw new Error('CLOUDFLARE_API_TOKEN missing or placeholder');
    }
    if (!zone || /<|example|zone/i.test(zone)) {
      throw new Error('CLOUDFLARE_ZONE_ID missing or placeholder');
    }
    if (!account || /<|example|acct/i.test(account)) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID missing or placeholder');
    }
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Cloudflare API call failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error('Cloudflare API response not successful');
    }
  });
});
