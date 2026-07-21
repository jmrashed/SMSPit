from app.services.otp_detector import detect_otp


def test_detects_otp_after_keyword():
    assert detect_otp("Your OTP is 845231") == "845231"


def test_detects_otp_case_insensitively_and_with_colon():
    assert detect_otp("verification code: 4821") == "4821"


def test_detects_otp_for_one_time_password_phrasing():
    assert detect_otp("Your one-time password is 991122") == "991122"


def test_prefers_keyword_adjacent_code_over_other_numbers():
    assert detect_otp("Order 778899 confirmed. Your OTP is 112233") == "112233"


def test_falls_back_to_bare_digit_run_when_no_keyword_present():
    assert detect_otp("845231 is your code to sign in") == "845231"


def test_returns_none_when_no_digit_run_is_present():
    assert detect_otp("Thanks for signing up!") is None


def test_returns_none_for_digit_runs_outside_the_length_range():
    assert detect_otp("Call 123 or visit ext. 12") is None
