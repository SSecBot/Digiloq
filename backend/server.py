from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import calendar as calmod
import bcrypt
import jwt as pyjwt
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date, timedelta


mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ACCESS_TTL_MIN = 60 * 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ============ MODELS ============
Currency = Literal["TRY", "USD", "EUR"]


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    avatar: Optional[str] = None  # base64 data URL
    role: Literal["owner", "member"] = "member"
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class AdminUserEdit(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class AdminPasswordReset(BaseModel):
    new_password: str


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    bank: Optional[str] = ""
    balance: float = 0.0
    currency: Currency = "TRY"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BankAccountCreate(BaseModel):
    name: str
    bank: Optional[str] = ""
    balance: float = 0.0
    currency: Currency = "TRY"


class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    bank: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[Currency] = None


class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    contact: Optional[str] = ""
    default_amount: float
    currency: Currency = "TRY"
    day_of_month: int = 1
    account_id: Optional[str] = None
    description: Optional[str] = ""
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CustomerCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    default_amount: float
    currency: Currency = "TRY"
    day_of_month: int = 1
    account_id: Optional[str] = None
    description: Optional[str] = ""
    active: bool = True


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    default_amount: Optional[float] = None
    currency: Optional[Currency] = None
    day_of_month: Optional[int] = None
    account_id: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class FixedExpense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    category: str = "Diğer"
    amount: float
    currency: Currency = "TRY"
    day_of_month: int = 1
    account_id: Optional[str] = None
    notes: Optional[str] = ""
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FixedExpenseCreate(BaseModel):
    title: str
    category: str = "Diğer"
    amount: float
    currency: Currency = "TRY"
    day_of_month: int = 1
    account_id: Optional[str] = None
    notes: Optional[str] = ""
    active: bool = True


class FixedExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    day_of_month: Optional[int] = None
    account_id: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class Receivable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    customer: str
    customer_id: Optional[str] = None
    description: Optional[str] = ""
    amount: float
    currency: Currency = "TRY"
    due_date: str
    status: Literal["pending", "paid", "overdue"] = "pending"
    account_id: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReceivableCreate(BaseModel):
    customer: str
    customer_id: Optional[str] = None
    description: Optional[str] = ""
    amount: float
    currency: Currency = "TRY"
    due_date: str
    account_id: Optional[str] = None


class ReceivableUpdate(BaseModel):
    customer: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    due_date: Optional[str] = None
    status: Optional[Literal["pending", "paid", "overdue"]] = None
    account_id: Optional[str] = None


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    fixed_expense_id: Optional[str] = None
    category: str = "Diğer"
    amount: float
    currency: Currency = "TRY"
    date: str
    status: Literal["pending", "paid"] = "pending"
    account_id: Optional[str] = None
    notes: Optional[str] = ""
    paid_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExpenseCreate(BaseModel):
    title: str
    fixed_expense_id: Optional[str] = None
    category: str = "Diğer"
    amount: float
    currency: Currency = "TRY"
    date: str
    status: Literal["pending", "paid"] = "pending"
    account_id: Optional[str] = None
    notes: Optional[str] = ""


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    date: Optional[str] = None
    status: Optional[Literal["pending", "paid"]] = None
    account_id: Optional[str] = None
    notes: Optional[str] = None


# ============ AUTH HELPERS ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Yetkiniz yok")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Geçersiz token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "Kullanıcı bulunamadı")
        if user.get("status") != "approved":
            raise HTTPException(403, "Hesabınız onay bekliyor")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "Oturum süresi doldu")
    except pyjwt.InvalidTokenError:
        raise HTTPException(401, "Geçersiz token")


async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "owner":
        raise HTTPException(403, "Yalnızca sahibinin erişimi var")
    return user


# ============ HELPERS ============
def clean(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


def today_iso():
    return date.today().isoformat()


def clamp_day(year: int, month: int, day: int) -> int:
    last = calmod.monthrange(year, month)[1]
    return min(day, last)


def next_n_month_dates(day_of_month: int, n: int = 12) -> List[str]:
    today = date.today()
    y, m = today.year, today.month
    first_day = clamp_day(y, m, day_of_month)
    if first_day < today.day:
        m += 1
        if m > 12:
            m = 1
            y += 1
    dates = []
    for _ in range(n):
        d = clamp_day(y, m, day_of_month)
        dates.append(date(y, m, d).isoformat())
        m += 1
        if m > 12:
            m = 1
            y += 1
    return dates


async def sync_customer_receivables(customer: dict):
    today = today_iso()
    await db.receivables.delete_many({
        "user_id": customer["user_id"],
        "customer_id": customer["id"],
        "status": {"$in": ["pending", "overdue"]},
        "due_date": {"$gte": today},
    })
    if not customer.get("active", True):
        return
    for due in next_n_month_dates(customer["day_of_month"], 12):
        r = Receivable(
            user_id=customer["user_id"],
            customer=customer["name"],
            customer_id=customer["id"],
            description=customer.get("description", "") or "Aylık tekrarlı",
            amount=float(customer["default_amount"]),
            currency=customer["currency"],
            due_date=due,
            account_id=customer.get("account_id"),
            status="pending",
        )
        await db.receivables.insert_one(r.model_dump())


async def sync_fixed_expenses(fixed: dict):
    today = today_iso()
    await db.expenses.delete_many({
        "user_id": fixed["user_id"],
        "fixed_expense_id": fixed["id"],
        "status": "pending",
        "date": {"$gte": today},
    })
    if not fixed.get("active", True):
        return
    for d in next_n_month_dates(fixed["day_of_month"], 12):
        e = Expense(
            user_id=fixed["user_id"],
            title=fixed["title"],
            fixed_expense_id=fixed["id"],
            category=fixed.get("category") or "Diğer",
            amount=float(fixed["amount"]),
            currency=fixed["currency"],
            date=d,
            account_id=fixed.get("account_id"),
            notes=fixed.get("notes", "") or "Aylık tekrarlı",
            status="pending",
        )
        await db.expenses.insert_one(e.model_dump())


async def recompute_receivable_statuses(user_id: str):
    today = today_iso()
    await db.receivables.update_many(
        {"user_id": user_id, "status": "pending", "due_date": {"$lt": today}},
        {"$set": {"status": "overdue"}},
    )


def month_range(month: Optional[str]):
    if not month:
        return None
    try:
        y, m = map(int, month.split("-"))
    except Exception:
        return None
    last = calmod.monthrange(y, m)[1]
    return date(y, m, 1).isoformat(), date(y, m, last).isoformat()


# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/register")
async def register(payload: RegisterPayload):
    email = payload.email.lower().strip()
    if len(payload.password) < 8:
        raise HTTPException(400, "Şifre en az 8 karakter olmalı")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Bu e-posta zaten kayıtlı")
    u = User(email=email, name=payload.name.strip() or email.split("@")[0], role="member", status="pending")
    doc = u.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    return {
        "ok": True,
        "message": "Kaydınız alındı. Onay bekleniyor.",
        "user": u.model_dump(),
    }


@api_router.post("/auth/login")
async def login(payload: LoginPayload):
    email = payload.email.lower().strip()
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(401, "E-posta veya şifre hatalı")
    if doc.get("status") == "rejected":
        raise HTTPException(403, "Hesabınız reddedildi")
    if doc.get("status") != "approved":
        raise HTTPException(403, "Hesabınız onay bekliyor")
    token = create_access_token(doc["id"], doc["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": doc["id"],
            "email": doc["email"],
            "name": doc["name"],
            "role": doc["role"],
            "status": doc["status"],
        },
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.patch("/auth/me")
async def update_me(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    updates = {}
    if payload.name is not None and payload.name.strip():
        updates["name"] = payload.name.strip()
    if payload.avatar is not None:
        if payload.avatar and not payload.avatar.startswith("data:image/"):
            raise HTTPException(400, "Geçersiz görsel formatı")
        if payload.avatar and len(payload.avatar) > 800_000:
            raise HTTPException(400, "Görsel çok büyük (max ~600KB)")
        updates["avatar"] = payload.avatar or None
    changing_email = payload.email and payload.email.lower() != doc["email"]
    changing_password = bool(payload.new_password)
    if changing_email or changing_password:
        if not payload.current_password or not verify_password(payload.current_password, doc.get("password_hash", "")):
            raise HTTPException(400, "Mevcut şifre hatalı")
    if changing_email:
        new_email = payload.email.lower().strip()
        exists = await db.users.find_one({"email": new_email, "id": {"$ne": user["id"]}})
        if exists:
            raise HTTPException(400, "Bu e-posta zaten kullanılıyor")
        updates["email"] = new_email
    if changing_password:
        if len(payload.new_password) < 8:
            raise HTTPException(400, "Yeni şifre en az 8 karakter olmalı")
        updates["password_hash"] = hash_password(payload.new_password)
    if not updates:
        raise HTTPException(400, "Güncellenecek alan yok")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    result = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return result


@api_router.delete("/auth/me")
async def delete_me(user: dict = Depends(get_current_user)):
    if user.get("role") == "owner":
        raise HTTPException(400, "Owner hesabı kendi kendini silemez")
    uid = user["id"]
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses"):
        await db[col].delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ============ ADMIN ENDPOINTS ============
@api_router.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_owner)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@api_router.post("/admin/users/{uid}/approve")
async def admin_approve(uid: str, _: dict = Depends(require_owner)):
    result = await db.users.find_one_and_update(
        {"id": uid, "role": {"$ne": "owner"}},
        {"$set": {"status": "approved"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return clean(result)


@api_router.post("/admin/users/{uid}/reject")
async def admin_reject(uid: str, _: dict = Depends(require_owner)):
    result = await db.users.find_one_and_update(
        {"id": uid, "role": {"$ne": "owner"}},
        {"$set": {"status": "rejected"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return clean(result)


@api_router.post("/admin/users/{uid}/revoke")
async def admin_revoke(uid: str, _: dict = Depends(require_owner)):
    result = await db.users.find_one_and_update(
        {"id": uid, "role": {"$ne": "owner"}},
        {"$set": {"status": "pending"}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return clean(result)


@api_router.patch("/admin/users/{uid}")
async def admin_edit_user(uid: str, payload: AdminUserEdit, _: dict = Depends(require_owner)):
    doc = await db.users.find_one({"id": uid})
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        raise HTTPException(400, "Owner buradan düzenlenemez")
    updates = {}
    if payload.name is not None and payload.name.strip():
        updates["name"] = payload.name.strip()
    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if new_email != doc["email"]:
            exists = await db.users.find_one({"email": new_email, "id": {"$ne": uid}})
            if exists:
                raise HTTPException(400, "Bu e-posta zaten kullanılıyor")
            updates["email"] = new_email
    if not updates:
        raise HTTPException(400, "Güncellenecek alan yok")
    result = await db.users.find_one_and_update(
        {"id": uid}, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.post("/admin/users/{uid}/reset-password")
async def admin_reset_password(uid: str, payload: AdminPasswordReset, _: dict = Depends(require_owner)):
    doc = await db.users.find_one({"id": uid})
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        raise HTTPException(400, "Owner şifresi buradan sıfırlanamaz")
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Yeni şifre en az 8 karakter olmalı")
    await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"ok": True}


@api_router.delete("/admin/users/{uid}")
async def admin_delete(uid: str, _: dict = Depends(require_owner)):
    doc = await db.users.find_one({"id": uid})
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        raise HTTPException(400, "Owner silinemez")
    # cascade delete user data
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses"):
        await db[col].delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ============ BANK ACCOUNTS ============
@api_router.get("/accounts", response_model=List[BankAccount])
async def list_accounts(user: dict = Depends(get_current_user)):
    docs = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/accounts", response_model=BankAccount)
async def create_account(payload: BankAccountCreate, user: dict = Depends(get_current_user)):
    acc = BankAccount(user_id=user["id"], **payload.model_dump())
    await db.accounts.insert_one(acc.model_dump())
    return acc


@api_router.patch("/accounts/{account_id}", response_model=BankAccount)
async def update_account(account_id: str, payload: BankAccountUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.accounts.find_one_and_update(
        {"id": account_id, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Account not found")
    return clean(result)


@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(get_current_user)):
    result = await db.accounts.delete_one({"id": account_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Account not found")
    return {"ok": True}


# ============ CUSTOMERS ============
@api_router.get("/customers", response_model=List[Customer])
async def list_customers(user: dict = Depends(get_current_user)):
    docs = await db.customers.find({"user_id": user["id"]}, {"_id": 0}).sort("name", 1).to_list(500)
    return docs


@api_router.post("/customers", response_model=Customer)
async def create_customer(payload: CustomerCreate, user: dict = Depends(get_current_user)):
    if not 1 <= payload.day_of_month <= 28:
        raise HTTPException(400, "day_of_month must be 1-28")
    c = Customer(user_id=user["id"], **payload.model_dump())
    await db.customers.insert_one(c.model_dump())
    await sync_customer_receivables(c.model_dump())
    return c


@api_router.patch("/customers/{cid}", response_model=Customer)
async def update_customer(cid: str, payload: CustomerUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "day_of_month" in updates and not 1 <= updates["day_of_month"] <= 28:
        raise HTTPException(400, "day_of_month must be 1-28")
    result = await db.customers.find_one_and_update(
        {"id": cid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Customer not found")
    clean(result)
    await sync_customer_receivables(result)
    return result


@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.customers.find_one({"id": cid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Customer not found")
    today = today_iso()
    await db.receivables.delete_many({
        "user_id": user["id"],
        "customer_id": cid,
        "status": {"$in": ["pending", "overdue"]},
        "due_date": {"$gte": today},
    })
    await db.customers.delete_one({"id": cid, "user_id": user["id"]})
    return {"ok": True}


# ============ FIXED EXPENSES ============
@api_router.get("/fixed-expenses", response_model=List[FixedExpense])
async def list_fixed_expenses(user: dict = Depends(get_current_user)):
    docs = await db.fixed_expenses.find({"user_id": user["id"]}, {"_id": 0}).sort("title", 1).to_list(500)
    return docs


@api_router.post("/fixed-expenses", response_model=FixedExpense)
async def create_fixed_expense(payload: FixedExpenseCreate, user: dict = Depends(get_current_user)):
    if not 1 <= payload.day_of_month <= 28:
        raise HTTPException(400, "day_of_month must be 1-28")
    f = FixedExpense(user_id=user["id"], **payload.model_dump())
    await db.fixed_expenses.insert_one(f.model_dump())
    await sync_fixed_expenses(f.model_dump())
    return f


@api_router.patch("/fixed-expenses/{fid}", response_model=FixedExpense)
async def update_fixed_expense(fid: str, payload: FixedExpenseUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "day_of_month" in updates and not 1 <= updates["day_of_month"] <= 28:
        raise HTTPException(400, "day_of_month must be 1-28")
    result = await db.fixed_expenses.find_one_and_update(
        {"id": fid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Fixed expense not found")
    clean(result)
    await sync_fixed_expenses(result)
    return result


@api_router.delete("/fixed-expenses/{fid}")
async def delete_fixed_expense(fid: str, user: dict = Depends(get_current_user)):
    doc = await db.fixed_expenses.find_one({"id": fid, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Fixed expense not found")
    today = today_iso()
    await db.expenses.delete_many({
        "user_id": user["id"],
        "fixed_expense_id": fid,
        "status": "pending",
        "date": {"$gte": today},
    })
    await db.fixed_expenses.delete_one({"id": fid, "user_id": user["id"]})
    return {"ok": True}


# ============ RECEIVABLES ============
@api_router.get("/receivables", response_model=List[Receivable])
async def list_receivables(user: dict = Depends(get_current_user), month: Optional[str] = Query(None)):
    await recompute_receivable_statuses(user["id"])
    q = {"user_id": user["id"]}
    mr = month_range(month)
    if mr:
        q["due_date"] = {"$gte": mr[0], "$lte": mr[1]}
    docs = await db.receivables.find(q, {"_id": 0}).sort("due_date", 1).to_list(2000)
    return docs


@api_router.post("/receivables", response_model=Receivable)
async def create_receivable(payload: ReceivableCreate, user: dict = Depends(get_current_user)):
    r = Receivable(user_id=user["id"], **payload.model_dump())
    if r.due_date < today_iso():
        r.status = "overdue"
    await db.receivables.insert_one(r.model_dump())
    return r


@api_router.patch("/receivables/{rid}", response_model=Receivable)
async def update_receivable(rid: str, payload: ReceivableUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.receivables.find_one_and_update(
        {"id": rid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Receivable not found")
    return clean(result)


@api_router.post("/receivables/{rid}/mark-paid", response_model=Receivable)
async def mark_receivable_paid(rid: str, user: dict = Depends(get_current_user)):
    r = await db.receivables.find_one({"id": rid, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Receivable not found")
    if r["status"] == "paid":
        return r
    updates = {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}
    if r.get("account_id"):
        await db.accounts.update_one(
            {"id": r["account_id"], "user_id": user["id"], "currency": r["currency"]},
            {"$inc": {"balance": r["amount"]}},
        )
    result = await db.receivables.find_one_and_update(
        {"id": rid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.delete("/receivables/{rid}")
async def delete_receivable(rid: str, user: dict = Depends(get_current_user)):
    result = await db.receivables.delete_one({"id": rid, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Receivable not found")
    return {"ok": True}


# ============ EXPENSES ============
@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(user: dict = Depends(get_current_user), month: Optional[str] = Query(None)):
    q = {"user_id": user["id"]}
    mr = month_range(month)
    if mr:
        q["date"] = {"$gte": mr[0], "$lte": mr[1]}
    docs = await db.expenses.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate, user: dict = Depends(get_current_user)):
    e = Expense(user_id=user["id"], **payload.model_dump())
    await db.expenses.insert_one(e.model_dump())
    return e


@api_router.patch("/expenses/{eid}", response_model=Expense)
async def update_expense(eid: str, payload: ExpenseUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.expenses.find_one_and_update(
        {"id": eid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Expense not found")
    return clean(result)


@api_router.post("/expenses/{eid}/mark-paid", response_model=Expense)
async def mark_expense_paid(eid: str, user: dict = Depends(get_current_user)):
    e = await db.expenses.find_one({"id": eid, "user_id": user["id"]}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Expense not found")
    if e["status"] == "paid":
        return e
    updates = {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}
    if e.get("account_id"):
        await db.accounts.update_one(
            {"id": e["account_id"], "user_id": user["id"], "currency": e["currency"]},
            {"$inc": {"balance": -e["amount"]}},
        )
    result = await db.expenses.find_one_and_update(
        {"id": eid, "user_id": user["id"]}, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str, user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": eid, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Expense not found")
    return {"ok": True}


# ============ DASHBOARD / SUMMARY ============
@api_router.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    await recompute_receivable_statuses(user["id"])
    accounts = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    receivables = await db.receivables.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    expenses = await db.expenses.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)

    balances_by_currency = {}
    for a in accounts:
        c = a["currency"]
        balances_by_currency[c] = balances_by_currency.get(c, 0.0) + float(a["balance"])

    pending_receivables_by_currency = {}
    overdue_by_currency = {}
    for r in receivables:
        if r["status"] == "pending":
            pending_receivables_by_currency[r["currency"]] = (
                pending_receivables_by_currency.get(r["currency"], 0.0) + float(r["amount"])
            )
        elif r["status"] == "overdue":
            overdue_by_currency[r["currency"]] = (
                overdue_by_currency.get(r["currency"], 0.0) + float(r["amount"])
            )

    pending_expenses_by_currency = {}
    for e in expenses:
        if e["status"] == "pending":
            pending_expenses_by_currency[e["currency"]] = (
                pending_expenses_by_currency.get(e["currency"], 0.0) + float(e["amount"])
            )

    today = date.today()
    days = []
    running = balances_by_currency.get("TRY", 0.0)
    for i in range(30):
        d = today + timedelta(days=i)
        iso = d.isoformat()
        income = sum(
            float(r["amount"]) for r in receivables
            if r["due_date"] == iso and r["status"] != "paid" and r["currency"] == "TRY"
        )
        outflow = sum(
            float(e["amount"]) for e in expenses
            if e["date"] == iso and e["status"] != "paid" and e["currency"] == "TRY"
        )
        running += income - outflow
        days.append({
            "date": iso,
            "income": income,
            "expense": outflow,
            "net": income - outflow,
            "balance": running,
        })

    history = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        iso = d.isoformat()
        income = sum(
            float(r["amount"]) for r in receivables
            if r.get("paid_at") and r["paid_at"].startswith(iso) and r["currency"] == "TRY"
        )
        outflow = sum(
            float(e["amount"]) for e in expenses
            if e.get("paid_at") and e["paid_at"].startswith(iso) and e["currency"] == "TRY"
        )
        history.append({"date": iso, "income": income, "expense": outflow})

    return {
        "balances_by_currency": balances_by_currency,
        "pending_receivables_by_currency": pending_receivables_by_currency,
        "overdue_by_currency": overdue_by_currency,
        "pending_expenses_by_currency": pending_expenses_by_currency,
        "accounts_count": len(accounts),
        "cash_flow_forecast": days,
        "cash_flow_history": history,
    }


@api_router.get("/upcoming-payments")
async def upcoming_payments(user: dict = Depends(get_current_user), days: int = 30):
    await recompute_receivable_statuses(user["id"])
    today = date.today()
    end = (today + timedelta(days=days)).isoformat()

    r_docs = await db.receivables.find(
        {"user_id": user["id"], "status": {"$in": ["pending", "overdue"]}, "due_date": {"$lte": end}},
        {"_id": 0},
    ).to_list(1000)
    e_docs = await db.expenses.find(
        {"user_id": user["id"], "status": "pending", "date": {"$lte": end}}, {"_id": 0}
    ).to_list(1000)

    items = []
    for r in r_docs:
        items.append({
            "id": r["id"], "type": "receivable", "title": r["customer"],
            "description": r.get("description", ""), "amount": r["amount"],
            "currency": r["currency"], "date": r["due_date"], "status": r["status"],
        })
    for e in e_docs:
        items.append({
            "id": e["id"], "type": "expense", "title": e["title"],
            "description": e.get("category", ""), "amount": e["amount"],
            "currency": e["currency"], "date": e["date"], "status": e["status"],
        })
    items.sort(key=lambda x: x["date"])
    return items


@api_router.get("/")
async def root():
    return {"message": "Digiloq API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_owner():
    owner_email = os.environ.get("OWNER_EMAIL", "").lower().strip()
    owner_pw = os.environ.get("OWNER_PASSWORD", "")
    owner_name = os.environ.get("OWNER_NAME", "Owner")
    if not owner_email or not owner_pw:
        logger.warning("Owner credentials not set in env — skipping seed")
        return
    existing = await db.users.find_one({"email": owner_email})
    if existing is None:
        u = User(email=owner_email, name=owner_name, role="owner", status="approved")
        doc = u.model_dump()
        doc["password_hash"] = hash_password(owner_pw)
        await db.users.insert_one(doc)
        logger.info(f"Owner user seeded: {owner_email}")
    else:
        updates = {}
        if existing.get("role") != "owner":
            updates["role"] = "owner"
        if existing.get("status") != "approved":
            updates["status"] = "approved"
        if not verify_password(owner_pw, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(owner_pw)
        if updates:
            await db.users.update_one({"email": owner_email}, {"$set": updates})
            logger.info(f"Owner user updated: {owner_email}")


async def migrate_orphan_docs():
    """Attach docs without user_id to owner (best-effort migration for pre-auth data)."""
    owner_email = os.environ.get("OWNER_EMAIL", "").lower().strip()
    owner = await db.users.find_one({"email": owner_email})
    if not owner:
        return
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses"):
        r = await db[col].update_many(
            {"user_id": {"$exists": False}}, {"$set": {"user_id": owner["id"]}}
        )
        if r.modified_count:
            logger.info(f"Migrated {r.modified_count} docs in {col} to owner")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await seed_owner()
    await migrate_orphan_docs()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
