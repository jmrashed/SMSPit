"""Load test for Day 88 (checklist.md), targeting the gateway's public
surface the same way a real SMS-sending client would: capture a message,
then list/fetch it back.

Usage (see scripts/load-test/README.md for the full walkthrough):

    API_KEY=sms_live_xxx.yyy locust -f scripts/load-test/locustfile.py \
        --host http://127.0.0.1:8080 --headless -u 50 -r 10 -t 1m \
        --csv scripts/load-test/results/baseline
"""

import os
import random
import string

from locust import HttpUser, between, task

API_KEY = os.environ.get("API_KEY", "")


def random_phone() -> str:
    return "+1" + "".join(random.choices(string.digits, k=10))


class SmsPitUser(HttpUser):
    # Mimics a client that sends a message, then occasionally checks the
    # inbox -- not a tight loop, so latency numbers reflect a somewhat
    # realistic request cadence rather than max-throughput hammering.
    wait_time = between(0.2, 1.0)

    def on_start(self) -> None:
        self.headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}

    @task(5)
    def capture_message(self) -> None:
        payload = {
            "to": random_phone(),
            "from": "SMSPit",
            "message": "Your OTP is 123456",
        }
        with self.client.post(
            "/api/v1/messages", json=payload, headers=self.headers, name="POST /api/v1/messages", catch_response=True
        ) as resp:
            if resp.status_code != 201:
                resp.failure(f"expected 201, got {resp.status_code}: {resp.text[:200]}")

    @task(3)
    def list_messages(self) -> None:
        with self.client.get(
            "/api/v1/messages?limit=20", headers=self.headers, name="GET /api/v1/messages", catch_response=True
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"expected 200, got {resp.status_code}: {resp.text[:200]}")

    @task(1)
    def statistics(self) -> None:
        with self.client.get(
            "/api/v1/statistics", headers=self.headers, name="GET /api/v1/statistics", catch_response=True
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"expected 200, got {resp.status_code}: {resp.text[:200]}")
