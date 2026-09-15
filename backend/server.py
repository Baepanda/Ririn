import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Annotated

import jwt
import bcrypt
import requests
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordBearer
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_HOURS = 24 * 7

Role = Literal["owner", "warehouse", "accounting", "employee"]

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("golden")

# ----------------------------------------------------------------------------
# Object storage (Emergent managed)
# ----------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "golden"
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "role": user["role"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    return {
        "id": u["id"], "username": u["username"], "role": u["role"],
        "full_name": u.get("full_name", ""), "salary": u.get("salary"),
        "position": u.get("position", ""), "phone": u.get("phone", ""),
        "email": u.get("email", ""), "address": u.get("address", ""),
        "ktp": u.get("ktp", ""), "contract": u.get("contract", ""),
        "join_date": u.get("join_date", ""), "status": u.get("status", "active"),
        "locked": u.get("locked", False), "failed_attempts": u.get("failed_attempts", 0),
    }


# ----------------------------------------------------------------------------
# App
# ----------------------------------------------------------------------------
app = FastAPI(title="Golden API")
api_router = APIRouter(prefix="/api")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def current_user(token: Annotated[Optional[str], Depends(oauth2)]):
    err = HTTPException(status_code=401, detail="Sesi tidak valid, silakan login ulang")
    if not token:
        raise err
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload["sub"]
    except Exception:
        raise err
    u = await db.users.find_one({"id": uid})
    if not u or u.get("locked") or u.get("status") == "inactive":
        raise err
    return u


def require_role(*allowed):
    async def dep(u=Depends(current_user)):
        if u["role"] not in allowed:
            raise HTTPException(403, "Anda tidak memiliki akses ke fungsi ini")
        return u
    return dep


# ----------------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------------
class LoginBody(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=4, max_length=64)
    role: Role
    full_name: str
    position: str = ""
    salary: Optional[float] = None
    phone: str = ""
    email: str = ""
    address: str = ""
    ktp: str = ""
    contract: str = ""
    join_date: str = ""


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    ktp: Optional[str] = None
    contract: Optional[str] = None
    join_date: Optional[str] = None
    status: Optional[str] = None
    role: Optional[Role] = None


class ResetPassword(BaseModel):
    password: str = Field(min_length=4, max_length=64)


class ItemCreate(BaseModel):
    name: str
    category: str = ""
    karat: str = ""
    weight_gram: Optional[float] = None
    cost_price: float
    quantity: int = Field(default=1, ge=1, le=200)
    photo_path: str = ""
    note: str = ""


class CartLine(BaseModel):
    item_id: str
    sell_price: float


class SaleCreate(BaseModel):
    lines: List[CartLine]
    customer: str = ""
    note: str = ""


class SaleComplete(BaseModel):
    payment_method: Literal["tunai", "transfer", "debit", "kredit"]
    transaction_number: str = ""


class OpnameItem(BaseModel):
    item_id: str
    name: str
    system_qty: int
    counted_qty: int


class OpnameCreate(BaseModel):
    period_type: Literal["weekly", "monthly", "yearly"] = "weekly"
    notes: str = ""
    items: List[OpnameItem]


class DamageBody(BaseModel):
    reason: str = ""


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(body: LoginBody):
    u = await db.users.find_one({"username": body.username})
    if not u:
        raise HTTPException(401, "Username atau password salah")
    if u.get("locked"):
        raise HTTPException(423, "Akun terkunci. Hubungi Owner untuk membuka blokir.")
    if u.get("status") == "inactive":
        raise HTTPException(403, "Akun tidak aktif")
    if not verify_pw(body.password, u["password_hash"]):
        attempts = u.get("failed_attempts", 0) + 1
        locked = attempts >= 3
        await db.users.update_one({"id": u["id"]},
                                  {"$set": {"failed_attempts": attempts, "locked": locked}})
        if locked:
            raise HTTPException(423, "Akun terkunci setelah 3 kali gagal. Hubungi Owner.")
        raise HTTPException(401, f"Username atau password salah ({attempts}/3)")
    await db.users.update_one({"id": u["id"]}, {"$set": {"failed_attempts": 0}})
    return {"access_token": make_token(u), "token_type": "bearer", "user": public_user(u)}


@api_router.get("/me")
async def me(u=Depends(current_user)):
    return public_user(u)


# ----------------------------------------------------------------------------
# User management (owner)
# ----------------------------------------------------------------------------
@api_router.post("/users")
async def create_user(body: UserCreate, owner=Depends(require_role("owner"))):
    exists = await db.users.find_one({"username": body.username})
    if exists:
        raise HTTPException(409, "Username sudah dipakai")
    doc = body.model_dump(exclude={"password"})
    doc.update({
        "id": str(uuid.uuid4()),
        "password_hash": hash_pw(body.password),
        "status": "active", "locked": False, "failed_attempts": 0,
        "created_at": now_iso(),
    })
    await db.users.insert_one(doc)
    return public_user(doc)


@api_router.get("/users")
async def list_users(owner=Depends(require_role("owner"))):
    users = await db.users.find({"status": {"$ne": "deleted"}}).to_list(1000)
    return [public_user(u) for u in users]


@api_router.patch("/users/{uid}")
async def update_user(uid: str, body: UserUpdate, owner=Depends(require_role("owner"))):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(400, "Tidak ada data untuk diubah")
    r = await db.users.update_one({"id": uid}, {"$set": patch})
    if r.matched_count != 1:
        raise HTTPException(404, "User tidak ditemukan")
    u = await db.users.find_one({"id": uid})
    return public_user(u)


@api_router.post("/users/{uid}/reset-password")
async def reset_password(uid: str, body: ResetPassword, owner=Depends(require_role("owner"))):
    r = await db.users.update_one({"id": uid}, {"$set": {
        "password_hash": hash_pw(body.password), "failed_attempts": 0,
        "locked": False, "status": "active"}})
    if r.matched_count != 1:
        raise HTTPException(404, "User tidak ditemukan")
    return {"ok": True}


@api_router.post("/users/{uid}/unblock")
async def unblock(uid: str, owner=Depends(require_role("owner"))):
    r = await db.users.update_one({"id": uid}, {"$set": {"failed_attempts": 0, "locked": False}})
    if r.matched_count != 1:
        raise HTTPException(404, "User tidak ditemukan")
    return {"ok": True}


@api_router.delete("/users/{uid}")
async def delete_user(uid: str, owner=Depends(require_role("owner"))):
    r = await db.users.update_one({"id": uid}, {"$set": {"status": "deleted", "deleted_at": now_iso()}})
    if r.matched_count != 1:
        raise HTTPException(404, "User tidak ditemukan")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Image upload / serve
# ----------------------------------------------------------------------------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), u=Depends(current_user)):
    data = await file.read()
    ext = (file.filename or "img.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "heic"):
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{u['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        result = await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(402, "Penyimpanan penuh. Hubungi admin.")
        raise HTTPException(502, "Gagal mengunggah gambar")
    return {"path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str, token: Optional[str] = Query(default=None)):
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(404, "Gambar tidak ditemukan")
    return Response(content=content, media_type=ctype,
                    headers={"Cache-Control": "public, max-age=86400"})


# ----------------------------------------------------------------------------
# Inventory / Items
# ----------------------------------------------------------------------------
@api_router.post("/items")
async def create_items(body: ItemCreate, u=Depends(require_role("warehouse", "owner"))):
    created = []
    for _ in range(body.quantity):
        doc = {
            "id": str(uuid.uuid4()),
            "qr_code": uuid.uuid4().hex[:12].upper(),
            "name": body.name, "category": body.category, "karat": body.karat,
            "weight_gram": body.weight_gram, "cost_price": body.cost_price,
            "photo_path": body.photo_path, "note": body.note,
            # pending_acc -> in_stock (ready) -> sold ; damaged ; rejected
            "status": "in_stock" if u["role"] == "owner" else "pending_acc",
            "created_by": u["id"], "created_by_name": u.get("full_name", u["username"]),
            "created_at": now_iso(), "approved_at": "", "approved_by": "",
        }
        await db.items.insert_one(doc)
        created.append({k: v for k, v in doc.items() if k != "_id"})
    return {"count": len(created), "items": created}


@api_router.post("/items/{item_id}/approve")
async def approve_item(item_id: str, owner=Depends(require_role("owner"))):
    it = await db.items.find_one({"id": item_id})
    if not it:
        raise HTTPException(404, "Barang tidak ditemukan")
    if it.get("status") != "pending_acc":
        raise HTTPException(409, "Barang tidak dalam status menunggu ACC")
    await db.items.update_one({"id": item_id}, {"$set": {
        "status": "in_stock", "approved_at": now_iso(), "approved_by": owner["id"]}})
    return {"ok": True}


@api_router.post("/items/{item_id}/reject")
async def reject_item(item_id: str, owner=Depends(require_role("owner"))):
    r = await db.items.update_one({"id": item_id, "status": "pending_acc"},
                                  {"$set": {"status": "rejected"}})
    if r.matched_count != 1:
        raise HTTPException(404, "Barang tidak ditemukan / sudah diproses")
    return {"ok": True}


@api_router.post("/items/{item_id}/damage")
async def mark_damage(item_id: str, body: DamageBody, u=Depends(require_role("warehouse", "owner"))):
    it = await db.items.find_one({"id": item_id})
    if not it:
        raise HTTPException(404, "Barang tidak ditemukan")
    if it.get("status") == "sold":
        raise HTTPException(409, "Barang sudah terjual")
    await db.items.update_one({"id": item_id}, {"$set": {
        "status": "damaged", "damaged_at": now_iso(),
        "damage_reason": body.reason, "damaged_by_name": u.get("full_name", u["username"])}})
    return {"ok": True}


@api_router.post("/items/{item_id}/restore")
async def restore_item(item_id: str, u=Depends(require_role("warehouse", "owner"))):
    r = await db.items.update_one({"id": item_id, "status": "damaged"},
                                  {"$set": {"status": "in_stock"}})
    if r.matched_count != 1:
        raise HTTPException(404, "Barang tidak ditemukan / bukan status rusak")
    return {"ok": True}


@api_router.get("/items")
async def list_items(status: str = "in_stock", u=Depends(current_user)):
    query = {} if status == "all" else {"status": status}
    items = await db.items.find(query).sort("created_at", -1).to_list(2000)
    return [{k: v for k, v in it.items() if k != "_id"} for it in items]


@api_router.get("/items/qr/{qr_code}")
async def get_by_qr(qr_code: str, u=Depends(current_user)):
    it = await db.items.find_one({"qr_code": qr_code.upper()})
    if not it:
        raise HTTPException(404, "Barang tidak ditemukan")
    st = it.get("status")
    if st == "sold":
        raise HTTPException(409, "Barang sudah terjual / keluar inventaris")
    if st == "pending_acc":
        raise HTTPException(409, "Barang belum di-ACC Owner")
    if st == "damaged":
        raise HTTPException(409, "Barang berstatus rusak")
    if st != "in_stock":
        raise HTTPException(409, "Barang tidak tersedia")
    return {k: v for k, v in it.items() if k != "_id"}


@api_router.get("/items/{item_id}")
async def get_item(item_id: str, u=Depends(current_user)):
    it = await db.items.find_one({"id": item_id})
    if not it:
        raise HTTPException(404, "Barang tidak ditemukan")
    return {k: v for k, v in it.items() if k != "_id"}


# ----------------------------------------------------------------------------
# Sales
# ----------------------------------------------------------------------------
def compute_sale_totals(lines_data):
    total_sell = sum(l["sell_price"] for l in lines_data)
    total_cost = sum(l["cost_price"] for l in lines_data)
    profit = total_sell - total_cost
    profit_pct = round((profit / total_cost * 100), 2) if total_cost else 0
    return total_sell, total_cost, profit, profit_pct


@api_router.post("/sales")
async def create_sale(body: SaleCreate, u=Depends(require_role("employee", "owner"))):
    if not body.lines:
        raise HTTPException(400, "Keranjang kosong")
    lines_data = []
    for line in body.lines:
        it = await db.items.find_one({"id": line.item_id})
        if not it:
            raise HTTPException(404, f"Barang tidak ditemukan: {line.item_id}")
        if it.get("status") != "in_stock":
            raise HTTPException(409, f"Barang '{it['name']}' sudah tidak tersedia")
        lines_data.append({
            "item_id": it["id"], "qr_code": it["qr_code"], "name": it["name"],
            "photo_path": it.get("photo_path", ""), "weight_gram": it.get("weight_gram"),
            "karat": it.get("karat", ""), "cost_price": it["cost_price"],
            "sell_price": line.sell_price,
        })
    total_sell, total_cost, profit, profit_pct = compute_sale_totals(lines_data)
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": "",
        "lines": lines_data, "customer": body.customer, "note": body.note,
        "total_sell": total_sell, "total_cost": total_cost,
        "profit": profit, "profit_pct": profit_pct,
        "status": "pending_approval",  # pending_approval | approved | rejected | completed
        "payment_method": "", "transaction_number": "", "reject_reason": "",
        "created_by": u["id"], "created_by_name": u.get("full_name", u["username"]),
        "created_at": now_iso(), "completed_at": "",
    }
    await db.sales.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.get("/sales")
async def list_sales(status: Optional[str] = None, u=Depends(current_user)):
    query = {}
    if status:
        query["status"] = status
    if u["role"] == "employee":
        query["created_by"] = u["id"]
    sales = await db.sales.find(query).sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in s.items() if k != "_id"} for s in sales]


@api_router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, u=Depends(current_user)):
    s = await db.sales.find_one({"id": sale_id})
    if not s:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return {k: v for k, v in s.items() if k != "_id"}


@api_router.post("/sales/{sale_id}/approve")
async def approve_sale(sale_id: str, owner=Depends(require_role("owner"))):
    s = await db.sales.find_one({"id": sale_id})
    if not s:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    if s["status"] != "pending_approval":
        raise HTTPException(409, "Transaksi tidak dalam status menunggu persetujuan")
    await db.sales.update_one({"id": sale_id}, {"$set": {
        "status": "approved", "approved_at": now_iso(), "approved_by": owner["id"]}})
    return {"ok": True}


@api_router.post("/sales/{sale_id}/reject")
async def reject_sale(sale_id: str, body: dict, owner=Depends(require_role("owner"))):
    s = await db.sales.find_one({"id": sale_id})
    if not s:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    await db.sales.update_one({"id": sale_id}, {"$set": {
        "status": "rejected", "reject_reason": body.get("reason", "")}})
    return {"ok": True}


@api_router.post("/sales/{sale_id}/complete")
async def complete_sale(sale_id: str, body: SaleComplete, u=Depends(require_role("employee", "owner"))):
    s = await db.sales.find_one({"id": sale_id})
    if not s:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    if s["status"] != "approved":
        raise HTTPException(409, "Harga transaksi belum di-ACC oleh Owner")
    if body.payment_method in ("transfer", "debit") and not body.transaction_number.strip():
        raise HTTPException(400, "Nomor transaksi wajib diisi untuk transfer/debit")
    # mark items sold (out of inventory)
    item_ids = [l["item_id"] for l in s["lines"]]
    await db.items.update_many({"id": {"$in": item_ids}}, {"$set": {
        "status": "sold", "sold_at": now_iso(), "sale_id": sale_id}})
    count = await db.sales.count_documents({"status": "completed"})
    receipt_no = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:04d}"
    await db.sales.update_one({"id": sale_id}, {"$set": {
        "status": "completed", "payment_method": body.payment_method,
        "transaction_number": body.transaction_number, "receipt_no": receipt_no,
        "completed_at": now_iso()}})
    s = await db.sales.find_one({"id": sale_id})
    return {k: v for k, v in s.items() if k != "_id"}


# ----------------------------------------------------------------------------
# Stock Opname
# ----------------------------------------------------------------------------
@api_router.post("/stock-opname")
async def create_opname(body: OpnameCreate, u=Depends(require_role("warehouse", "owner"))):
    items = [i.model_dump() for i in body.items]
    total_system = sum(i["system_qty"] for i in items)
    total_counted = sum(i["counted_qty"] for i in items)
    discrepancies = [i for i in items if i["counted_qty"] != i["system_qty"]]
    doc = {
        "id": str(uuid.uuid4()),
        "period_type": body.period_type, "notes": body.notes, "items": items,
        "total_system": total_system, "total_counted": total_counted,
        "difference": total_counted - total_system,
        "discrepancy_count": len(discrepancies),
        "status": "pending",  # pending | approved
        "created_by": u["id"], "created_by_name": u.get("full_name", u["username"]),
        "created_at": now_iso(),
    }
    await db.opnames.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.get("/stock-opname")
async def list_opname(period: Optional[str] = None, u=Depends(current_user)):
    query = {}
    if period in ("weekly", "monthly", "yearly"):
        query["period_type"] = period
    rows = await db.opnames.find(query).sort("created_at", -1).to_list(500)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]


@api_router.post("/stock-opname/{opname_id}/approve")
async def approve_opname(opname_id: str, owner=Depends(require_role("owner"))):
    r = await db.opnames.update_one({"id": opname_id}, {"$set": {
        "status": "approved", "approved_at": now_iso()}})
    if r.matched_count != 1:
        raise HTTPException(404, "Laporan tidak ditemukan")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Reports
# ----------------------------------------------------------------------------
@api_router.get("/reports/daily-sales")
async def daily_sales(date: Optional[str] = None, u=Depends(require_role("accounting", "owner"))):
    day = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sales = await db.sales.find({"status": "completed"}).sort("completed_at", -1).to_list(2000)
    day_sales = [s for s in sales if str(s.get("completed_at", "")).startswith(day)]
    by_method = {}
    total_income = total_profit = 0.0
    for s in day_sales:
        total_income += s["total_sell"]
        total_profit += s["profit"]
        m = s.get("payment_method", "tunai")
        by_method[m] = by_method.get(m, 0) + s["total_sell"]
    return {
        "date": day, "transaction_count": len(day_sales),
        "total_income": total_income, "total_profit": total_profit,
        "by_method": by_method,
        "sales": [{k: v for k, v in s.items() if k != "_id"} for s in day_sales],
    }


@api_router.get("/reports/summary")
async def summary(owner=Depends(require_role("owner"))):
    in_stock = await db.items.count_documents({"status": "in_stock"})
    sold_items = await db.items.count_documents({"status": "sold"})
    damaged_items = await db.items.count_documents({"status": "damaged"})
    pending_items = await db.items.count_documents({"status": "pending_acc"})
    completed = await db.sales.find({"status": "completed"}).to_list(5000)
    pending = await db.sales.count_documents({"status": "pending_approval"})
    total_revenue = sum(s["total_sell"] for s in completed)
    total_cost = sum(s["total_cost"] for s in completed)
    gross_profit = total_revenue - total_cost
    margin = round((gross_profit / total_revenue * 100), 2) if total_revenue else 0
    stock_value = 0.0
    async for it in db.items.find({"status": "in_stock"}):
        stock_value += it.get("cost_price", 0)
    return {
        "in_stock": in_stock, "sold_items": sold_items, "damaged_items": damaged_items,
        "pending_items": pending_items, "stock_value": stock_value,
        "sales_count": len(completed), "pending_approvals": pending,
        "pending_total": pending + pending_items,
        "total_revenue": total_revenue, "total_cost": total_cost,
        "gross_profit": gross_profit, "margin": margin,
    }


@api_router.get("/reports/trend")
async def trend(type: str = "daily", owner=Depends(require_role("owner"))):
    completed = await db.sales.find({"status": "completed"}).to_list(10000)
    now = datetime.now(timezone.utc)
    buckets = []
    id_months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
    id_days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    if type == "monthly":
        # last 6 calendar months
        for i in range(5, -1, -1):
            y = now.year
            m = now.month - i
            while m <= 0:
                m += 12
                y -= 1
            prefix = f"{y:04d}-{m:02d}"
            total = sum(s["total_sell"] for s in completed if str(s.get("completed_at", "")).startswith(prefix))
            buckets.append({"label": id_months[m - 1], "value": total})
    else:
        # last 7 days
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            prefix = d.strftime("%Y-%m-%d")
            total = sum(s["total_sell"] for s in completed if str(s.get("completed_at", "")).startswith(prefix))
            buckets.append({"label": id_days[(d.weekday() + 1) % 7], "value": total})
    return {"type": type, "points": buckets}


# ----------------------------------------------------------------------------
# Startup: seed accounts + storage
# ----------------------------------------------------------------------------
SEED_USERS = [
    {"username": "AditCEO", "password": "Adit123", "role": "owner", "full_name": "Adit (Owner)", "position": "Owner"},
    {"username": "gudang", "password": "gudang123", "role": "warehouse", "full_name": "Staff Gudang", "position": "Warehouse"},
    {"username": "akun", "password": "akun123", "role": "accounting", "full_name": "Staff Akunting", "position": "Accounting"},
    {"username": "karyawan", "password": "karyawan123", "role": "employee", "full_name": "Karyawan Toko", "position": "Sales"},
]


@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    await db.items.create_index("qr_code")
    for su in SEED_USERS:
        existing = await db.users.find_one({"username": su["username"]})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "username": su["username"],
                "password_hash": hash_pw(su["password"]), "role": su["role"],
                "full_name": su["full_name"], "position": su["position"],
                "salary": None, "status": "active", "locked": False,
                "failed_attempts": 0, "created_at": now_iso(),
            })
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (will retry on upload): {e}")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
