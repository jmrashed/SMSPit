from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_test_data_endpoint_returns_the_requested_count():
    response = client.post("/generate-test-data", json={"count": 3, "type": "otp"})

    assert response.status_code == 200
    body = response.json()
    assert len(body["messages"]) == 3
    assert all(m["type"] == "otp" for m in body["messages"])
    assert all(set(m.keys()) == {"to", "from", "message", "type"} for m in body["messages"])


def test_generate_test_data_endpoint_defaults_to_five_random_messages():
    response = client.post("/generate-test-data", json={})

    assert response.status_code == 200
    assert len(response.json()["messages"]) == 5


def test_generate_test_data_endpoint_rejects_a_count_above_the_max():
    response = client.post("/generate-test-data", json={"count": 51})

    assert response.status_code == 422


def test_generate_test_data_endpoint_rejects_an_invalid_type():
    response = client.post("/generate-test-data", json={"type": "not-a-real-type"})

    assert response.status_code == 422


def test_generate_test_data_endpoint_rejects_a_count_below_the_min():
    response = client.post("/generate-test-data", json={"count": 0})

    assert response.status_code == 422


def test_generate_test_data_endpoint_accepts_the_max_count():
    response = client.post("/generate-test-data", json={"count": 50})

    assert response.status_code == 200
    assert len(response.json()["messages"]) == 50
