import io
import json
import urllib.error
from unittest.mock import patch

import pytest

from smspit import ApiError, Client

SAMPLE_MESSAGE = {
    "id": "sms_abc123",
    "to": "+8801700000000",
    "from": "SMSPit",
    "message": "Your OTP is 123456",
    "status": "captured",
    "otp": "123456",
    "category": "otp",
    "is_spam": False,
    "replayed_from": None,
    "org_id": None,
    "created_at": "2026-07-24T00:00:00.000Z",
}


class FakeResponse:
    def __init__(self, status: int, body: dict):
        self.status = status
        self._body = json.dumps(body).encode("utf-8")

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_send_posts_the_payload_and_returns_a_message():
    client = Client("http://localhost:8080", "sms_live_x.y")

    with patch("urllib.request.urlopen", return_value=FakeResponse(201, SAMPLE_MESSAGE)) as mock_urlopen:
        message = client.send("+8801700000000", "SMSPit", "Your OTP is 123456")

    assert message.id == "sms_abc123"
    assert message.otp == "123456"
    request = mock_urlopen.call_args[0][0]
    assert request.full_url == "http://localhost:8080/api/v1/messages"
    assert request.get_method() == "POST"
    assert json.loads(request.data) == {
        "to": "+8801700000000",
        "from": "SMSPit",
        "message": "Your OTP is 123456",
    }
    assert request.get_header("Authorization") == "Bearer sms_live_x.y"


def test_list_passes_filters_as_query_params():
    body = {"messages": [SAMPLE_MESSAGE], "total": 1, "limit": 20, "offset": 0}
    client = Client("http://localhost:8080", "sms_live_x.y")

    with patch("urllib.request.urlopen", return_value=FakeResponse(200, body)) as mock_urlopen:
        result = client.list(to="+8801700000000", limit=20)

    assert len(result.messages) == 1
    assert result.messages[0].id == "sms_abc123"
    assert result.total == 1
    request = mock_urlopen.call_args[0][0]
    assert request.full_url in (
        "http://localhost:8080/api/v1/messages?to=%2B8801700000000&limit=20",
        "http://localhost:8080/api/v1/messages?limit=20&to=%2B8801700000000",
    )


def test_get_fetches_a_single_message_by_id():
    client = Client("http://localhost:8080", "sms_live_x.y")

    with patch("urllib.request.urlopen", return_value=FakeResponse(200, SAMPLE_MESSAGE)) as mock_urlopen:
        message = client.get("sms_abc123")

    request = mock_urlopen.call_args[0][0]
    assert request.full_url == "http://localhost:8080/api/v1/messages/sms_abc123"
    assert message.id == "sms_abc123"


def test_replay_posts_to_the_replay_endpoint():
    replayed = {**SAMPLE_MESSAGE, "id": "sms_def456", "replayed_from": "sms_abc123"}
    client = Client("http://localhost:8080", "sms_live_x.y")

    with patch("urllib.request.urlopen", return_value=FakeResponse(201, replayed)) as mock_urlopen:
        message = client.replay("sms_abc123")

    request = mock_urlopen.call_args[0][0]
    assert request.full_url == "http://localhost:8080/api/v1/messages/sms_abc123/replay"
    assert request.get_method() == "POST"
    assert message.replayed_from == "sms_abc123"


def test_error_responses_are_raised_as_api_error():
    error_body = json.dumps({"code": "NOT_FOUND", "message": "Message not found", "details": None}).encode()
    client = Client("http://localhost:8080", "sms_live_x.y")

    http_error = urllib.error.HTTPError(
        url="http://localhost:8080/api/v1/messages/sms_missing",
        code=404,
        msg="Not Found",
        hdrs=None,
        fp=io.BytesIO(error_body),
    )

    with patch("urllib.request.urlopen", side_effect=http_error):
        with pytest.raises(ApiError) as exc_info:
            client.get("sms_missing")

    assert exc_info.value.status == 404
    assert exc_info.value.code == "NOT_FOUND"
