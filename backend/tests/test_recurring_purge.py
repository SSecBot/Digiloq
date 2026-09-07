import os
import time
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8000"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "admin@example.com")
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "admin")

@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Owner login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]

@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}

def test_delete_calendar_event_directly(owner_headers):
    # 1. Create one-off expense
    r = requests.post(f"{API}/expenses", json={
        "title": "Tek Seferlik Takvim Test",
        "amount": 350,
        "currency": "TRY",
        "date": date.today().isoformat()
    }, headers=owner_headers)
    assert r.status_code == 200
    exp_id = r.json()["id"]

    # 2. Verify it is returned in upcoming-payments
    up = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=30&include_paid=true", headers=owner_headers)
    assert up.status_code == 200
    items = up.json()
    assert any(i["id"] == exp_id for i in items)

    # 3. Delete directly as from calendar
    del_res = requests.delete(f"{API}/expenses/{exp_id}", headers=owner_headers)
    assert del_res.status_code == 200

    # 4. Verify it is gone immediately
    up_after = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=30&include_paid=true", headers=owner_headers)
    assert up_after.status_code == 200
    assert not any(i["id"] == exp_id for i in up_after.json())

def test_recurring_customer_deletion_purges_future_calendar_schedule(owner_headers):
    ts = int(time.time() * 1000)
    cust_name = f"Tekrarlı Müşteri {ts}"

    # 1. Create customer with recurring receivables for 12 months
    c_res = requests.post(f"{API}/customers", json={
        "name": cust_name,
        "default_amount": 1500,
        "currency": "TRY",
        "day_of_month": 15,
        "active": True
    }, headers=owner_headers)
    assert c_res.status_code == 200
    cid = c_res.json()["id"]

    # 2. Check calendar returns multiple future receivables for this customer
    up = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=365&include_paid=true", headers=owner_headers)
    assert up.status_code == 200
    items = [i for i in up.json() if i.get("title") == cust_name or i.get("customer_id") == cid]
    assert len(items) >= 6, f"Expected recurring items in calendar, got {len(items)}"

    # Mark first item as paid to test that paid history is preserved
    first_item = items[0]
    mark_res = requests.post(f"{API}/receivables/{first_item['id']}/mark-paid", headers=owner_headers)
    assert mark_res.status_code == 200

    # 3. Delete the customer
    del_res = requests.delete(f"{API}/customers/{cid}", headers=owner_headers)
    assert del_res.status_code == 200

    # 4. Verify calendar timeline now has ZERO pending future occurrences for this customer
    up_after = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=365&include_paid=true", headers=owner_headers)
    assert up_after.status_code == 200
    remaining_items = [i for i in up_after.json() if i.get("title") == cust_name or i.get("customer_id") == cid]
    # Only the paid one remains in history
    assert len(remaining_items) == 1
    assert remaining_items[0]["status"] == "paid"

def test_recurring_fixed_expense_deletion_purges_future_calendar_schedule(owner_headers):
    ts = int(time.time() * 1000)
    title = f"Tekrarlı Sabit Gider {ts}"

    # 1. Create fixed expense
    fx_res = requests.post(f"{API}/fixed-expenses", json={
        "title": title,
        "amount": 750,
        "currency": "TRY",
        "day_of_month": 20,
        "category": "Yazılım & Sunucu"
    }, headers=owner_headers)
    assert fx_res.status_code == 200
    fid = fx_res.json()["id"]

    # 2. Check calendar returns future occurrences
    up = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=365&include_paid=true", headers=owner_headers)
    assert up.status_code == 200
    items = [i for i in up.json() if i.get("title") == title or i.get("fixed_expense_id") == fid]
    assert len(items) >= 6

    # 3. Delete fixed expense
    del_res = requests.delete(f"{API}/fixed-expenses/{fid}", headers=owner_headers)
    assert del_res.status_code == 200

    # 4. Verify all future occurrences are purged from calendar
    up_after = requests.get(f"{API}/upcoming-payments?past_days=30&future_days=365&include_paid=true", headers=owner_headers)
    assert up_after.status_code == 200
    remaining = [i for i in up_after.json() if i.get("title") == title or i.get("fixed_expense_id") == fid]
    assert len(remaining) == 0
