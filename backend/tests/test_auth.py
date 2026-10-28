import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.user import UserRole

def test_password_hashing():
    raw = "SecureRescue#2026"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_creation_and_decoding():
    token = create_access_token(subject=42, role=UserRole.COORDINATOR)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == "42"
    assert payload.get("role") == UserRole.COORDINATOR

def test_login_success(client, coordinator_user):
    response = client.post("/api/auth/login", json={
        "email": coordinator_user.email,
        "password": "CoordPass#123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == coordinator_user.email
    assert data["user"]["role"] == UserRole.COORDINATOR

def test_login_failure_wrong_password(client, coordinator_user):
    response = client.post("/api/auth/login", json={
        "email": coordinator_user.email,
        "password": "InvalidPassword"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_get_me_protected(client, coord_auth_headers, coordinator_user):
    response = client.get("/api/auth/me", headers=coord_auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == coordinator_user.email

def test_unauthorized_access(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
