from app.services.classifier import classify


def test_classifies_otp_messages_first_even_if_other_keywords_present():
    assert classify("Your order confirmation OTP is 845231") == "otp"


def test_classifies_marketing_messages():
    assert classify("Huge SALE! 50% off everything, shop now!") == "marketing"


def test_classifies_transactional_messages():
    assert classify("Your order has shipped and will be delivered tomorrow.") == "transactional"


def test_classifies_unmatched_messages_as_other():
    assert classify("Hey, are we still meeting for lunch?") == "other"


def test_marketing_takes_priority_over_transactional_when_both_present():
    assert classify("Your subscription renewal is now 20% off - limited time offer!") == "marketing"
