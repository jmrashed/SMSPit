from app.services.spam_detector import is_spam, spam_score


def test_flags_a_typical_spam_message():
    message = "CONGRATULATIONS! You are a WINNER! Claim your prize now, 100% free, click here: http://bit.ly/x!!!"
    assert is_spam(message) is True
    assert spam_score(message) > 0.5


def test_does_not_flag_a_legitimate_message():
    message = "Hey, are we still meeting for lunch tomorrow?"
    assert is_spam(message) is False
    assert spam_score(message) == 0.0


def test_does_not_flag_a_normal_otp_message():
    assert is_spam("Your OTP is 845231") is False


def test_score_increases_with_more_spam_signals():
    low = spam_score("This is a free gift for you.")
    high = spam_score("FREE FREE FREE! Urgent! Claim your prize now!!! http://spam.example")
    assert high > low


def test_score_is_capped_at_one():
    message = "FREE WINNER URGENT CLAIM YOUR PRIZE GUARANTEED CASH LOAN CREDIT CARD!!! http://x.com http://y.com"
    assert spam_score(message) <= 1.0
