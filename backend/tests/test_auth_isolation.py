"""Backend tests for auth, admin, and per-user data isolation."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8000"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "admin@example.com")
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "admin")

TS = int(time.time() * 1000)
MEMBER_EMAIL = f"testmember+{TS}@example.com"
MEMBER_PASSWORD = "TestPass123!"
MEMBER_NAME = "Test Member"


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Owner login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "owner"
    assert data["user"]["status"] == "approved"
    assert data["token_type"] == "bearer"
    return data["access_token"]


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


@pytest.fixture(scope="module")
def member_info(owner_headers):
    """Register + approve member; yield (id, token). Cleanup at end."""
    m_email = f"testmember+{time.time_ns()}@example.com"
    # Register
    r = requests.post(f"{API}/auth/register", json={
        "email": m_email, "password": MEMBER_PASSWORD, "name": MEMBER_NAME
    }, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["user"]["status"] == "pending"
    uid = body["user"]["id"]

    yield {"id": uid, "email": m_email, "password": MEMBER_PASSWORD}

    # Cleanup
    requests.delete(f"{API}/admin/users/{uid}", headers=owner_headers, timeout=15)


@pytest.fixture(scope="module")
def approved_member(owner_headers, member_info):
    uid = member_info["id"]
    r = requests.post(f"{API}/admin/users/{uid}/approve", headers=owner_headers, timeout=15)
    assert r.status_code == 200
    r_login = requests.post(f"{API}/auth/login", json={
        "email": member_info["email"], "password": member_info["password"]
    }, timeout=15)
    assert r_login.status_code == 200
    token = r_login.json()["access_token"]
    return {"id": uid, "token": token, "email": member_info["email"], "password": member_info["password"]}


# ---------- AUTH ----------
class TestAuth:
    def test_owner_login(self, owner_token):
        assert owner_token and len(owner_token) > 20

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, owner_headers):
        r = requests.get(f"{API}/auth/me", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == OWNER_EMAIL
        assert u["role"] == "owner"
        assert "password_hash" not in u

    def test_register_pending_and_duplicate(self):
        dup_email = f"dup+{time.time_ns()}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": dup_email, "password": "Password123!", "name": "Dup"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["status"] == "pending"

        # duplicate email
        r2 = requests.post(f"{API}/auth/register", json={
            "email": dup_email, "password": "Password123!", "name": "Dup"
        }, timeout=15)
        assert r2.status_code == 400

    def test_login_pending_returns_403(self):
        pend_email = f"pending+{time.time_ns()}@example.com"
        requests.post(f"{API}/auth/register", json={
            "email": pend_email, "password": "Password123!", "name": "Pend"
        }, timeout=15)
        r = requests.post(f"{API}/auth/login", json={
            "email": pend_email, "password": "Password123!"
        }, timeout=15)
        assert r.status_code == 403

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": OWNER_EMAIL, "password": "WrongPassword123!"
        }, timeout=15)
        assert r.status_code == 401


# ---------- ADMIN ----------
class TestAdmin:
    def test_admin_users_requires_owner(self, owner_headers):
        r = requests.get(f"{API}/admin/users", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == OWNER_EMAIL for u in users)

    def test_admin_no_auth(self):
        r = requests.get(f"{API}/admin/users", timeout=15)
        assert r.status_code == 401

    def test_cannot_modify_owner(self, owner_headers):
        r = requests.get(f"{API}/admin/users", headers=owner_headers, timeout=15)
        owner = next(u for u in r.json() if u["email"] == OWNER_EMAIL)
        for action in ("approve", "reject", "revoke"):
            rr = requests.post(f"{API}/admin/users/{owner['id']}/{action}",
                               headers=owner_headers, timeout=15)
            assert rr.status_code in (200, 400, 403)
        # delete owner
        rr = requests.delete(f"{API}/admin/users/{owner['id']}", headers=owner_headers, timeout=15)
        assert rr.status_code == 400

    def test_approve_reject_revoke_flow(self, owner_headers, member_info):
        uid = member_info["id"]
        # approve
        r = requests.post(f"{API}/admin/users/{uid}/approve", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        # reject
        r = requests.post(f"{API}/admin/users/{uid}/reject", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        # revoke -> pending
        r = requests.post(f"{API}/admin/users/{uid}/revoke", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "pending"
        # re-approve for isolation test
        r = requests.post(f"{API}/admin/users/{uid}/approve", headers=owner_headers, timeout=15)
        assert r.status_code == 200


# ---------- ISOLATION + REGRESSION ----------
class TestIsolation:
    def test_member_login_after_approval(self, approved_member):
        assert approved_member["token"] and len(approved_member["token"]) > 20

    def test_non_owner_admin_forbidden(self, approved_member):
        headers = {"Authorization": f"Bearer {approved_member['token']}"}
        r = requests.get(f"{API}/admin/users", headers=headers, timeout=15)
        assert r.status_code == 403

    def test_owner_creates_account(self, owner_headers):
        r = requests.post(f"{API}/accounts", headers=owner_headers, json={
            "name": f"TEST_OwnerAcc_{time.time_ns()}", "bank": "TestBank", "balance": 1000, "currency": "TRY"
        }, timeout=15)
        assert r.status_code == 200
        acc_id = r.json()["id"]
        requests.delete(f"{API}/accounts/{acc_id}", headers=owner_headers, timeout=15)

    def test_member_accounts_empty(self, approved_member, owner_headers):
        # Create an account as owner
        r_owner = requests.post(f"{API}/accounts", headers=owner_headers, json={
            "name": f"TEST_OwnerAcc_{time.time_ns()}", "bank": "TestBank", "balance": 1000, "currency": "TRY"
        }, timeout=15)
        owner_acc_id = r_owner.json()["id"]

        headers = {"Authorization": f"Bearer {approved_member['token']}"}
        r = requests.get(f"{API}/accounts", headers=headers, timeout=15)
        assert r.status_code == 200
        accs = r.json()
        assert all(a["id"] != owner_acc_id for a in accs), "Member sees owner's account!"

        # member cannot modify owner account
        r_patch = requests.patch(f"{API}/accounts/{owner_acc_id}", headers=headers,
                                 json={"name": "hacked"}, timeout=15)
        assert r_patch.status_code == 404
        r_del = requests.delete(f"{API}/accounts/{owner_acc_id}", headers=headers, timeout=15)
        assert r_del.status_code == 404

        requests.delete(f"{API}/accounts/{owner_acc_id}", headers=owner_headers, timeout=15)

    def test_regression_owner_crud(self, owner_headers):
        r_acc = requests.post(f"{API}/accounts", headers=owner_headers, json={
            "name": f"TEST_Acc_{time.time_ns()}", "bank": "TestBank", "balance": 1000, "currency": "TRY"
        }, timeout=15)
        owner_acc_id = r_acc.json()["id"]

        # customer with sync
        r = requests.post(f"{API}/customers", headers=owner_headers, json={
            "name": f"TEST_Cust_{time.time_ns()}", "default_amount": 500, "currency": "TRY",
            "day_of_month": 15, "account_id": owner_acc_id
        }, timeout=15)
        assert r.status_code == 200
        cust_id = r.json()["id"]

        # fixed expense
        r = requests.post(f"{API}/fixed-expenses", headers=owner_headers, json={
            "title": f"TEST_FX_{time.time_ns()}", "amount": 100, "currency": "TRY",
            "day_of_month": 10, "account_id": owner_acc_id
        }, timeout=15)
        assert r.status_code == 200
        fx_id = r.json()["id"]

        # receivables auto-generated
        r = requests.get(f"{API}/receivables", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        recs = r.json()
        assert any(x.get("customer_id") == cust_id for x in recs)

        # dashboard
        r = requests.get(f"{API}/dashboard/summary", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert "balances_by_currency" in s and "cash_flow_forecast" in s

        # upcoming
        r = requests.get(f"{API}/upcoming-payments", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        # cleanup
        requests.delete(f"{API}/customers/{cust_id}", headers=owner_headers, timeout=15)
        requests.delete(f"{API}/fixed-expenses/{fx_id}", headers=owner_headers, timeout=15)
        requests.delete(f"{API}/accounts/{owner_acc_id}", headers=owner_headers, timeout=15)

    def test_cascade_delete(self, owner_headers):
        # Create dedicated member
        m_email = f"cascade_test_{time.time_ns()}@example.com"
        r_reg = requests.post(f"{API}/auth/register", json={
            "email": m_email, "password": "Password123!", "name": "Cascade User"
        }, timeout=15)
        uid = r_reg.json()["user"]["id"]
        requests.post(f"{API}/admin/users/{uid}/approve", headers=owner_headers, timeout=15)
        r_login = requests.post(f"{API}/auth/login", json={"email": m_email, "password": "Password123!"}, timeout=15)
        m_token = r_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {m_token}"}

        # member creates data
        r = requests.post(f"{API}/accounts", headers=headers, json={
            "name": "TEST_MemberAcc", "balance": 50, "currency": "TRY"
        }, timeout=15)
        assert r.status_code == 200
        # delete member
        r = requests.delete(f"{API}/admin/users/{uid}", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        # member token invalid now
        r = requests.get(f"{API}/accounts", headers=headers, timeout=15)
        assert r.status_code == 401
