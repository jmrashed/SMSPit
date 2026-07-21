from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_detect_otp_endpoint_returns_the_detected_code():
    response = client.post("/detect-otp", json={"message": "Your OTP is 845231"})

    assert response.status_code == 200
    assert response.json() == {"detected": True, "otp": "845231"}


def test_detect_otp_endpoint_returns_not_detected_for_a_plain_message():
    response = client.post("/detect-otp", json={"message": "Thanks for signing up!"})

    assert response.status_code == 200
    assert response.json() == {"detected": False, "otp": None}


def test_detect_otp_endpoint_rejects_an_empty_message():
    response = client.post("/detect-otp", json={"message": ""})

    assert response.status_code == 422


def test_detect_otp_endpoint_rejects_a_message_over_the_max_length():
    response = client.post("/detect-otp", json={"message": "a" * 1601})

    assert response.status_code == 422


def test_detect_otp_endpoint_accepts_a_message_at_the_max_length():
    message = ("x" * 1593) + " 845231"
    response = client.post("/detect-otp", json={"message": message})

    assert response.status_code == 200
    assert response.json() == {"detected": True, "otp": "845231"}


def test_detect_otp_endpoint_rejects_a_missing_message_field():
    response = client.post("/detect-otp", json={})

    assert response.status_code == 422
