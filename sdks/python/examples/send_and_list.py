"""Run with: SMSPIT_API_KEY=... python examples/send_and_list.py"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from smspit import Client

api_key = os.environ.get("SMSPIT_API_KEY")
if not api_key:
    raise SystemExit("Set SMSPIT_API_KEY")

client = Client(
    base_url=os.environ.get("SMSPIT_BASE_URL", "http://localhost:8080"),
    api_key=api_key,
)

message = client.send(to="+8801700000000", from_="SMSPit", message="Your OTP is 123456")
print(f"Captured {message.id} (otp: {message.otp})")

replay = client.replay(message.id)
print(f"Replayed as {replay.id}")

page = client.list(limit=5)
print(f"Inbox has {page.total} message(s) total, showing {page.limit}:")
for inbox_message in page.messages:
    print(f"  - {inbox_message.id}: {inbox_message.from_} -> {inbox_message.to}: {inbox_message.message}")
