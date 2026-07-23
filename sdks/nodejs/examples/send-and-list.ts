// Run with: SMSPIT_API_KEY=... npm run example
import { Client } from '../src/index.js';

const apiKey = process.env.SMSPIT_API_KEY;
if (!apiKey) throw new Error('Set SMSPIT_API_KEY');

const client = new Client({
  baseUrl: process.env.SMSPIT_BASE_URL ?? 'http://localhost:8080',
  apiKey,
});

const message = await client.send('+8801700000000', 'SMSPit', 'Your OTP is 123456');
console.log(`Captured ${message.id} (otp: ${message.otp})`);

const replay = await client.replay(message.id);
console.log(`Replayed as ${replay.id}`);

const page = await client.list({ limit: 5 });
console.log(`Inbox has ${page.total} message(s) total, showing ${page.limit}:`);
for (const inboxMessage of page.messages) {
  console.log(`  - ${inboxMessage.id}: ${inboxMessage.from} -> ${inboxMessage.to}: ${inboxMessage.message}`);
}
