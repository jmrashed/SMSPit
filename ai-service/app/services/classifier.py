import re

from app.services.otp_detector import detect_otp

_MARKETING_PATTERN = re.compile(
    r"\b(discount|sale|offer|promo(?:tion)?|free|buy now|limited time|% ?off|deal|coupon|unsubscribe|shop now)\b",
    re.IGNORECASE,
)
_TRANSACTIONAL_PATTERN = re.compile(
    r"\b(order|payment|invoice|receipt|shipped|delivered|delivery|confirmed|confirmation|"
    r"account|balance|transaction|refund|subscription|renewal)\b",
    re.IGNORECASE,
)

Category = str  # "otp" | "transactional" | "marketing" | "other"


def classify(message: str) -> Category:
    if detect_otp(message) is not None:
        return "otp"

    if _MARKETING_PATTERN.search(message):
        return "marketing"

    if _TRANSACTIONAL_PATTERN.search(message):
        return "transactional"

    return "other"
