from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_classify_endpoint_returns_the_category():
    response = client.post("/classify", json={"message": "Your OTP is 845231"})

    assert response.status_code == 200
    assert response.json() == {"category": "otp"}


def test_classify_endpoint_returns_other_for_unmatched_messages():
    response = client.post("/classify", json={"message": "See you tomorrow!"})

    assert response.status_code == 200
    assert response.json() == {"category": "other"}


def test_classify_endpoint_rejects_an_empty_message():
    response = client.post("/classify", json={"message": ""})

    assert response.status_code == 422


def test_classify_endpoint_rejects_a_message_over_the_max_length():
    response = client.post("/classify", json={"message": "a" * 1601})

    assert response.status_code == 422


def test_classify_endpoint_accepts_a_message_at_the_max_length():
    message = "free " + ("x" * 1595)
    response = client.post("/classify", json={"message": message})

    assert response.status_code == 200
    assert response.json() == {"category": "marketing"}
