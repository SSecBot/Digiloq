import os
import pytest
import requests
from datetime import date, timedelta

API = "http://127.0.0.1:8000/api"
OWNER_EMAIL = "admin@example.com"
OWNER_PASSWORD = "admin"


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


def test_currency_rates():
    r = requests.get(f"{API}/currencies/rates", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "rates_to_try" in data
    assert "TRY" in data["rates_to_try"]
    assert "USD" in data["rates_to_try"]
    assert "EUR" in data["rates_to_try"]
    assert data["rates_to_try"]["TRY"] == 1.0


def test_system_settings_and_defaults(auth_headers):
    # Public / user defaults
    r = requests.get(f"{API}/settings/defaults", timeout=10)
    assert r.status_code == 200
    defaults = r.json()
    assert defaults["default_interest_rate"] > 0
    assert defaults["default_min_payment_pct"] > 0
    assert defaults["default_currency"] == "TRY"

    # Admin get settings
    r2 = requests.get(f"{API}/admin/settings", headers=auth_headers, timeout=10)
    assert r2.status_code == 200
    assert r2.json()["default_currency"] == "TRY"

    # Admin update settings
    patch_r = requests.patch(
        f"{API}/admin/settings",
        json={"default_interest_rate": 0.045, "default_min_payment_pct": 0.25},
        headers=auth_headers,
        timeout=10,
    )
    assert patch_r.status_code == 200
    assert patch_r.json()["default_interest_rate"] == 0.045
    assert patch_r.json()["default_min_payment_pct"] == 0.25

    # Revert back to defaults
    requests.patch(
        f"{API}/admin/settings",
        json={"default_interest_rate": 0.039, "default_min_payment_pct": 0.20},
        headers=auth_headers,
        timeout=10,
    )


def test_credit_debt_expense(auth_headers):
    # Create expense with debt type and default interest/min_payment
    payload = {
        "title": "Ticari Kredi Borcu",
        "category": "Kredi & Borç",
        "amount": 5000.0,
        "currency": "TRY",
        "date": date.today().isoformat(),
        "expense_type": "debt",
        "principal_amount": 50000.0,
        "interest_rate": 0.039,
        "min_payment_pct": 0.20,
    }
    r = requests.post(f"{API}/expenses", json=payload, headers=auth_headers, timeout=10)
    assert r.status_code == 200
    item = r.json()
    assert item["expense_type"] == "debt"
    assert item["interest_rate"] == 0.039
    assert item["min_payment_pct"] == 0.20
    assert item["principal_amount"] == 50000.0

    # Cleanup
    requests.delete(f"{API}/expenses/{item['id']}", headers=auth_headers, timeout=10)


def test_recurring_income_with_commitment(auth_headers):
    commitment_end = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "customer": "Test Danışmanlık Ltd.",
        "description": "3 Aylık Taahhütlü Gelir",
        "amount": 10000.0,
        "currency": "TRY",
        "due_date": date.today().isoformat(),
        "is_recurring": True,
        "commitment_end_date": commitment_end,
    }
    r = requests.post(f"{API}/receivables", json=payload, headers=auth_headers, timeout=10)
    assert r.status_code == 200
    item = r.json()
    assert item["is_recurring"] is True
    assert item["commitment_end_date"] == commitment_end

    # Verify multiple monthly instances generated
    r_list = requests.get(f"{API}/receivables", headers=auth_headers, timeout=10)
    matching = [x for x in r_list.json() if x["customer"] == "Test Danışmanlık Ltd."]
    assert len(matching) >= 1

    # Cleanup
    for x in matching:
        requests.delete(f"{API}/receivables/{x['id']}", headers=auth_headers, timeout=10)


def test_tasks_and_overdue_auto_escalation(auth_headers):
    # Past due task
    past_due = (date.today() - timedelta(days=5)).isoformat()
    payload = {
        "title": "Gecikmiş Proje Teslimi",
        "description": "Öncelik otomatik yükselmeli",
        "stage": "in_progress",
        "priority": "low",
        "due_date": past_due,
        "customer_name": "Acme Corp",
    }
    r = requests.post(f"{API}/tasks", json=payload, headers=auth_headers, timeout=10)
    assert r.status_code == 200
    task = r.json()
    # Past due should be auto-escalated to high
    assert task["priority"] == "high"
    assert task["is_overdue"] is True

    # Drag & drop stage update to completed
    patch_r = requests.patch(
        f"{API}/tasks/{task['id']}/stage",
        json={"stage": "completed"},
        headers=auth_headers,
        timeout=10,
    )
    assert patch_r.status_code == 200
    assert patch_r.json()["stage"] == "completed"
    assert patch_r.json()["is_overdue"] is False

    # Cleanup
    requests.delete(f"{API}/tasks/{task['id']}", headers=auth_headers, timeout=10)


def test_admin_manual_create_user(auth_headers):
    import time
    ts = int(time.time())
    email = f"provisioned_user_{ts}@test.com"
    r = requests.post(
        f"{API}/admin/users",
        json={"name": "Manuel Kullanıcı", "email": email, "password": "UserPass123!", "role": "member"},
        headers=auth_headers,
        timeout=10,
    )
    assert r.status_code == 200
    u = r.json()
    assert u["status"] == "approved"
    assert u["email"] == email

    # Cleanup
    requests.delete(f"{API}/admin/users/{u['id']}", headers=auth_headers, timeout=10)


def test_database_export_and_import(auth_headers):
    # Export
    r = requests.get(f"{API}/admin/export-database", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    dump = r.json()
    assert "signature" in dump
    assert "data" in dump
    assert "users" in dump["data"]
    assert "tasks" in dump["data"]

    # Import with valid dump
    import_r = requests.post(
        f"{API}/admin/import-database",
        json=dump,
        headers=auth_headers,
        timeout=15,
    )
    assert import_r.status_code == 200
    assert import_r.json()["ok"] is True


def test_user_data_export(auth_headers):
    r = requests.get(f"{API}/export/data", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "incomes" in data
    assert "expenses" in data
    assert "accounts" in data
    assert "tasks" in data


def test_kanban_columns_crud(auth_headers):
    # List columns (default seeded)
    r = requests.get(f"{API}/kanban/columns", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    cols = r.json()
    assert len(cols) >= 4

    # Create custom column
    cr = requests.post(
        f"{API}/kanban/columns",
        json={"title": "Test/QA", "color": "purple"},
        headers=auth_headers,
        timeout=10,
    )
    assert cr.status_code == 200
    new_col = cr.json()
    assert new_col["title"] == "Test/QA"
    assert new_col["color"] == "purple"

    # Update custom column
    patch_r = requests.patch(
        f"{API}/kanban/columns/{new_col['id']}",
        json={"title": "Test/QA & İnceleme", "color": "rose"},
        headers=auth_headers,
        timeout=10,
    )
    assert patch_r.status_code == 200
    assert patch_r.json()["title"] == "Test/QA & İnceleme"

    # Delete custom column
    del_r = requests.delete(f"{API}/kanban/columns/{new_col['id']}", headers=auth_headers, timeout=10)
    assert del_r.status_code == 200


def test_upcoming_payments_includes_tasks(auth_headers):
    # Create task with due_date
    task_due = (date.today() + timedelta(days=10)).isoformat()
    t_res = requests.post(
        f"{API}/tasks",
        json={
            "title": "Takvim Entegre Görev",
            "due_date": task_due,
            "stage": "in_progress",
            "priority": "medium",
            "customer_name": "Test Müşteri",
        },
        headers=auth_headers,
        timeout=10,
    )
    assert t_res.status_code == 200
    task_id = t_res.json()["id"]

    # Fetch upcoming payments
    up_res = requests.get(f"{API}/upcoming-payments?days=30", headers=auth_headers, timeout=10)
    assert up_res.status_code == 200
    up_items = up_res.json()
    task_items = [i for i in up_items if i.get("type") == "task" and i.get("id") == task_id]
    assert len(task_items) == 1
    assert task_items[0]["title"] == "Takvim Entegre Görev"
    assert task_items[0]["date"] == task_due

    # Cleanup
    requests.delete(f"{API}/tasks/{task_id}", headers=auth_headers, timeout=10)


def test_restore_database_endpoint(auth_headers):
    # Export
    r = requests.get(f"{API}/admin/export-database", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    dump = r.json()

    # Restore via /api/admin/restore-database
    restore_r = requests.post(
        f"{API}/admin/restore-database",
        json=dump,
        headers=auth_headers,
        timeout=15,
    )
    assert restore_r.status_code == 200
    assert restore_r.json()["ok"] is True

