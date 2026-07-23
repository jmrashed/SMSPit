"""Python client for SMSPit's native REST API (send, list, get, replay).

Built on urllib (stdlib only) -- no third-party HTTP dependency (requests etc.).
"""

from .client import ApiError, Client, Message, MessageList

__all__ = ["Client", "Message", "MessageList", "ApiError"]
