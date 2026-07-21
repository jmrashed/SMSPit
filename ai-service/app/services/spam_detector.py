import re

_SPAM_KEYWORDS_PATTERN = re.compile(
    r"\b(free|winner|winning|won|congratulations|urgent|act now|act fast|"
    r"claim your prize|prize|limited time|guarantee(?:d)?|risk[- ]free|no cost|"
    r"click here|call now|cash|loan|credit card|100% free)\b",
    re.IGNORECASE,
)
_URL_PATTERN = re.compile(r"https?://\S+|\bwww\.\S+", re.IGNORECASE)
_ALL_CAPS_WORD_PATTERN = re.compile(r"\b[A-Z]{4,}\b")

SPAM_THRESHOLD = 0.5


def spam_score(message: str) -> float:
    score = 0.0

    keyword_hits = len(set(match.lower() for match in _SPAM_KEYWORDS_PATTERN.findall(message)))
    score += min(keyword_hits * 0.2, 0.6)

    if message.count("!") >= 3:
        score += 0.2

    if _URL_PATTERN.search(message):
        score += 0.15

    if _ALL_CAPS_WORD_PATTERN.search(message):
        score += 0.15

    return min(score, 1.0)


def is_spam(message: str) -> bool:
    return spam_score(message) >= SPAM_THRESHOLD
