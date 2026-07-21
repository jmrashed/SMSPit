from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_detect_spam_endpoint_flags_spam():
    response = client.post(
        "/detect-spam",
        json={"message": "CONGRATULATIONS! You WON a free prize, click here now!!! http://bit.ly/x"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_spam"] is True
    assert body["score"] > 0.5


def test_detect_spam_endpoint_does_not_flag_legitimate_messages():
    response = client.post("/detect-spam", json={"message": "See you at 5pm."})

    assert response.status_code == 200
    assert response.json() == {"is_spam": False, "score": 0.0}


def test_detect_spam_endpoint_rejects_an_empty_message():
    response = client.post("/detect-spam", json={"message": ""})

    assert response.status_code == 422


def test_detect_spam_endpoint_rejects_a_message_over_the_max_length():
    response = client.post("/detect-spam", json={"message": "a" * 1601})

    assert response.status_code == 422


def test_detect_spam_endpoint_accepts_a_message_at_the_max_length():
    message = ("x" * 1594) + " free"
    response = client.post("/detect-spam", json={"message": message})

    assert response.status_code == 200
