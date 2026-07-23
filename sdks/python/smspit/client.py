from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class Message:
    """Mirrors the REST response shape for a captured message (docs/api/message-mapping.md)."""

    id: str
    to: str
    from_: str
    message: str
    status: str
    otp: Optional[str]
    category: Optional[str]
    is_spam: Optional[bool]
    replayed_from: Optional[str]
    org_id: Optional[int]
    created_at: str

    @staticmethod
    def from_dict(data: dict[str, Any]) -> "Message":
        return Message(
            id=data["id"],
            to=data["to"],
            from_=data["from"],
            message=data["message"],
            status=data["status"],
            otp=data.get("otp"),
            category=data.get("category"),
            is_spam=data.get("is_spam"),
            replayed_from=data.get("replayed_from"),
            org_id=data.get("org_id"),
            created_at=data["created_at"],
        )


@dataclass(frozen=True)
class MessageList:
    """The envelope GET /api/v1/messages returns."""

    messages: list[Message]
    total: int
    limit: int
    offset: int


class ApiError(RuntimeError):
    """Raised when SMSPit responds with a non-2xx status, carrying its error envelope."""

    def __init__(self, status: int, code: str, message: str, details: Any = None):
        super().__init__(f"{code} (status {status}): {message}")
        self.status = status
        self.code = code
        self.details = details


class Client:
    """Talks to SMSPit's REST API.

    Point base_url at the gateway (or sms-service directly) and pass the
    full "{key}.{secret}" API key auth-service issued.
    """

    def __init__(self, base_url: str, api_key: str, timeout: float = 10.0):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout

    def send(self, to: str, from_: str, message: str) -> Message:
        """POST /api/v1/messages"""
        body = self._request("POST", "/api/v1/messages", body={"to": to, "from": from_, "message": message})
        return Message.from_dict(body)

    def list(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        to: Optional[str] = None,
        from_: Optional[str] = None,
        created_after: Optional[str] = None,
        created_before: Optional[str] = None,
    ) -> MessageList:
        """GET /api/v1/messages"""
        params = {
            "limit": limit,
            "offset": offset,
            "to": to,
            "from": from_,
            "created_after": created_after,
            "created_before": created_before,
        }
        query = {k: v for k, v in params.items() if v is not None}
        body = self._request("GET", "/api/v1/messages", query=query)
        return MessageList(
            messages=[Message.from_dict(m) for m in body["messages"]],
            total=body["total"],
            limit=body["limit"],
            offset=body["offset"],
        )

    def get(self, message_id: str) -> Message:
        """GET /api/v1/messages/{id}"""
        body = self._request("GET", f"/api/v1/messages/{urllib.parse.quote(message_id, safe='')}")
        return Message.from_dict(body)

    def replay(self, message_id: str) -> Message:
        """POST /api/v1/messages/{id}/replay -- re-sends the original payload as a new, linked message."""
        body = self._request("POST", f"/api/v1/messages/{urllib.parse.quote(message_id, safe='')}/replay")
        return Message.from_dict(body)

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[dict[str, Any]] = None,
        query: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        if query:
            url += "?" + urllib.parse.urlencode(query)

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
        }
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                raw = response.read()
                status = response.status
        except urllib.error.HTTPError as error:
            raw = error.read()
            status = error.code

        parsed: dict[str, Any] = json.loads(raw) if raw else {}

        if status >= 400:
            raise ApiError(
                status=status,
                code=parsed.get("code", "UNKNOWN_ERROR"),
                message=parsed.get("message", "SMSPit API request failed"),
                details=parsed.get("details"),
            )

        return parsed
