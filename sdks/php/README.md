# smspit/sdk (PHP)

PHP client for SMSPit's native REST API. No third-party HTTP client dependency (built on ext-curl) so it doesn't pull Guzzle or similar into a consuming project.

**Status:** send/list/get/replay implemented. Not yet published to Packagist.

## Install (local path, until published)

```json
{
    "repositories": [{"type": "path", "url": "../SMSPit/sdks/php"}],
    "require": {"smspit/sdk": "*"}
}
```

## Usage

```php
use SMSPit\Client;

$client = new Client('http://localhost:8080', 'sms_live_xxx.yyy');

$message = $client->send(to: '+8801700000000', from: 'SMSPit', message: 'Your OTP is 123456');
$client->replay($message->id);
$inbox = $client->list(['limit' => 20]);
```

See [examples/send-and-list.php](examples/send-and-list.php) for a runnable example (`SMSPIT_API_KEY=... php examples/send-and-list.php`).

## Development

```sh
composer install
composer test
```
