> Mirrored from [`sdks/nodejs/`](https://github.com/jmrashed/SMSPit/tree/main/sdks/nodejs) in the main repo — that's the source of truth; update there and re-sync this page.

# @smspit/sdk (Node.js)

Node.js/TypeScript client for SMSPit's native REST API. Built on the global `fetch` (Node 18+) -- no third-party HTTP dependency.

**Status:** send/list/get/replay implemented. Not yet published to npm.

## Install (local path, until published)

```json
{
  "dependencies": {
    "@smspit/sdk": "file:../SMSPit/sdks/nodejs"
  }
}
```

## Usage

```ts
import { Client } from '@smspit/sdk';

const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_xxx.yyy' });

const message = await client.send('+8801700000000', 'SMSPit', 'Your OTP is 123456');
await client.replay(message.id);
const inbox = await client.list({ limit: 20 });
```

See [`examples/send-and-list.ts`](https://github.com/jmrashed/SMSPit/blob/main/sdks/nodejs/examples/send-and-list.ts) for a runnable example (`SMSPIT_API_KEY=... npm run example`).

## Development

```sh
npm install
npm test
npm run build
```
