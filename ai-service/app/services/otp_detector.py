import re

# A code near one of these keywords is almost certainly the OTP, even
# when the message contains other numbers (order IDs, amounts, phone
# numbers). Falls back to the first bare digit run if no keyword hits.
_KEYWORD_PATTERN = re.compile(
    r"(?:otp|verification code|passcode|pin|one[- ]time password|code)\D{0,10}(\d{4,8})",
    re.IGNORECASE,
)
_BARE_DIGITS_PATTERN = re.compile(r"\b(\d{4,8})\b")


def detect_otp(message: str) -> str | None:
    keyword_match = _KEYWORD_PATTERN.search(message)
    if keyword_match:
        return keyword_match.group(1)

    bare_match = _BARE_DIGITS_PATTERN.search(message)
    if bare_match:
        return bare_match.group(1)

    return None
