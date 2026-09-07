import pytest
import httpx
from httpx import ASGITransport
from server import app, seed_owner, seed_system_settings, db
import time
from datetime import date, timedelta

@pytest.mark.anyio
async def test_api_root():
    await seed_owner()
    await seed_system_settings()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

@pytest.mark.anyio
async def test_currency_rates():
    await seed_owner()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/currencies/rates")
        assert response.status_code == 200
        data = response.json()
        assert "rates_to_try" in data
        assert "USD" in data["rates_to_try"]

@pytest.mark.anyio
async def test_system_defaults():
    await seed_system_settings()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/settings/defaults")
        assert response.status_code == 200
        data = response.json()
        assert "default_interest_rate" in data
        assert "default_currency" in data

@pytest.mark.anyio
async def test_auth_and_user_backup_flow():
    await seed_owner()
    await seed_system_settings()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ts = int(time.time() * 1000)
        email = f"backup_user_{ts}@example.com"
        pw = "StrongPass123!"
        
        # 1. Register
        reg_res = await client.post("/api/auth/register", json={"email": email, "password": pw, "name": "Backup User"})
        assert reg_res.status_code == 200
        uid = reg_res.json()["user"]["id"]
        
        # Owner login to approve user
        owner_res = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
        assert owner_res.status_code == 200
        owner_token = owner_res.json()["access_token"]
        appr_res = await client.post(f"/api/admin/users/{uid}/approve", headers={"Authorization": f"Bearer {owner_token}"})
        assert appr_res.status_code == 200
        
        # User login
        user_res = await client.post("/api/auth/login", json={"email": email, "password": pw})
        assert user_res.status_code == 200
        user_token = user_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create an account, customer, and task
        await client.post("/api/accounts", json={"name": "Test Kasa", "balance": 5000, "currency": "TRY"}, headers=headers)
        await client.post("/api/customers", json={"name": "Test Müşteri", "default_amount": 1000, "currency": "TRY", "day_of_month": 15}, headers=headers)
        await client.post("/api/tasks", json={"title": "Test Görev", "stage": "pending", "priority": "medium", "due_date": "2026-09-30"}, headers=headers)
        
        # 2. Export user backup
        exp_res = await client.get("/api/user/export-backup", headers=headers)
        assert exp_res.status_code == 200
        backup_data = exp_res.json()
        assert backup_data["type"] == "digiloq_user_backup"
        assert "data" in backup_data
        assert "signature" in backup_data
        assert len(backup_data["data"]["accounts"]) >= 1
        
        # 3. Restore user backup
        restore_res = await client.post("/api/user/restore-backup", json=backup_data, headers=headers)
        assert restore_res.status_code == 200
        restored = restore_res.json()
        assert restored["ok"] is True
        assert "restored" in restored
        
        # Clean up by admin deletion
        del_res = await client.delete(f"/api/admin/users/{uid}", headers={"Authorization": f"Bearer {owner_token}"})
        assert del_res.status_code == 200

@pytest.mark.anyio
async def test_admin_delete_user_cascade():
    await seed_owner()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ts = int(time.time() * 1000)
        email = f"delete_test_user_{ts}@example.com"
        pw = "StrongPass123!"
        
        # 1. Admin login
        owner_res = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
        assert owner_res.status_code == 200
        owner_token = owner_res.json()["access_token"]
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        
        # 2. Admin creates user directly
        create_res = await client.post(
            "/api/admin/users",
            json={"name": "Silinecek Kullanıcı", "email": email, "password": pw, "role": "member"},
            headers=owner_headers
        )
        assert create_res.status_code == 200
        user_doc = create_res.json()
        uid = user_doc["id"]
        
        # 3. User logs in & creates data
        user_login = await client.post("/api/auth/login", json={"email": email, "password": pw})
        assert user_login.status_code == 200
        user_token = user_login.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create accounts, expenses, receivables, tasks
        await client.post("/api/accounts", json={"name": "Kullanıcı Kasa", "balance": 1000, "currency": "TRY"}, headers=user_headers)
        await client.post("/api/expenses", json={"title": "Ofis Masrafı", "amount": 250, "currency": "TRY", "date": "2026-09-05"}, headers=user_headers)
        await client.post("/api/receivables", json={"customer": "Müşteri A", "amount": 1500, "currency": "TRY", "due_date": "2026-09-10"}, headers=user_headers)
        await client.post("/api/tasks", json={"title": "Raporlama Yap", "due_date": "2026-09-20"}, headers=user_headers)
        
        # Verify user has data in DB
        acc_count = await db.accounts.count_documents({"user_id": uid})
        assert acc_count >= 1
        
        # 4. Admin deletes the user
        del_res = await client.delete(f"/api/admin/users/{uid}", headers=owner_headers)
        assert del_res.status_code == 200
        assert del_res.json() == {"ok": True}
        
        # Verify user & all cascade documents are gone
        user_in_db = await db.users.find_one({"id": uid})
        assert user_in_db is None
        acc_after = await db.accounts.count_documents({"user_id": uid})
        assert acc_after == 0
        exp_after = await db.expenses.count_documents({"user_id": uid})
        assert exp_after == 0
        rec_after = await db.receivables.count_documents({"user_id": uid})
        assert rec_after == 0
        task_after = await db.tasks.count_documents({"user_id": uid})
        assert task_after == 0

@pytest.mark.anyio
async def test_permanent_deletion_vs_paid_status_preservation():
    await seed_owner()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ts = int(time.time() * 1000)
        email = f"lifecycle_user_{ts}@example.com"
        pw = "StrongPass123!"
        
        # Register and approve
        await client.post("/api/auth/register", json={"email": email, "password": pw, "name": "Lifecycle User"})
        owner_res = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
        owner_token = owner_res.json()["access_token"]
        
        users_res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {owner_token}"})
        target = next((u for u in users_res.json() if u["email"] == email), None)
        uid = target["id"]
        await client.post(f"/api/admin/users/{uid}/approve", headers={"Authorization": f"Bearer {owner_token}"})
        
        user_login = await client.post("/api/auth/login", json={"email": email, "password": pw})
        user_token = user_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Create bank account
        acc_res = await client.post("/api/accounts", json={"name": "Ana Hesap", "balance": 10000, "currency": "TRY"}, headers=headers)
        acc_id = acc_res.json()["id"]
        
        # 1. Create Expense, mark paid -> MUST NOT BE DELETED, MUST HAVE status: "paid"
        exp_res = await client.post("/api/expenses", json={"title": "Sunucu Kirası", "amount": 800, "currency": "TRY", "date": "2026-09-01", "account_id": acc_id}, headers=headers)
        exp_id = exp_res.json()["id"]
        
        mark_paid_res = await client.post(f"/api/expenses/{exp_id}/mark-paid", headers=headers)
        assert mark_paid_res.status_code == 200
        assert mark_paid_res.json()["status"] == "paid"
        assert mark_paid_res.json()["paid_at"] is not None
        
        # Verify expense still exists in database
        exp_in_db = await db.expenses.find_one({"id": exp_id})
        assert exp_in_db is not None
        assert exp_in_db["status"] == "paid"
        
        # 2. Hard delete a second expense -> MUST BE PERMANENTLY REMOVED
        exp2_res = await client.post("/api/expenses", json={"title": "Geçici Harcama", "amount": 150, "currency": "TRY", "date": "2026-09-02"}, headers=headers)
        exp2_id = exp2_res.json()["id"]
        del_exp_res = await client.delete(f"/api/expenses/{exp2_id}", headers=headers)
        assert del_exp_res.status_code == 200
        
        exp2_in_db = await db.expenses.find_one({"id": exp2_id})
        assert exp2_in_db is None
        
        # 3. Create Task, complete -> MUST NOT BE DELETED, MUST HAVE stage: "completed"
        task_res = await client.post("/api/tasks", json={"title": "Veri Girişi", "due_date": "2026-09-10"}, headers=headers)
        task_id = task_res.json()["id"]
        complete_res = await client.patch(f"/api/tasks/{task_id}/stage", json={"stage": "completed"}, headers=headers)
        assert complete_res.status_code == 200
        assert complete_res.json()["stage"] == "completed"
        
        task_in_db = await db.tasks.find_one({"id": task_id})
        assert task_in_db is not None
        assert task_in_db["stage"] == "completed"
        
        # 4. Hard delete task -> MUST BE PERMANENTLY REMOVED
        del_task_res = await client.delete(f"/api/tasks/{task_id}", headers=headers)
        assert del_task_res.status_code == 200
        task_after_del = await db.tasks.find_one({"id": task_id})
        assert task_after_del is None
        
        # Clean up user
        await client.delete(f"/api/admin/users/{uid}", headers={"Authorization": f"Bearer {owner_token}"})

@pytest.mark.anyio
async def test_upcoming_payments_with_past_months_and_paid():
    await seed_owner()
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ts = int(time.time() * 1000)
        email = f"timeline_user_{ts}@example.com"
        pw = "StrongPass123!"
        
        # Admin creates user
        owner_res = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
        owner_token = owner_res.json()["access_token"]
        
        create_res = await client.post(
            "/api/admin/users",
            json={"name": "Timeline Kullanıcısı", "email": email, "password": pw, "role": "member"},
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        uid = create_res.json()["id"]
        
        user_login = await client.post("/api/auth/login", json={"email": email, "password": pw})
        user_token = user_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {user_token}"}
        
        today = date.today()
        past_date = (today - timedelta(days=60)).isoformat()
        future_date = (today + timedelta(days=60)).isoformat()
        
        # Past expense (marked paid)
        p_exp = await client.post("/api/expenses", json={"title": "Geçmiş Ödenen Gider", "amount": 500, "currency": "TRY", "date": past_date, "status": "paid"}, headers=headers)
        p_exp_id = p_exp.json()["id"]
        
        # Future receivable (pending)
        f_rec = await client.post("/api/receivables", json={"customer": "Gelecek Gelir", "amount": 2000, "currency": "TRY", "due_date": future_date}, headers=headers)
        f_rec_id = f_rec.json()["id"]
        
        # Query upcoming-payments with timeline parameters
        res = await client.get("/api/upcoming-payments?past_days=365&future_days=365&include_paid=true", headers=headers)
        assert res.status_code == 200
        items = res.json()
        
        # Verify both past paid item and future pending item are present
        found_past_exp = next((i for i in items if i["id"] == p_exp_id), None)
        assert found_past_exp is not None
        assert found_past_exp["date"] == past_date
        assert found_past_exp["status"] == "paid"
        
        found_future_rec = next((i for i in items if i["id"] == f_rec_id), None)
        assert found_future_rec is not None
        assert found_future_rec["date"] == future_date
        assert found_future_rec["status"] == "pending"
        
        # Clean up
        await client.delete(f"/api/admin/users/{uid}", headers={"Authorization": f"Bearer {owner_token}"})
