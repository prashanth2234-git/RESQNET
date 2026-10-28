import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User, UserRole
from app.models.responder import ResponderProfile, ResponderAvailability
from app.main import app

# In-memory SQLite for high-speed isolated tests
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session() -> Generator:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session) -> Generator:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def coordinator_user(db_session) -> User:
    user = User(
        email="test_coord@resqnet.org",
        full_name="Test Coordinator",
        hashed_password=hash_password("CoordPass#123"),
        role=UserRole.COORDINATOR,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def citizen_user(db_session) -> User:
    user = User(
        email="test_citizen@example.com",
        full_name="Test Citizen",
        hashed_password=hash_password("CitizenPass#123"),
        role=UserRole.CITIZEN,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def responder_user(db_session) -> User:
    user = User(
        email="test_responder@resqnet.org",
        full_name="Test Responder",
        hashed_password=hash_password("RespPass#123"),
        role=UserRole.RESPONDER,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = ResponderProfile(
        user_id=user.id,
        team="Test Rescue Squadron",
        supported_categories='["Rescue", "Medical assistance"]',
        max_concurrent_assignments=2,
        current_assignment_count=0,
        availability=ResponderAvailability.AVAILABLE
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def coord_auth_headers(coordinator_user) -> dict:
    token = create_access_token(subject=coordinator_user.id, role=coordinator_user.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def citizen_auth_headers(citizen_user) -> dict:
    token = create_access_token(subject=citizen_user.id, role=citizen_user.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def responder_auth_headers(responder_user) -> dict:
    token = create_access_token(subject=responder_user.id, role=responder_user.role)
    return {"Authorization": f"Bearer {token}"}
