"""Backend tests for profile + admin management (iteration 3)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://payment-manager-211.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "admin@example.com")
OWNER_PW = os.environ.get("OWNER_PASSWORD", "admin")
TS = int(time.time())
MEMBER_EMAIL = f"qa-{TS}@example.com"
MEMBER_PW = "MemberPass123!"
MEMBER_PW_NEW = "MemberPassReset123!"


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
    assert r.status_code == 200, f"owner login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


@pytest.fixture(scope="module")
def member(owner_headers):
    """Register a member, get owner to approve, return {id, token, email, password}."""
    m_email = f"qa-{time.time_ns()}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": m_email, "password": MEMBER_PW, "name": "QA Member"})
    assert r.status_code == 200, r.text
    uid = r.json()["user"]["id"]

    # cannot login before approve
    r_login = requests.post(f"{API}/auth/login", json={"email": m_email, "password": MEMBER_PW})
    assert r_login.status_code == 403

    # approve
    r_app = requests.post(f"{API}/admin/users/{uid}/approve", headers=owner_headers)
    assert r_app.status_code == 200, r_app.text

    # login
    r_login2 = requests.post(f"{API}/auth/login", json={"email": m_email, "password": MEMBER_PW})
    assert r_login2.status_code == 200
    token = r_login2.json()["access_token"]
    yield {"id": uid, "token": token, "email": m_email, "password": MEMBER_PW}

    # cleanup
    requests.delete(f"{API}/admin/users/{uid}", headers=owner_headers)


# ---- PATCH /auth/me ----
class TestProfileSelf:
    def test_update_name(self, owner_headers):
        r = requests.patch(f"{API}/auth/me", headers=owner_headers, json={"name": "Digivideas Kurucu"})
        assert r.status_code == 200
        assert r.json()["name"] == "Digivideas Kurucu"

    def test_email_requires_current_password(self, member):
        h = {"Authorization": f"Bearer {member['token']}"}
        r = requests.patch(f"{API}/auth/me", headers=h, json={"email": f"new-{TS}@example.com"})
        assert r.status_code == 400

    def test_new_password_requires_current_password(self, member):
        h = {"Authorization": f"Bearer {member['token']}"}
        r = requests.patch(f"{API}/auth/me", headers=h, json={"new_password": "ShouldNotWork1!"})
        assert r.status_code == 400

    def test_new_password_too_short(self, member):
        h = {"Authorization": f"Bearer {member['token']}"}
        r = requests.patch(f"{API}/auth/me", headers=h, json={
            "current_password": member["password"], "new_password": "short"
        })
        assert r.status_code == 400

    def test_change_password_and_login(self, member):
        h = {"Authorization": f"Bearer {member['token']}"}
        new_pw = "MemberSelfPw123!"
        r = requests.patch(f"{API}/auth/me", headers=h, json={
            "current_password": member["password"], "new_password": new_pw
        })
        assert r.status_code == 200
        # login with new
        r2 = requests.post(f"{API}/auth/login", json={"email": member["email"], "password": new_pw})
        assert r2.status_code == 200
        # revert to fixture pw
        h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
        r3 = requests.patch(f"{API}/auth/me", headers=h2, json={
            "current_password": new_pw, "new_password": member["password"]
        })
        assert r3.status_code == 200

    def test_avatar_valid_base64(self, owner_headers):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mMAAQAABQABDQotpAAAAABJRU5ErkJggg=="
        r = requests.patch(f"{API}/auth/me", headers=owner_headers, json={"avatar": img})
        assert r.status_code == 200
        assert r.json().get("avatar", "").startswith("data:image/")
        # cleanup avatar
        requests.patch(f"{API}/auth/me", headers=owner_headers, json={"avatar": ""})

    def test_avatar_invalid_format(self, owner_headers):
        r = requests.patch(f"{API}/auth/me", headers=owner_headers, json={"avatar": "not-an-image"})
        assert r.status_code == 400


# ---- ADMIN reset-password ----
class TestAdminResetPassword:
    def test_reset_member_password(self, owner_headers, member):
        r = requests.post(f"{API}/admin/users/{member['id']}/reset-password",
                          headers=owner_headers, json={"new_password": MEMBER_PW_NEW})
        assert r.status_code == 200
        # login with new
        r2 = requests.post(f"{API}/auth/login", json={"email": member["email"], "password": MEMBER_PW_NEW})
        assert r2.status_code == 200
        # revert back
        r3 = requests.post(f"{API}/admin/users/{member['id']}/reset-password",
                           headers=owner_headers, json={"new_password": member["password"]})
        assert r3.status_code == 200

    def test_short_password(self, owner_headers, member):
        r = requests.post(f"{API}/admin/users/{member['id']}/reset-password",
                          headers=owner_headers, json={"new_password": "short"})
        assert r.status_code == 400

    def test_owner_cannot_reset_own(self, owner_headers):
        # find owner id
        rlist = requests.get(f"{API}/admin/users", headers=owner_headers)
        owner_id = next(u["id"] for u in rlist.json() if u["role"] == "owner")
        r = requests.post(f"{API}/admin/users/{owner_id}/reset-password",
                          headers=owner_headers, json={"new_password": "AnyLongPass1!"})
        assert r.status_code == 400

    def test_non_owner_forbidden(self, member):
        h = {"Authorization": f"Bearer {member['token']}"}
        r = requests.post(f"{API}/admin/users/{member['id']}/reset-password",
                          headers=h, json={"new_password": "AnyLongPass1!"})
        assert r.status_code == 403


# ---- ADMIN edit user ----
class TestAdminEditUser:
    def test_edit_name(self, owner_headers, member):
        r = requests.patch(f"{API}/admin/users/{member['id']}",
                           headers=owner_headers, json={"name": "QA Member Renamed"})
        assert r.status_code == 200
        assert r.json()["name"] == "QA Member Renamed"

    def test_edit_email_unique_conflict(self, owner_headers, member):
        r = requests.patch(f"{API}/admin/users/{member['id']}",
                           headers=owner_headers, json={"email": OWNER_EMAIL})
        assert r.status_code == 400

    def test_owner_cannot_be_edited(self, owner_headers):
        rlist = requests.get(f"{API}/admin/users", headers=owner_headers)
        owner_id = next(u["id"] for u in rlist.json() if u["role"] == "owner")
        r = requests.patch(f"{API}/admin/users/{owner_id}",
                           headers=owner_headers, json={"name": "Should Not Change"})
        assert r.status_code == 400


# ---- REGRESSION ----
class TestRegression:
    def test_owner_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PW})
        assert r.status_code == 200

    def test_pending_cannot_login(self):
        email = f"pending-{TS}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "PendingPw123!", "name": "Pending"})
        assert r.status_code == 200
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "PendingPw123!"})
        assert r2.status_code == 403

    @pytest.mark.parametrize("path", [
        "/accounts", "/receivables", "/expenses", "/customers",
        "/fixed-expenses", "/dashboard/summary", "/upcoming-payments",
    ])
    def test_endpoints_with_auth(self, owner_headers, path):
        r = requests.get(f"{API}{path}", headers=owner_headers)
        assert r.status_code == 200

    @pytest.mark.parametrize("path", [
        "/accounts", "/receivables", "/expenses", "/customers",
        "/fixed-expenses", "/dashboard/summary", "/upcoming-payments",
    ])
    def test_endpoints_require_auth(self, path):
        r = requests.get(f"{API}{path}")
        assert r.status_code == 401
