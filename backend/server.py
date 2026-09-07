from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import time
import logging
import calendar as calmod
import bcrypt
import jwt as pyjwt
import hmac
import hashlib
import json
import httpx
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, date, timedelta


mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "kasa_takip")]

JWT_SECRET = os.environ.get("JWT_SECRET", "supersecretkey")
JWT_ALGO = "HS256"
ACCESS_TTL_MIN = 60 * 24 * 7  # 7 days

app = FastAPI(title="Digiloq API", version="2.0")
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def build_id_query(id_str: str, user_id: Optional[str] = None) -> dict:
    or_clauses = [{"id": id_str}, {"_id": id_str}]
    if ObjectId.is_valid(id_str):
        try:
            or_clauses.append({"_id": ObjectId(id_str)})
        except Exception:
            pass
    if user_id:
        return {"$and": [{"user_id": user_id}, {"$or": or_clauses}]}
    return {"$or": or_clauses}


# ============ MODELS ============
Currency = Literal["TRY", "USD", "EUR"]
ExpenseType = Literal["one_time", "recurring", "debt"]
TaskPriority = Literal["low", "medium", "high"]
TaskStage = str  # Dynamic or default ("pending", "in_progress", "approved", "completed", or custom column id)


class KanbanColumn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    key: str
    title: str
    color: str = "zinc"
    order: int = 0
    is_default: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KanbanColumnCreate(BaseModel):
    title: str
    color: Optional[str] = "zinc"


class KanbanColumnUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None


class SystemSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    default_interest_rate: float = 0.039  # 3.9%
    default_min_payment_pct: float = 0.20  # 20%
    default_currency: Currency = "TRY"


class SystemSettingsUpdate(BaseModel):
    default_interest_rate: Optional[float] = None
    default_min_payment_pct: Optional[float] = None
    default_currency: Optional[Currency] = None


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    avatar: Optional[str] = None  # base64 data URL
    role: Literal["owner", "member"] = "member"
    status: Literal["pending", "approved", "rejected"] = "pending"
    display_currency: Optional[Currency] = "TRY"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    display_currency: Optional[Currency] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class AdminUserEdit(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class AdminPasswordReset(BaseModel):
    new_password: str


class AdminCreateUser(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["owner", "member"] = "member"


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
    commitment_end_date: Optional[str] = None  # Taahhüt / Bitiş Tarihi
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
    commitment_end_date: Optional[str] = None
    account_id: Optional[str] = None
    description: Optional[str] = ""
    active: bool = True


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    default_amount: Optional[float] = None
    currency: Optional[Currency] = None
    day_of_month: Optional[int] = None
    commitment_end_date: Optional[str] = None
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
    commitment_end_date: Optional[str] = None
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
    commitment_end_date: Optional[str] = None
    account_id: Optional[str] = None
    notes: Optional[str] = ""
    active: bool = True


class FixedExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    day_of_month: Optional[int] = None
    commitment_end_date: Optional[str] = None
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
    is_recurring: bool = False
    commitment_end_date: Optional[str] = None
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
    is_recurring: bool = False
    commitment_end_date: Optional[str] = None


class ReceivableUpdate(BaseModel):
    customer: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    due_date: Optional[str] = None
    status: Optional[Literal["pending", "paid", "overdue"]] = None
    account_id: Optional[str] = None
    is_recurring: Optional[bool] = None
    commitment_end_date: Optional[str] = None


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
    expense_type: ExpenseType = "one_time"
    interest_rate: Optional[float] = 0.039  # 3.9%
    min_payment_pct: Optional[float] = 0.20  # 20%
    principal_amount: Optional[float] = None
    day_of_month: Optional[int] = None
    commitment_end_date: Optional[str] = None
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
    expense_type: ExpenseType = "one_time"
    interest_rate: Optional[float] = 0.039
    min_payment_pct: Optional[float] = 0.20
    principal_amount: Optional[float] = None
    day_of_month: Optional[int] = None
    commitment_end_date: Optional[str] = None


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    date: Optional[str] = None
    status: Optional[Literal["pending", "paid"]] = None
    account_id: Optional[str] = None
    notes: Optional[str] = None
    expense_type: Optional[ExpenseType] = None
    interest_rate: Optional[float] = None
    min_payment_pct: Optional[float] = None
    principal_amount: Optional[float] = None
    day_of_month: Optional[int] = None
    commitment_end_date: Optional[str] = None


class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = ""
    stage: TaskStage = "pending"
    priority: TaskPriority = "medium"
    due_date: str
    customer_name: Optional[str] = ""
    is_overdue: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    stage: TaskStage = "pending"
    priority: TaskPriority = "medium"
    due_date: str
    customer_name: Optional[str] = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    stage: Optional[TaskStage] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    customer_name: Optional[str] = None


class TaskStageUpdate(BaseModel):
    stage: TaskStage


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
    if isinstance(doc, dict):
        if "_id" in doc:
            if "id" not in doc:
                doc["id"] = str(doc["_id"])
            doc.pop("_id", None)
        doc.pop("password_hash", None)
    return doc


def today_iso():
    return date.today().isoformat()


def clamp_day(year: int, month: int, day: int) -> int:
    last = calmod.monthrange(year, month)[1]
    return min(day, last)


def next_n_month_dates(day_of_month: int, n: int = 12, end_date_str: Optional[str] = None) -> List[str]:
    today = date.today()
    y, m = today.year, today.month
    first_day = clamp_day(y, m, day_of_month)
    if first_day < today.day:
        m += 1
        if m > 12:
            m = 1
            y += 1
    dates = []
    end_dt = None
    if end_date_str:
        try:
            end_dt = date.fromisoformat(end_date_str[:10])
        except Exception:
            end_dt = None

    limit = n if not end_dt else min(n, 36)
    for _ in range(limit):
        d = clamp_day(y, m, day_of_month)
        cur_dt = date(y, m, d)
        if end_dt and cur_dt > end_dt:
            break
        dates.append(cur_dt.isoformat())
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
    dates = next_n_month_dates(
        customer["day_of_month"],
        12,
        end_date_str=customer.get("commitment_end_date"),
    )
    for due in dates:
        r = Receivable(
            user_id=customer["user_id"],
            customer=customer["name"],
            customer_id=customer["id"],
            description=customer.get("description", "") or "Aylık tekrarlı",
            amount=float(customer["default_amount"]),
            currency=customer["currency"],
            due_date=due,
            account_id=customer.get("account_id"),
            is_recurring=True,
            commitment_end_date=customer.get("commitment_end_date"),
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
    dates = next_n_month_dates(
        fixed["day_of_month"],
        12,
        end_date_str=fixed.get("commitment_end_date"),
    )
    for d in dates:
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
            expense_type="recurring",
            commitment_end_date=fixed.get("commitment_end_date"),
            status="pending",
        )
        await db.expenses.insert_one(e.model_dump())


async def recompute_receivable_statuses(user_id: str):
    today = today_iso()
    await db.receivables.update_many(
        {"user_id": user_id, "status": "pending", "due_date": {"$lt": today}},
        {"$set": {"status": "overdue"}},
    )


async def auto_escalate_tasks(user_id: str):
    today = today_iso()
    await db.tasks.update_many(
        {"user_id": user_id, "stage": {"$ne": "completed"}, "due_date": {"$lt": today}},
        {"$set": {"priority": "high", "is_overdue": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
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


# ============ LIVE CURRENCY SERVICE ============
_rates_cache = {
    "data": None,
    "timestamp": 0.0,
}


async def get_live_exchange_rates() -> Dict[str, Any]:
    global _rates_cache
    now = time.time()
    if _rates_cache["data"] and (now - _rates_cache["timestamp"] < 3600):
        return _rates_cache["data"]

    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            resp = await http_client.get("https://open.er-api.com/v6/latest/TRY")
            if resp.status_code == 200:
                body = resp.json()
                rates = body.get("rates", {})
                usd_rate = rates.get("USD", 1 / 38.50)
                eur_rate = rates.get("EUR", 1 / 41.80)
                usd_to_try = round(1.0 / usd_rate, 4) if usd_rate else 38.50
                eur_to_try = round(1.0 / eur_rate, 4) if eur_rate else 41.80

                _rates_cache["data"] = {
                    "base": "TRY",
                    "rates_to_try": {
                        "TRY": 1.0,
                        "USD": usd_to_try,
                        "EUR": eur_to_try,
                    },
                    "rates_from_try": {
                        "TRY": 1.0,
                        "USD": round(usd_rate, 6),
                        "EUR": round(eur_rate, 6),
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                _rates_cache["timestamp"] = now
                return _rates_cache["data"]
    except Exception as err:
        logger.warning(f"Live currency exchange rate fetch failed: {err}")

    # Fallback default rates
    if not _rates_cache.get("data"):
        _rates_cache["data"] = {
            "base": "TRY",
            "rates_to_try": {"TRY": 1.0, "USD": 38.50, "EUR": 41.80},
            "rates_from_try": {"TRY": 1.0, "USD": 0.025974, "EUR": 0.023923},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    return _rates_cache["data"]


@api_router.get("/currencies/rates")
async def get_currency_rates():
    rates = await get_live_exchange_rates()
    return rates


# ============ SYSTEM SETTINGS ENDPOINTS ============
@api_router.get("/settings/defaults")
async def get_system_defaults():
    doc = await db.system_settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        return {
            "default_interest_rate": 0.039,
            "default_min_payment_pct": 0.20,
            "default_currency": "TRY",
        }
    return {
        "default_interest_rate": doc.get("default_interest_rate", 0.039),
        "default_min_payment_pct": doc.get("default_min_payment_pct", 0.20),
        "default_currency": doc.get("default_currency", "TRY"),
    }


@api_router.get("/admin/settings")
async def admin_get_settings(_: dict = Depends(require_owner)):
    doc = await db.system_settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        doc = {
            "id": "global",
            "default_interest_rate": 0.039,
            "default_min_payment_pct": 0.20,
            "default_currency": "TRY",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.system_settings.insert_one(doc.copy())
    return clean(doc)


@api_router.patch("/admin/settings")
async def admin_update_settings(payload: SystemSettingsUpdate, _: dict = Depends(require_owner)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Güncellenecek alan yok")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.system_settings.find_one_and_update(
        {"id": "global"},
        {"$set": updates},
        upsert=True,
        return_document=True,
    )
    return clean(result)


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
            "display_currency": doc.get("display_currency", "TRY"),
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
    if payload.display_currency is not None:
        updates["display_currency"] = payload.display_currency
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
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses", "tasks"):
        await db[col].delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ============ ADMIN ENDPOINTS ============
@api_router.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_owner)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@api_router.post("/admin/users")
async def admin_create_user(payload: AdminCreateUser, _: dict = Depends(require_owner)):
    email = payload.email.lower().strip()
    if len(payload.password) < 8:
        raise HTTPException(400, "Şifre en az 8 karakter olmalı")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Bu e-posta zaten kayıtlı")
    u = User(
        email=email,
        name=payload.name.strip() or email.split("@")[0],
        role=payload.role,
        status="approved",  # created by admin is directly approved
    )
    doc = u.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    return clean(doc)


@api_router.post("/admin/users/{uid}/approve")
async def admin_approve(uid: str, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        return clean(doc)
    result = await db.users.find_one_and_update(
        query,
        {"$set": {"status": "approved"}},
        return_document=True,
    )
    return clean(result)


@api_router.post("/admin/users/{uid}/reject")
async def admin_reject(uid: str, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        return clean(doc)
    result = await db.users.find_one_and_update(
        query,
        {"$set": {"status": "rejected"}},
        return_document=True,
    )
    return clean(result)


@api_router.post("/admin/users/{uid}/revoke")
async def admin_revoke(uid: str, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        return clean(doc)
    result = await db.users.find_one_and_update(
        query,
        {"$set": {"status": "pending"}},
        return_document=True,
    )
    return clean(result)


@api_router.patch("/admin/users/{uid}")
async def admin_edit_user(uid: str, payload: AdminUserEdit, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
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
            exists = await db.users.find_one({"email": new_email, "id": {"$ne": doc.get("id", uid)}})
            if exists:
                raise HTTPException(400, "Bu e-posta zaten kullanılıyor")
            updates["email"] = new_email
    if not updates:
        raise HTTPException(400, "Güncellenecek alan yok")
    result = await db.users.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.post("/admin/users/{uid}/reset-password")
async def admin_reset_password(uid: str, payload: AdminPasswordReset, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        raise HTTPException(400, "Owner şifresi buradan sıfırlanamaz")
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Yeni şifre en az 8 karakter olmalı")
    await db.users.update_one(query, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"ok": True}


@api_router.delete("/admin/users/{uid}")
async def admin_delete(uid: str, _: dict = Depends(require_owner)):
    query = build_id_query(uid)
    doc = await db.users.find_one(query)
    if not doc:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    if doc.get("role") == "owner":
        raise HTTPException(400, "Owner silinemez")
    user_ids_to_clean = list({str(x) for x in [doc.get("id"), str(doc.get("_id", "")), uid] if x})
    # cascade delete user data
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses", "tasks", "kanban_columns"):
        await db[col].delete_many({"user_id": {"$in": user_ids_to_clean}})
    await db.users.delete_one(query)
    return {"ok": True}


# ============ ENCRYPTED DATABASE EXPORT & IMPORT ============
DB_COLLECTIONS = [
    "users", "accounts", "customers", "receivables", "expenses",
    "fixed_expenses", "tasks", "kanban_columns", "system_settings"
]


@api_router.get("/admin/export-database")
async def export_database(_: dict = Depends(require_owner)):
    data = {}
    for col in DB_COLLECTIONS:
        docs = await db[col].find({}, {"_id": 0}).to_list(10000)
        data[col] = docs

    payload_json = json.dumps(data, sort_keys=True)
    signature = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()

    dump = {
        "version": "2.0",
        "app": "Digiloq",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "signature": signature,
        "collections_count": {k: len(v) for k, v in data.items()},
        "data": data,
    }
    return dump


@api_router.post("/admin/import-database")
@api_router.post("/admin/restore-database")
async def import_database(payload: Dict[str, Any], _: dict = Depends(require_owner)):
    data = payload.get("data")
    sig = payload.get("signature")
    if not data or not sig:
        raise HTTPException(400, "Geçersiz yedek dosyası formatı")

    payload_json = json.dumps(data, sort_keys=True)
    expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(400, "Yedek bütünlük (HMAC) doğrulaması başarısız oldu")

    # Restore collections
    for col, docs in data.items():
        if col in DB_COLLECTIONS:
            await db[col].delete_many({})
            if docs:
                await db[col].insert_many(docs)

    return {"ok": True, "message": "Veritabanı başarıyla geri yüklendi"}


# ============ USER-LEVEL ENCRYPTED BACKUP & RESTORE ============
USER_EXPORT_COLLECTIONS = [
    "accounts", "customers", "receivables", "expenses",
    "fixed_expenses", "tasks", "kanban_columns"
]


@api_router.get("/user/export-backup")
@api_router.get("/export/backup")
async def export_user_backup(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    data = {}
    for col in USER_EXPORT_COLLECTIONS:
        docs = await db[col].find({"user_id": user_id}, {"_id": 0}).to_list(10000)
        data[col] = docs

    u_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0}) or {}
    data["profile"] = {
        "name": u_doc.get("name", user.get("name", "")),
        "email": u_doc.get("email", user.get("email", "")),
        "display_currency": u_doc.get("display_currency", "TRY"),
    }

    payload_json = json.dumps(data, sort_keys=True)
    signature = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()

    dump = {
        "version": "2.0",
        "type": "digiloq_user_backup",
        "user_email": user["email"],
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "signature": signature,
        "counts": {k: len(v) for k, v in data.items() if isinstance(v, list)},
        "data": data,
    }
    return dump


@api_router.post("/user/restore-backup")
@api_router.post("/restore/backup")
async def restore_user_backup(payload: Dict[str, Any], user: dict = Depends(get_current_user)):
    user_id = user["id"]
    data = payload.get("data")
    sig = payload.get("signature")
    if not data or not sig:
        raise HTTPException(400, "Geçersiz kullanıcı yedek dosyası")

    payload_json = json.dumps(data, sort_keys=True)
    expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(400, "Yedek bütünlük (HMAC) doğrulaması başarısız oldu veya dosya bozulmuş")

    restored_counts = {}
    for col in USER_EXPORT_COLLECTIONS:
        docs = data.get(col, [])
        if isinstance(docs, list):
            await db[col].delete_many({"user_id": user_id})
            if docs:
                sanitized = []
                for d in docs:
                    d_copy = dict(d)
                    d_copy["user_id"] = user_id
                    sanitized.append(d_copy)
                await db[col].insert_many(sanitized)
                restored_counts[col] = len(sanitized)
            else:
                restored_counts[col] = 0

    profile_data = data.get("profile", {})
    if profile_data.get("display_currency"):
        await db.users.update_one({"id": user_id}, {"$set": {"display_currency": profile_data["display_currency"]}})

    return {"ok": True, "message": "Kullanıcı verileri başarıyla geri yüklendi", "restored": restored_counts}


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
    query = build_id_query(account_id, user_id=user["id"])
    result = await db.accounts.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Account not found")
    return clean(result)


@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(get_current_user)):
    query = build_id_query(account_id, user_id=user["id"])
    result = await db.accounts.delete_one(query)
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
    query = build_id_query(cid, user_id=user["id"])
    result = await db.customers.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Customer not found")
    clean(result)
    await sync_customer_receivables(result)
    return result


@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(get_current_user)):
    c_query = build_id_query(cid, user_id=user["id"])
    doc = await db.customers.find_one(c_query)
    if not doc:
        raise HTTPException(404, "Customer not found")
    c_id = doc.get("id") or str(doc.get("_id", cid))
    today = today_iso()
    # Cascade delete all future & pending receivables associated with this customer
    or_targets = [
        {"customer_id": c_id},
        {"customer_id": cid},
        {"customer": doc.get("name"), "is_recurring": True},
    ]
    if ObjectId.is_valid(cid):
        try:
            or_targets.append({"customer_id": ObjectId(cid)})
        except Exception:
            pass
    if ObjectId.is_valid(c_id):
        try:
            or_targets.append({"customer_id": ObjectId(c_id)})
        except Exception:
            pass

    await db.receivables.delete_many({
        "user_id": user["id"],
        "$or": or_targets,
        "status": {"$in": ["pending", "overdue"]},
        "due_date": {"$gte": today},
    })
    await db.customers.delete_one(c_query)
    return {"ok": True}


# ============ FIXED EXPENSES (LEGACY BACKWARD COMPAT) ============
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
    query = build_id_query(fid, user_id=user["id"])
    result = await db.fixed_expenses.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Fixed expense not found")
    clean(result)
    await sync_fixed_expenses(result)
    return result


@api_router.delete("/fixed-expenses/{fid}")
async def delete_fixed_expense(fid: str, user: dict = Depends(get_current_user)):
    f_query = build_id_query(fid, user_id=user["id"])
    doc = await db.fixed_expenses.find_one(f_query)
    if not doc:
        raise HTTPException(404, "Fixed expense not found")
    f_id = doc.get("id") or str(doc.get("_id", fid))
    today = today_iso()
    # Cascade delete all future & pending expenses associated with this fixed expense
    or_targets = [
        {"fixed_expense_id": f_id},
        {"fixed_expense_id": fid},
        {"title": doc.get("title"), "expense_type": "recurring"},
    ]
    if ObjectId.is_valid(fid):
        try:
            or_targets.append({"fixed_expense_id": ObjectId(fid)})
        except Exception:
            pass
    if ObjectId.is_valid(f_id):
        try:
            or_targets.append({"fixed_expense_id": ObjectId(f_id)})
        except Exception:
            pass

    await db.expenses.delete_many({
        "user_id": user["id"],
        "$or": or_targets,
        "status": {"$in": ["pending", "overdue"]},
        "date": {"$gte": today},
    })
    await db.fixed_expenses.delete_one(f_query)
    return {"ok": True}


# ============ RECEIVABLES / GELIRLER ============
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

    # If recurring with commitment_end_date, generate subsequent monthly instances
    if payload.is_recurring and payload.commitment_end_date:
        try:
            start_d = date.fromisoformat(payload.due_date[:10])
            day_of_month = start_d.day
            dates = next_n_month_dates(day_of_month, 24, end_date_str=payload.commitment_end_date)
            for due in dates:
                if due != payload.due_date:
                    sub = Receivable(
                        user_id=user["id"],
                        customer=payload.customer,
                        customer_id=payload.customer_id,
                        description=payload.description or "Aylık tekrarlı gelir",
                        amount=payload.amount,
                        currency=payload.currency,
                        due_date=due,
                        account_id=payload.account_id,
                        is_recurring=True,
                        commitment_end_date=payload.commitment_end_date,
                        status="pending",
                    )
                    await db.receivables.insert_one(sub.model_dump())
        except Exception as err:
            logger.warning(f"Recurring receivables expansion failed: {err}")

    return r


@api_router.patch("/receivables/{rid}", response_model=Receivable)
async def update_receivable(rid: str, payload: ReceivableUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    query = build_id_query(rid, user_id=user["id"])
    result = await db.receivables.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Receivable not found")
    return clean(result)


@api_router.post("/receivables/{rid}/mark-paid", response_model=Receivable)
async def mark_receivable_paid(rid: str, user: dict = Depends(get_current_user)):
    query = build_id_query(rid, user_id=user["id"])
    r = await db.receivables.find_one(query)
    if not r:
        raise HTTPException(404, "Receivable not found")
    if r.get("status") == "paid":
        return clean(r)
    updates = {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}
    if r.get("account_id"):
        await db.accounts.update_one(
            {"id": r["account_id"], "user_id": user["id"], "currency": r["currency"]},
            {"$inc": {"balance": r["amount"]}},
        )
    result = await db.receivables.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.delete("/receivables/{rid}")
async def delete_receivable(
    rid: str,
    cascade_future: bool = Query(False),
    user: dict = Depends(get_current_user)
):
    query = build_id_query(rid, user_id=user["id"])
    doc = await db.receivables.find_one(query)
    if not doc:
        raise HTTPException(404, "Receivable not found")

    is_recurring = bool(cascade_future or doc.get("is_recurring") or doc.get("customer_id"))
    if is_recurring:
        today = today_iso()
        match_conditions = []
        if doc.get("customer_id"):
            c_id_str = str(doc["customer_id"])
            match_conditions.extend([
                {"customer_id": c_id_str},
                {"customer_id": doc["customer_id"]}
            ])
            if ObjectId.is_valid(c_id_str):
                try:
                    match_conditions.append({"customer_id": ObjectId(c_id_str)})
                except Exception:
                    pass
            # Permanently remove the parent recurring entity from MongoDB
            await db.customers.delete_one(build_id_query(c_id_str, user_id=user["id"]))

        if doc.get("customer"):
            match_conditions.append({"customer": doc["customer"], "is_recurring": True})
            # Also clean up parent customer by name if exists
            await db.customers.delete_many({"user_id": user["id"], "name": doc["customer"]})

        if match_conditions:
            await db.receivables.delete_many({
                "user_id": user["id"],
                "$or": match_conditions,
                "status": {"$in": ["pending", "overdue"]},
                "due_date": {"$gte": min(today, doc.get("due_date", today))},
            })

    await db.receivables.delete_one(query)
    return {"ok": True}


# ============ EXPENSES / GIDERLER ============
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
    # Fallback to system defaults for debt interest / min payment if not provided
    data = payload.model_dump()
    if data.get("expense_type") == "debt":
        defaults = await get_system_defaults()
        if data.get("interest_rate") is None or data.get("interest_rate") <= 0:
            data["interest_rate"] = defaults.get("default_interest_rate", 0.039)
        if data.get("min_payment_pct") is None or data.get("min_payment_pct") <= 0:
            data["min_payment_pct"] = defaults.get("default_min_payment_pct", 0.20)

    e = Expense(user_id=user["id"], **data)
    await db.expenses.insert_one(e.model_dump())

    # If recurring expense created directly, auto generate upcoming 12 months
    if payload.expense_type == "recurring" and not payload.fixed_expense_id:
        try:
            start_d = date.fromisoformat(payload.date[:10])
            day = payload.day_of_month or start_d.day
            dates = next_n_month_dates(day, 12, end_date_str=payload.commitment_end_date)
            for d in dates:
                if d != payload.date:
                    sub = Expense(
                        user_id=user["id"],
                        title=payload.title,
                        category=payload.category,
                        amount=payload.amount,
                        currency=payload.currency,
                        date=d,
                        account_id=payload.account_id,
                        notes=payload.notes or "Aylık tekrarlı gider",
                        expense_type="recurring",
                        day_of_month=day,
                        commitment_end_date=payload.commitment_end_date,
                        status="pending",
                    )
                    await db.expenses.insert_one(sub.model_dump())
        except Exception as err:
            logger.warning(f"Recurring expense expansion failed: {err}")

    return e


@api_router.patch("/expenses/{eid}", response_model=Expense)
async def update_expense(eid: str, payload: ExpenseUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    query = build_id_query(eid, user_id=user["id"])
    result = await db.expenses.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Expense not found")
    return clean(result)


@api_router.post("/expenses/{eid}/mark-paid", response_model=Expense)
async def mark_expense_paid(eid: str, user: dict = Depends(get_current_user)):
    query = build_id_query(eid, user_id=user["id"])
    e = await db.expenses.find_one(query)
    if not e:
        raise HTTPException(404, "Expense not found")
    if e.get("status") == "paid":
        return clean(e)
    updates = {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}
    if e.get("account_id"):
        await db.accounts.update_one(
            {"id": e["account_id"], "user_id": user["id"], "currency": e["currency"]},
            {"$inc": {"balance": -e["amount"]}},
        )
    result = await db.expenses.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.delete("/expenses/{eid}")
async def delete_expense(
    eid: str,
    cascade_future: bool = Query(False),
    user: dict = Depends(get_current_user)
):
    query = build_id_query(eid, user_id=user["id"])
    doc = await db.expenses.find_one(query)
    if not doc:
        raise HTTPException(404, "Expense not found")

    is_recurring = bool(cascade_future or doc.get("fixed_expense_id") or doc.get("expense_type") == "recurring")
    if is_recurring:
        today = today_iso()
        match_conditions = []
        if doc.get("fixed_expense_id"):
            fx_id_str = str(doc["fixed_expense_id"])
            match_conditions.extend([
                {"fixed_expense_id": fx_id_str},
                {"fixed_expense_id": doc["fixed_expense_id"]}
            ])
            if ObjectId.is_valid(fx_id_str):
                try:
                    match_conditions.append({"fixed_expense_id": ObjectId(fx_id_str)})
                except Exception:
                    pass
            # Permanently remove parent fixed expense
            await db.fixed_expenses.delete_one(build_id_query(fx_id_str, user_id=user["id"]))

        if doc.get("title"):
            match_conditions.append({"title": doc["title"], "expense_type": "recurring"})
            # Also clean up parent fixed expense by title
            await db.fixed_expenses.delete_many({"user_id": user["id"], "title": doc["title"]})

        if match_conditions:
            await db.expenses.delete_many({
                "user_id": user["id"],
                "$or": match_conditions,
                "status": {"$in": ["pending", "overdue"]},
                "date": {"$gte": min(today, doc.get("date", today))},
            })

    await db.expenses.delete_one(query)
    return {"ok": True}


# ============ WORKFLOW & KANBAN COLUMNS & TASKS ============
DEFAULT_COLUMNS = [
    {"key": "pending", "title": "Beklemede", "color": "zinc", "order": 0, "is_default": True},
    {"key": "in_progress", "title": "İşlemde", "color": "amber", "order": 1, "is_default": True},
    {"key": "approved", "title": "Onaylandı", "color": "blue", "order": 2, "is_default": True},
    {"key": "completed", "title": "Tamamlandı", "color": "emerald", "order": 3, "is_default": True},
]


async def get_or_create_default_kanban_columns(user_id: str) -> List[dict]:
    cols = await db.kanban_columns.find({"user_id": user_id}, {"_id": 0}).sort("order", 1).to_list(100)
    if not cols:
        docs = []
        for c in DEFAULT_COLUMNS:
            doc = KanbanColumn(user_id=user_id, **c).model_dump()
            docs.append(doc)
        if docs:
            await db.kanban_columns.insert_many(docs)
        return docs
    return cols


@api_router.get("/kanban/columns", response_model=List[KanbanColumn])
async def list_kanban_columns(user: dict = Depends(get_current_user)):
    cols = await get_or_create_default_kanban_columns(user["id"])
    return cols


@api_router.post("/kanban/columns", response_model=KanbanColumn)
async def create_kanban_column(payload: KanbanColumnCreate, user: dict = Depends(get_current_user)):
    cols = await get_or_create_default_kanban_columns(user["id"])
    max_order = max([c.get("order", 0) for c in cols], default=0)
    key_slug = str(uuid.uuid4())[:8]
    new_col = KanbanColumn(
        user_id=user["id"],
        key=key_slug,
        title=payload.title.strip(),
        color=payload.color or "purple",
        order=max_order + 1,
        is_default=False,
    )
    await db.kanban_columns.insert_one(new_col.model_dump())
    return new_col


@api_router.patch("/kanban/columns/{col_id}", response_model=KanbanColumn)
async def update_kanban_column(col_id: str, payload: KanbanColumnUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.kanban_columns.find_one_and_update(
        {"$or": [{"id": col_id}, {"key": col_id}], "user_id": user["id"]},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Column not found")
    return clean(result)


@api_router.delete("/kanban/columns/{col_id}")
async def delete_kanban_column(col_id: str, user: dict = Depends(get_current_user)):
    or_clauses = [{"id": col_id}, {"key": col_id}]
    if ObjectId.is_valid(col_id):
        try:
            or_clauses.append({"_id": ObjectId(col_id)})
        except Exception:
            pass
    doc = await db.kanban_columns.find_one({"user_id": user["id"], "$or": or_clauses})
    if not doc:
        raise HTTPException(404, "Sütun bulunamadı")
    key = doc.get("key", col_id)
    doc_id = doc.get("id", str(doc.get("_id", col_id)))

    # Find remaining columns to pick the first one as destination
    remaining_cols = await db.kanban_columns.find(
        {"user_id": user["id"], "key": {"$ne": key}, "id": {"$ne": doc_id}},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    target_stage = remaining_cols[0]["key"] if remaining_cols else "pending"

    # Move tasks in this column to the target stage
    await db.tasks.update_many(
        {"user_id": user["id"], "stage": key},
        {"$set": {"stage": target_stage, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.kanban_columns.delete_one({"user_id": user["id"], "$or": [{"id": doc_id}, {"key": key}]})
    return {"ok": True, "reassigned_to": target_stage}


@api_router.get("/tasks", response_model=List[Task])
async def list_tasks(user: dict = Depends(get_current_user)):
    await auto_escalate_tasks(user["id"])
    docs = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/tasks", response_model=Task)
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    today = today_iso()
    is_overdue = payload.due_date < today and payload.stage != "completed"
    priority = "high" if is_overdue else payload.priority

    t = Task(
        user_id=user["id"],
        title=payload.title.strip(),
        description=payload.description or "",
        stage=payload.stage,
        priority=priority,
        due_date=payload.due_date,
        customer_name=payload.customer_name or "",
        is_overdue=is_overdue,
    )
    await db.tasks.insert_one(t.model_dump())
    return t


@api_router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    query = build_id_query(task_id, user_id=user["id"])
    if "due_date" in updates or "stage" in updates:
        doc = await db.tasks.find_one(query)
        if not doc:
            raise HTTPException(404, "Task not found")
        due = updates.get("due_date", doc.get("due_date"))
        stage = updates.get("stage", doc.get("stage"))
        today = today_iso()
        if due < today and stage != "completed":
            updates["is_overdue"] = True
            updates["priority"] = "high"
        else:
            updates["is_overdue"] = False

    result = await db.tasks.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    if not result:
        raise HTTPException(404, "Task not found")
    return clean(result)


@api_router.patch("/tasks/{task_id}/stage", response_model=Task)
async def update_task_stage(task_id: str, payload: TaskStageUpdate, user: dict = Depends(get_current_user)):
    query = build_id_query(task_id, user_id=user["id"])
    doc = await db.tasks.find_one(query)
    if not doc:
        raise HTTPException(404, "Task not found")

    today = today_iso()
    updates = {
        "stage": payload.stage,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.stage == "completed":
        updates["is_overdue"] = False
    elif doc.get("due_date", "") < today:
        updates["is_overdue"] = True
        updates["priority"] = "high"

    result = await db.tasks.find_one_and_update(
        query, {"$set": updates}, return_document=True
    )
    return clean(result)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    query = build_id_query(task_id, user_id=user["id"])
    result = await db.tasks.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


# ============ DASHBOARD / SUMMARY ============
@api_router.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    await recompute_receivable_statuses(user["id"])
    await auto_escalate_tasks(user["id"])

    accounts = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    receivables = await db.receivables.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    expenses = await db.expenses.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    tasks = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)

    balances_by_currency = {}
    for a in accounts:
        c = a["currency"]
        balances_by_currency[c] = balances_by_currency.get(c, 0.0) + float(a["balance"])

    # Strict Current Month filter for pending cards
    today = date.today()
    cur_y, cur_m = today.year, today.month
    last_d = calmod.monthrange(cur_y, cur_m)[1]
    m_start = f"{cur_y}-{cur_m:02d}-01"
    m_end = f"{cur_y}-{cur_m:02d}-{last_d:02d}"

    pending_receivables_by_currency = {}
    overdue_by_currency = {}
    for r in receivables:
        due = r.get("due_date", "")
        if r["status"] == "pending" and m_start <= due <= m_end:
            pending_receivables_by_currency[r["currency"]] = (
                pending_receivables_by_currency.get(r["currency"], 0.0) + float(r["amount"])
            )
        elif r["status"] == "overdue":
            overdue_by_currency[r["currency"]] = (
                overdue_by_currency.get(r["currency"], 0.0) + float(r["amount"])
            )

    pending_expenses_by_currency = {}
    for e in expenses:
        edate = e.get("date", "")
        if e["status"] == "pending" and m_start <= edate <= m_end:
            pending_expenses_by_currency[e["currency"]] = (
                pending_expenses_by_currency.get(e["currency"], 0.0) + float(e["amount"])
            )

    # 30-day daily forecast
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

    # Monthly pending breakdown (next 12 months)
    monthly_pending = []
    proj_y, proj_m = today.year, today.month
    for _ in range(12):
        m_key = f"{proj_y}-{proj_m:02d}"
        last_day_m = calmod.monthrange(proj_y, proj_m)[1]
        proj_start = f"{proj_y}-{proj_m:02d}-01"
        proj_end = f"{proj_y}-{proj_m:02d}-{last_day_m:02d}"

        m_incomes = [
            r for r in receivables
            if r["status"] in ["pending", "overdue"] and proj_start <= r["due_date"] <= proj_end
        ]
        m_expenses = [
            e for e in expenses
            if e["status"] == "pending" and proj_start <= e["date"] <= proj_end
        ]

        m_inc_by_cur = {}
        for r in m_incomes:
            m_inc_by_cur[r["currency"]] = m_inc_by_cur.get(r["currency"], 0.0) + float(r["amount"])
        m_exp_by_cur = {}
        for e in m_expenses:
            m_exp_by_cur[e["currency"]] = m_exp_by_cur.get(e["currency"], 0.0) + float(e["amount"])

        monthly_pending.append({
            "month": m_key,
            "year": proj_y,
            "month_num": proj_m,
            "incomes_by_currency": m_inc_by_cur,
            "expenses_by_currency": m_exp_by_cur,
            "incomes_count": len(m_incomes),
            "expenses_count": len(m_expenses),
        })

        proj_m += 1
        if proj_m > 12:
            proj_m = 1
            proj_y += 1

    task_counts = {
        "pending": sum(1 for t in tasks if t.get("stage") == "pending"),
        "in_progress": sum(1 for t in tasks if t.get("stage") == "in_progress"),
        "approved": sum(1 for t in tasks if t.get("stage") == "approved"),
        "completed": sum(1 for t in tasks if t.get("stage") == "completed"),
        "overdue": sum(1 for t in tasks if t.get("is_overdue")),
    }

    rates_data = await get_live_exchange_rates()
    rates = rates_data.get("rates_to_try", {"TRY": 1.0, "USD": 34.0, "EUR": 37.0})

    total_net_worth_try = sum(
        float(bal) * float(rates.get(cur, 1.0)) for cur, bal in balances_by_currency.items()
    )
    pending_receivables_total_try = sum(
        float(amt) * float(rates.get(cur, 1.0)) for cur, amt in pending_receivables_by_currency.items()
    )
    pending_expenses_total_try = sum(
        float(amt) * float(rates.get(cur, 1.0)) for cur, amt in pending_expenses_by_currency.items()
    )
    overdue_receivables_count = sum(
        1 for r in receivables if r.get("status") == "overdue"
    )

    return {
        "rates": rates,
        "total_net_worth_try": total_net_worth_try,
        "pending_receivables_total_try": pending_receivables_total_try,
        "pending_expenses_total_try": pending_expenses_total_try,
        "overdue_receivables_count": overdue_receivables_count,
        "overdue_by_currency": overdue_by_currency,
        "balances_by_currency": balances_by_currency,
        "pending_receivables_by_currency": pending_receivables_by_currency,
        "pending_expenses_by_currency": pending_expenses_by_currency,
        "accounts_count": len(accounts),
        "cash_flow_forecast": days,
        "cash_flow_history": history,
        "monthly_pending": monthly_pending,
        "task_summary": task_counts,
    }


@api_router.get("/upcoming-payments")
async def upcoming_payments(
    user: dict = Depends(get_current_user),
    days: int = Query(60),
    past_days: int = Query(365),
    future_days: Optional[int] = Query(None),
    include_paid: bool = Query(True),
):
    await recompute_receivable_statuses(user["id"])
    await auto_escalate_tasks(user["id"])
    today = date.today()
    f_days = future_days if future_days is not None else max(days, 365)
    start_date = (today - timedelta(days=past_days)).isoformat()
    end_date = (today + timedelta(days=f_days)).isoformat()

    r_query = {
        "user_id": user["id"],
        "due_date": {"$gte": start_date, "$lte": end_date},
    }
    if not include_paid:
        r_query["status"] = {"$in": ["pending", "overdue"]}
    r_docs = await db.receivables.find(r_query, {"_id": 0}).to_list(3000)

    e_query = {
        "user_id": user["id"],
        "date": {"$gte": start_date, "$lte": end_date},
    }
    if not include_paid:
        e_query["status"] = "pending"
    e_docs = await db.expenses.find(e_query, {"_id": 0}).to_list(3000)

    t_query = {
        "user_id": user["id"],
        "due_date": {"$gte": start_date, "$lte": end_date},
    }
    t_docs = await db.tasks.find(t_query, {"_id": 0}).to_list(2000)

    items = []
    for r in r_docs:
        items.append({
            "id": r.get("id") or str(r.get("_id", "")),
            "type": "receivable",
            "title": r.get("customer", "Gelir"),
            "description": r.get("description", ""),
            "amount": r["amount"],
            "currency": r["currency"],
            "date": r["due_date"],
            "status": r["status"],
            "is_recurring": r.get("is_recurring", False),
            "customer_id": r.get("customer_id"),
            "paid_at": r.get("paid_at"),
            "commitment_end_date": r.get("commitment_end_date"),
        })
    for e in e_docs:
        items.append({
            "id": e.get("id") or str(e.get("_id", "")),
            "type": "expense",
            "title": e.get("title", "Gider"),
            "description": e.get("category", ""),
            "amount": e["amount"],
            "currency": e["currency"],
            "date": e["date"],
            "status": e["status"],
            "expense_type": e.get("expense_type", "one_time"),
            "fixed_expense_id": e.get("fixed_expense_id"),
            "interest_rate": e.get("interest_rate"),
            "min_payment_pct": e.get("min_payment_pct"),
            "principal_amount": e.get("principal_amount"),
            "paid_at": e.get("paid_at"),
            "commitment_end_date": e.get("commitment_end_date"),
        })
    for t in t_docs:
        items.append({
            "id": t.get("id") or str(t.get("_id", "")),
            "type": "task",
            "title": t["title"],
            "description": t.get("customer_name") or t.get("description", ""),
            "amount": 0,
            "currency": "TRY",
            "date": t["due_date"],
            "status": "completed" if t.get("stage") == "completed" else ("overdue" if t.get("is_overdue") else "pending"),
            "priority": t.get("priority", "medium"),
            "stage": t.get("stage", "pending"),
            "customer_name": t.get("customer_name", ""),
            "updated_at": t.get("updated_at"),
        })

    items.sort(key=lambda x: x["date"])
    return items


# ============ USER DATA EXPORT ============
@api_router.get("/export/data")
async def export_user_data(user: dict = Depends(get_current_user)):
    receivables = await db.receivables.find({"user_id": user["id"]}, {"_id": 0}).sort("due_date", -1).to_list(5000)
    expenses = await db.expenses.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(5000)
    accounts = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    tasks = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)

    return {
        "user": user,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "incomes": receivables,
        "expenses": expenses,
        "accounts": accounts,
        "tasks": tasks,
    }


@api_router.get("/")
async def root():
    return {"message": "Digiloq API", "status": "ok", "version": "2.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


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


async def seed_system_settings():
    doc = await db.system_settings.find_one({"id": "global"})
    if not doc:
        settings = {
            "id": "global",
            "default_interest_rate": 0.039,
            "default_min_payment_pct": 0.20,
            "default_currency": "TRY",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.system_settings.insert_one(settings)
        logger.info("System default settings seeded")


async def migrate_orphan_docs():
    """Attach docs without user_id to owner (best-effort migration for pre-auth data)."""
    owner_email = os.environ.get("OWNER_EMAIL", "").lower().strip()
    owner = await db.users.find_one({"email": owner_email})
    if not owner:
        return
    for col in ("accounts", "receivables", "expenses", "customers", "fixed_expenses", "tasks"):
        r = await db[col].update_many(
            {"user_id": {"$exists": False}}, {"$set": {"user_id": owner["id"]}}
        )
        if r.modified_count:
            logger.info(f"Migrated {r.modified_count} docs in {col} to owner")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index([("user_id", 1), ("stage", 1)])
    await db.expenses.create_index([("user_id", 1), ("date", -1)])
    await db.receivables.create_index([("user_id", 1), ("due_date", 1)])
    await seed_owner()
    await seed_system_settings()
    await migrate_orphan_docs()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
