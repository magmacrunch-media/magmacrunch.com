#!/usr/bin/env node

const url = process.argv[2] || process.env.DISCORD_WEBHOOK_URL;

if (!url) {
  console.error('Usage: node scripts/test-discord-webhook.mjs <webhook-url>');
  console.error('   or: DISCORD_WEBHOOK_URL="..." node scripts/test-discord-webhook.mjs');
  process.exit(1);
}

const payload = {
  embeds: [{
    title: '⚠️ Arcade Services Down (TEST)',
    description: '**The following services are not responding:**\n- Chess\n- Checkers',
    fields: [
      {
        name: 'Diagnose',
        value: '```bash\nssh jake@192.168.1.16 \'sudo systemctl status arcade-* --no-pager\'\n```',
      },
      {
        name: 'Restart all',
        value: '```bash\nssh jake@192.168.1.16 \'sudo systemctl restart arcade-*\'\n```',
      },
    ],
    color: 16750848,
    footer: {
      text: 'This is a test message',
    },
  }],
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log(`Status: ${res.status} ${res.statusText}`);
if (!res.ok) {
  const body = await res.text();
  console.error(body);
}
