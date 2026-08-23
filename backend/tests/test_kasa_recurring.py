"""Backend tests for KASA app - Customers, Fixed Expenses, Month filter."""
import os
import requests
import pytest
from datetime import date, timedelta
import calendar as calmod

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://payment-manager-211.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- helpers ----------
def _cleanup_customer(session, cid):
    try:
        session.delete(f"{API}/customers/{cid}")
    except Exception:
        pass


def _cleanup_fixed(session, fid):
    try:
        session.delete(f"{API}/fixed-expenses/{fid}")
    except Exception:
        pass


def _expected_first_month(day):
    today = date.today()
    last = calmod.monthrange(today.year, today.month)[1]
    clamped = min(day, last)
    if clamped < today.day:
        y, m = today.year, today.month
        m += 1
        if m > 12: m, y = 1, y + 1
        return y, m
    return today.year, today.month


# ---------- Customers ----------
class TestCustomers:
    def test_create_customer_generates_12_receivables(self, session):
        payload = {
            "name": "TEST_Cust_Alpha", "contact": "a@b.com",
            "default_amount": 1234.56, "currency": "TRY",
            "day_of_month": 15, "description": "TEST recurring", "active": True,
        }
        r = session.post(f"{API}/customers", json=payload)
        assert r.status_code == 200, r.text
        cust = r.json()
        assert cust["name"] == "TEST_Cust_Alpha"
        assert cust["default_amount"] == 1234.56
        assert cust["day_of_month"] == 15
        assert "id" in cust
        cid = cust["id"]
        try:
            recs = session.get(f"{API}/receivables").json()
            mine = [r for r in recs if r.get("customer_id") == cid]
            assert len(mine) == 12, f"Expected 12 receivables, got {len(mine)}"
            for m in mine:
                assert m["customer"] == "TEST_Cust_Alpha"
                assert m["amount"] == 1234.56
                assert m["currency"] == "TRY"
                assert m["status"] in ("pending", "overdue")
            # verify dates are 12 distinct months, day 15
            days = {d["due_date"][-2:] for d in mine}
            assert days == {"15"}
            months = {d["due_date"][:7] for d in mine}
            assert len(months) == 12
        finally:
            _cleanup_customer(session, cid)

    def test_list_customers(self, session):
        payload = {"name": "TEST_ListCust", "default_amount": 100, "day_of_month": 5}
        r = session.post(f"{API}/customers", json=payload)
        cid = r.json()["id"]
        try:
            lst = session.get(f"{API}/customers")
            assert lst.status_code == 200
            ids = [c["id"] for c in lst.json()]
            assert cid in ids
        finally:
            _cleanup_customer(session, cid)

    def test_patch_customer_resyncs_receivables(self, session):
        r = session.post(f"{API}/customers", json={
            "name": "TEST_Patch", "default_amount": 500, "day_of_month": 10, "currency": "TRY"
        })
        cid = r.json()["id"]
        try:
            # Update amount and day
            up = session.patch(f"{API}/customers/{cid}", json={"default_amount": 999, "day_of_month": 20})
            assert up.status_code == 200
            assert up.json()["default_amount"] == 999
            assert up.json()["day_of_month"] == 20
            recs = [x for x in session.get(f"{API}/receivables").json() if x.get("customer_id") == cid]
            assert len(recs) == 12
            for x in recs:
                assert x["amount"] == 999
                assert x["due_date"].endswith("-20")
        finally:
            _cleanup_customer(session, cid)

    def test_patch_customer_preserves_paid(self, session):
        r = session.post(f"{API}/customers", json={
            "name": "TEST_PaidPreserve", "default_amount": 300, "day_of_month": 15
        })
        cid = r.json()["id"]
        try:
            recs = [x for x in session.get(f"{API}/receivables").json() if x.get("customer_id") == cid]
            assert len(recs) >= 1
            # Mark one as paid
            paid_id = recs[0]["id"]
            mp = session.post(f"{API}/receivables/{paid_id}/mark-paid")
            assert mp.status_code == 200
            # Patch customer
            session.patch(f"{API}/customers/{cid}", json={"default_amount": 400})
            after = [x for x in session.get(f"{API}/receivables").json() if x.get("customer_id") == cid]
            paid = [x for x in after if x["status"] == "paid"]
            assert len(paid) == 1
            assert paid[0]["id"] == paid_id
            # paid amount preserved (not overwritten)
            assert paid[0]["amount"] == 300
        finally:
            _cleanup_customer(session, cid)

    def test_delete_customer_preserves_paid_history(self, session):
        r = session.post(f"{API}/customers", json={
            "name": "TEST_DelHist", "default_amount": 250, "day_of_month": 15
        })
        cid = r.json()["id"]
        recs = [x for x in session.get(f"{API}/receivables").json() if x.get("customer_id") == cid]
        paid_id = recs[0]["id"]
        session.post(f"{API}/receivables/{paid_id}/mark-paid")
        # delete customer
        dl = session.delete(f"{API}/customers/{cid}")
        assert dl.status_code == 200
        after = [x for x in session.get(f"{API}/receivables").json() if x.get("customer_id") == cid]
        # Only paid one should remain
        assert len(after) == 1
        assert after[0]["id"] == paid_id
        assert after[0]["status"] == "paid"
        # cleanup paid record
        session.delete(f"{API}/receivables/{paid_id}")

    def test_day_of_month_validation(self, session):
        r = session.post(f"{API}/customers", json={
            "name": "TEST_Bad", "default_amount": 100, "day_of_month": 30
        })
        assert r.status_code == 400
        r2 = session.post(f"{API}/customers", json={
            "name": "TEST_Bad2", "default_amount": 100, "day_of_month": 0
        })
        assert r2.status_code == 400


# ---------- Fixed Expenses ----------
class TestFixedExpenses:
    def test_create_generates_12_expenses(self, session):
        r = session.post(f"{API}/fixed-expenses", json={
            "title": "TEST_Rent", "category": "Kira", "amount": 5000,
            "currency": "TRY", "day_of_month": 5, "active": True
        })
        assert r.status_code == 200, r.text
        fid = r.json()["id"]
        try:
            exps = [x for x in session.get(f"{API}/expenses").json() if x.get("fixed_expense_id") == fid]
            assert len(exps) == 12
            assert all(e["amount"] == 5000 for e in exps)
            assert all(e["status"] == "pending" for e in exps)
            days = {e["date"][-2:] for e in exps}
            assert days == {"05"}
        finally:
            _cleanup_fixed(session, fid)

    def test_patch_resyncs_expenses(self, session):
        r = session.post(f"{API}/fixed-expenses", json={
            "title": "TEST_PatchFix", "amount": 100, "day_of_month": 10
        })
        fid = r.json()["id"]
        try:
            up = session.patch(f"{API}/fixed-expenses/{fid}", json={"amount": 222, "day_of_month": 12})
            assert up.status_code == 200
            exps = [x for x in session.get(f"{API}/expenses").json() if x.get("fixed_expense_id") == fid]
            assert len(exps) == 12
            assert all(e["amount"] == 222 for e in exps)
            assert all(e["date"].endswith("-12") for e in exps)
        finally:
            _cleanup_fixed(session, fid)

    def test_delete_fixed_expense(self, session):
        r = session.post(f"{API}/fixed-expenses", json={
            "title": "TEST_DelFix", "amount": 200, "day_of_month": 15
        })
        fid = r.json()["id"]
        dl = session.delete(f"{API}/fixed-expenses/{fid}")
        assert dl.status_code == 200
        remaining = [x for x in session.get(f"{API}/expenses").json() if x.get("fixed_expense_id") == fid]
        # all pending future gone
        assert all(x["status"] != "pending" for x in remaining)

    def test_day_validation(self, session):
        r = session.post(f"{API}/fixed-expenses", json={
            "title": "TEST_BadFix", "amount": 100, "day_of_month": 29
        })
        assert r.status_code == 400


# ---------- Month filter ----------
class TestMonthFilter:
    def test_receivables_month_filter(self, session):
        r = session.post(f"{API}/customers", json={
            "name": "TEST_MonthFilter", "default_amount": 100, "day_of_month": 15
        })
        cid = r.json()["id"]
        try:
            y, m = _expected_first_month(15)
            month_str = f"{y:04d}-{m:02d}"
            resp = session.get(f"{API}/receivables", params={"month": month_str})
            assert resp.status_code == 200
            docs = resp.json()
            for d in docs:
                assert d["due_date"].startswith(month_str)
            mine = [d for d in docs if d.get("customer_id") == cid]
            assert len(mine) == 1
        finally:
            _cleanup_customer(session, cid)

    def test_expenses_month_filter(self, session):
        r = session.post(f"{API}/fixed-expenses", json={
            "title": "TEST_ExpMonth", "amount": 100, "day_of_month": 15
        })
        fid = r.json()["id"]
        try:
            y, m = _expected_first_month(15)
            month_str = f"{y:04d}-{m:02d}"
            resp = session.get(f"{API}/expenses", params={"month": month_str})
            assert resp.status_code == 200
            for d in resp.json():
                assert d["date"].startswith(month_str)
        finally:
            _cleanup_fixed(session, fid)

    def test_no_month_returns_all(self, session):
        resp = session.get(f"{API}/receivables")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ---------- Regression ----------
class TestRegression:
    def test_dashboard_summary(self, session):
        r = session.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        d = r.json()
        assert "balances_by_currency" in d
        assert "cash_flow_forecast" in d

    def test_accounts_list(self, session):
        r = session.get(f"{API}/accounts")
        assert r.status_code == 200

    def test_upcoming_payments(self, session):
        r = session.get(f"{API}/upcoming-payments")
        assert r.status_code == 200
