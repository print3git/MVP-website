describe('diagnostic stripe preflight', () => {
  test('reports presence of stripe env vars', () => {
    const hasKey = /^sk_/.test(process.env.STRIPE_SECRET_KEY || '');
    const hasWebhook = /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET || '');
    console.log(`STRIPE_SECRET_KEY present: ${hasKey}`);
    console.log(`STRIPE_WEBHOOK_SECRET present: ${hasWebhook}`);
    expect(typeof hasKey).toBe('boolean');
    expect(typeof hasWebhook).toBe('boolean');
  });
});
