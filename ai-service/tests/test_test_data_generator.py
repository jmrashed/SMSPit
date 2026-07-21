import re

from app.services.test_data_generator import generate_messages


def test_generates_the_requested_count():
    messages = generate_messages(7, None)
    assert len(messages) == 7


def test_generates_messages_of_the_requested_type_only():
    messages = generate_messages(10, "marketing")
    assert all(m["type"] == "marketing" for m in messages)


def test_generated_otp_messages_contain_a_six_digit_code():
    messages = generate_messages(10, "otp")
    assert all(re.search(r"\b\d{6}\b", m["message"]) for m in messages)


def test_random_mix_can_produce_multiple_types():
    messages = generate_messages(30, None)
    types = {m["type"] for m in messages}
    assert len(types) > 1


def test_generated_phone_numbers_look_valid():
    messages = generate_messages(5, None)
    assert all(m["to"].startswith("+8801") and len(m["to"]) == 14 for m in messages)
