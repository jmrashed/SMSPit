> Mirrored from [`sdks/python/`](https://github.com/jmrashed/SMSPit/tree/main/sdks/python) in the main repo — that's the source of truth; update there and re-sync this page.

# smspit (Python)

Python client for SMSPit's native REST API. Built on `urllib` (stdlib only) -- no third-party HTTP dependency (`requests` etc.).

**Status:** send/list/get/replay implemented. Not yet published to PyPI.

## Install (editable, until published)

```sh
pip install -e /path/to/SMSPit/sdks/python
```

## Usage

```python
from smspit import Client

client = Client("http://localhost:8080", "sms_live_xxx.yyy")

message = client.send(to="+8801700000000", from_="SMSPit", message="Your OTP is 123456")
client.replay(message.id)
inbox = client.list(limit=20)
```

See [`examples/send_and_list.py`](https://github.com/jmrashed/SMSPit/blob/main/sdks/python/examples/send_and_list.py) for a runnable example (`SMSPIT_API_KEY=... python examples/send_and_list.py`).

## Development

```sh
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
```
