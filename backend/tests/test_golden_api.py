"""Golden API backend integration tests.

Covers: auth (login, lockout, /me), user management (owner CRUD + role guard),
inventory items (create with quantity generates unique QR, GET, QR lookup),
sales lifecycle (create pending -> approve -> complete + payment validation),
stock opname (create/list/approve), reports (daily-sales + summary), and
role-based access enforcement across roles.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for local pytest run - read from frontend/.env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE_URL}/api"

OWNER = {"username": "AditCEO", "password": "Adit123"}
GUDANG = {"username": "gudang", "password": "gudang123"}
AKUN = {"username": "akun", "password": "akun123"}
KARYAWAN = {"username": "karyawan", "password": "karyawan123"}


# ---------------------------------------------------------------- helpers
def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    return r


def _tok(creds):
    r = _login(creds)
    assert r.status_code == 200, f"login failed for {creds['username']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------- fixtures
@pytest.fixture(scope="session")
def owner_token():
    return _tok(OWNER)


@pytest.fixture(scope="session")
def gudang_token():
    return _tok(GUDANG)


@pytest.fixture(scope="session")
def akun_token():
    return _tok(AKUN)


@pytest.fixture(scope="session")
def karyawan_token():
    return _tok(KARYAWAN)


# =============================================================== AUTH
class TestAuth:
    def test_owner_login_returns_token_and_role(self):
        r = _login(OWNER)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["token_type"] == "bearer"
        assert data["user"]["role"] == "owner"
        assert data["user"]["username"] == "AditCEO"

    def test_me_with_token(self, owner_token):
        r = requests.get(f"{API}/me", headers=_h(owner_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_me_without_token(self):
        assert requests.get(f"{API}/me", timeout=30).status_code == 401

    def test_wrong_password_shows_attempts(self):
        # use seeded karyawan with 1 wrong attempt then correct login resets counter
        r = _login({"username": "karyawan", "password": "wrongxxx"})
        assert r.status_code == 401
        assert "/3" in r.json().get("detail", "")
        # reset by logging correctly
        assert _login(KARYAWAN).status_code == 200

    def test_lockout_after_three_failures_and_unblock(self, owner_token):
        # Create disposable user
        uname = f"TEST_lock_{uuid.uuid4().hex[:6]}"
        payload = {"username": uname, "password": "goodpass", "role": "employee",
                   "full_name": "TEST lock user"}
        c = requests.post(f"{API}/users", json=payload, headers=_h(owner_token), timeout=30)
        assert c.status_code == 200, c.text
        uid = c.json()["id"]
        try:
            # 3 wrong attempts -> lockout
            codes = []
            for _ in range(3):
                codes.append(_login({"username": uname, "password": "badpass"}).status_code)
            assert codes[-1] == 423, f"expected lock after 3 attempts, got {codes}"
            # good password now also refused with 423
            r = _login({"username": uname, "password": "goodpass"})
            assert r.status_code == 423
            # owner unblock
            un = requests.post(f"{API}/users/{uid}/unblock", headers=_h(owner_token), timeout=30)
            assert un.status_code == 200
            # login works
            assert _login({"username": uname, "password": "goodpass"}).status_code == 200
            # owner reset password
            rp = requests.post(f"{API}/users/{uid}/reset-password",
                               json={"password": "newpass9"},
                               headers=_h(owner_token), timeout=30)
            assert rp.status_code == 200
            assert _login({"username": uname, "password": "newpass9"}).status_code == 200
        finally:
            requests.delete(f"{API}/users/{uid}", headers=_h(owner_token), timeout=30)


# =============================================================== USERS
class TestUsers:
    def test_owner_create_list_patch_delete(self, owner_token):
        uname = f"TEST_wh_{uuid.uuid4().hex[:6]}"
        pay = {"username": uname, "password": "pw12345", "role": "warehouse",
               "full_name": "TEST WH", "salary": 5000000, "position": "Warehouse"}
        c = requests.post(f"{API}/users", json=pay, headers=_h(owner_token), timeout=30)
        assert c.status_code == 200, c.text
        u = c.json()
        assert u["role"] == "warehouse" and u["username"] == uname
        assert u["salary"] == 5000000
        uid = u["id"]
        try:
            lst = requests.get(f"{API}/users", headers=_h(owner_token), timeout=30)
            assert lst.status_code == 200
            assert any(x["id"] == uid for x in lst.json())
            # patch
            p = requests.patch(f"{API}/users/{uid}",
                               json={"full_name": "TEST WH renamed", "phone": "0812"},
                               headers=_h(owner_token), timeout=30)
            assert p.status_code == 200 and p.json()["full_name"] == "TEST WH renamed"
            assert p.json()["phone"] == "0812"
            # duplicate username
            dup = requests.post(f"{API}/users", json=pay, headers=_h(owner_token), timeout=30)
            assert dup.status_code == 409
        finally:
            d = requests.delete(f"{API}/users/{uid}", headers=_h(owner_token), timeout=30)
            assert d.status_code == 200
            # soft delete -> not listed
            lst2 = requests.get(f"{API}/users", headers=_h(owner_token), timeout=30)
            assert not any(x["id"] == uid for x in lst2.json())

    def test_non_owner_forbidden(self, gudang_token, karyawan_token, akun_token):
        pay = {"username": f"TEST_x_{uuid.uuid4().hex[:5]}", "password": "pw12345",
               "role": "employee", "full_name": "x"}
        for tok in (gudang_token, karyawan_token, akun_token):
            r = requests.post(f"{API}/users", json=pay, headers=_h(tok), timeout=30)
            assert r.status_code == 403


# =============================================================== ITEMS
@pytest.fixture(scope="session")
def created_items(gudang_token):
    """Create 3 items via warehouse, return their dicts. Not cleaned (used by sales)."""
    body = {"name": "TEST_Cincin 24K", "category": "Cincin", "karat": "24",
            "weight_gram": 3.5, "cost_price": 3000000, "quantity": 3, "note": "TEST"}
    r = requests.post(f"{API}/items", json=body, headers=_h(gudang_token), timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["count"] == 3
    assert len(data["items"]) == 3
    qrs = {i["qr_code"] for i in data["items"]}
    assert len(qrs) == 3, "QR codes must be unique per unit"
    for it in data["items"]:
        assert it["status"] == "in_stock"
        assert len(it["qr_code"]) == 12
    return data["items"]


class TestItems:
    def test_employee_cannot_create_items(self, karyawan_token):
        body = {"name": "x", "cost_price": 1000, "quantity": 1}
        r = requests.post(f"{API}/items", json=body, headers=_h(karyawan_token), timeout=30)
        assert r.status_code == 403

    def test_list_items_in_stock_contains_created(self, gudang_token, created_items):
        r = requests.get(f"{API}/items?status=in_stock", headers=_h(gudang_token), timeout=30)
        assert r.status_code == 200
        ids = {it["id"] for it in r.json()}
        for it in created_items:
            assert it["id"] in ids

    def test_qr_lookup_ok_then_409_after_sold(self, gudang_token, created_items):
        it = created_items[0]
        r = requests.get(f"{API}/items/qr/{it['qr_code']}",
                         headers=_h(gudang_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == it["id"]
        # unknown QR
        r2 = requests.get(f"{API}/items/qr/ZZZZZZZZZZZZ",
                          headers=_h(gudang_token), timeout=30)
        assert r2.status_code == 404


# =============================================================== SALES
class TestSalesFlow:
    def test_full_sales_lifecycle_and_role_enforcement(
        self, owner_token, gudang_token, karyawan_token, akun_token, created_items
    ):
        it_a, it_b, it_c = created_items[:3]

        # warehouse cannot create sale
        bad = requests.post(f"{API}/sales",
                            json={"lines": [{"item_id": it_a["id"], "sell_price": 4000000}]},
                            headers=_h(gudang_token), timeout=30)
        assert bad.status_code == 403

        # employee creates sale (items a + b)
        sale_body = {
            "lines": [
                {"item_id": it_a["id"], "sell_price": 4000000},
                {"item_id": it_b["id"], "sell_price": 4200000},
            ],
            "customer": "TEST customer",
        }
        c = requests.post(f"{API}/sales", json=sale_body,
                          headers=_h(karyawan_token), timeout=30)
        assert c.status_code == 200, c.text
        sale = c.json()
        sid = sale["id"]
        assert sale["status"] == "pending_approval"
        assert sale["total_sell"] == 8200000
        assert sale["total_cost"] == 6000000  # 2 * 3_000_000
        assert sale["profit"] == 2200000
        assert sale["profit_pct"] == round(2200000 / 6000000 * 100, 2)

        # complete before approve -> 409
        early = requests.post(f"{API}/sales/{sid}/complete",
                              json={"payment_method": "tunai"},
                              headers=_h(karyawan_token), timeout=30)
        assert early.status_code == 409

        # non-owner cannot approve
        na = requests.post(f"{API}/sales/{sid}/approve",
                           headers=_h(karyawan_token), timeout=30)
        assert na.status_code == 403
        na2 = requests.post(f"{API}/sales/{sid}/approve",
                            headers=_h(akun_token), timeout=30)
        assert na2.status_code == 403

        # owner approves
        ap = requests.post(f"{API}/sales/{sid}/approve",
                           headers=_h(owner_token), timeout=30)
        assert ap.status_code == 200
        # double approve -> 409
        assert requests.post(f"{API}/sales/{sid}/approve",
                             headers=_h(owner_token), timeout=30).status_code == 409

        # transfer without txn number -> 400
        miss = requests.post(f"{API}/sales/{sid}/complete",
                             json={"payment_method": "transfer"},
                             headers=_h(karyawan_token), timeout=30)
        assert miss.status_code == 400

        # debit without txn number -> 400
        miss2 = requests.post(f"{API}/sales/{sid}/complete",
                              json={"payment_method": "debit", "transaction_number": ""},
                              headers=_h(karyawan_token), timeout=30)
        assert miss2.status_code == 400

        # tunai complete OK
        done = requests.post(f"{API}/sales/{sid}/complete",
                             json={"payment_method": "tunai"},
                             headers=_h(karyawan_token), timeout=30)
        assert done.status_code == 200, done.text
        completed = done.json()
        assert completed["status"] == "completed"
        assert completed["receipt_no"].startswith("INV-")
        assert completed["payment_method"] == "tunai"

        # items no longer in stock
        r = requests.get(f"{API}/items?status=in_stock",
                         headers=_h(gudang_token), timeout=30)
        in_stock_ids = {it["id"] for it in r.json()}
        assert it_a["id"] not in in_stock_ids
        assert it_b["id"] not in in_stock_ids
        assert it_c["id"] in in_stock_ids  # untouched

        # QR of sold item -> 409
        q = requests.get(f"{API}/items/qr/{it_a['qr_code']}",
                         headers=_h(gudang_token), timeout=30)
        assert q.status_code == 409

        # ---- second sale: reject flow
        s2 = requests.post(f"{API}/sales",
                           json={"lines": [{"item_id": it_c["id"], "sell_price": 3900000}]},
                           headers=_h(karyawan_token), timeout=30)
        assert s2.status_code == 200
        sid2 = s2.json()["id"]
        rj = requests.post(f"{API}/sales/{sid2}/reject",
                           json={"reason": "harga kurang"},
                           headers=_h(owner_token), timeout=30)
        assert rj.status_code == 200
        got = requests.get(f"{API}/sales/{sid2}",
                           headers=_h(owner_token), timeout=30).json()
        assert got["status"] == "rejected"
        assert got["reject_reason"] == "harga kurang"

        # transfer with txn number: create a fresh sale on item C? it's still in stock (rejected sale doesn't consume)
        # create new stock item to test transfer path
        new_item = requests.post(f"{API}/items",
                                 json={"name": "TEST_G", "cost_price": 1000000, "quantity": 1},
                                 headers=_h(gudang_token), timeout=30).json()["items"][0]
        s3 = requests.post(f"{API}/sales",
                           json={"lines": [{"item_id": new_item["id"], "sell_price": 1500000}]},
                           headers=_h(karyawan_token), timeout=30)
        sid3 = s3.json()["id"]
        assert requests.post(f"{API}/sales/{sid3}/approve",
                             headers=_h(owner_token), timeout=30).status_code == 200
        okt = requests.post(f"{API}/sales/{sid3}/complete",
                            json={"payment_method": "transfer", "transaction_number": "TRX-001"},
                            headers=_h(karyawan_token), timeout=30)
        assert okt.status_code == 200
        assert okt.json()["transaction_number"] == "TRX-001"


# =============================================================== OPNAME
class TestOpname:
    def test_create_list_approve_and_role_filter(self, owner_token, gudang_token, karyawan_token):
        # karyawan cannot create opname
        r = requests.post(f"{API}/stock-opname",
                          json={"period_type": "weekly", "items": []},
                          headers=_h(karyawan_token), timeout=30)
        assert r.status_code == 403

        body = {
            "period_type": "monthly",
            "notes": "TEST opname",
            "items": [
                {"item_id": "x1", "name": "Cincin", "system_qty": 10, "counted_qty": 9},
                {"item_id": "x2", "name": "Kalung", "system_qty": 5, "counted_qty": 5},
            ],
        }
        c = requests.post(f"{API}/stock-opname", json=body,
                          headers=_h(gudang_token), timeout=30)
        assert c.status_code == 200, c.text
        op = c.json()
        assert op["total_system"] == 15 and op["total_counted"] == 14
        assert op["difference"] == -1 and op["discrepancy_count"] == 1
        assert op["status"] == "pending" and op["period_type"] == "monthly"
        oid = op["id"]

        lst = requests.get(f"{API}/stock-opname?period=monthly",
                           headers=_h(owner_token), timeout=30)
        assert lst.status_code == 200
        assert any(x["id"] == oid for x in lst.json())

        # only monthly appears; weekly filter should not include it
        lst_w = requests.get(f"{API}/stock-opname?period=weekly",
                             headers=_h(owner_token), timeout=30).json()
        assert not any(x["id"] == oid for x in lst_w)

        # non-owner cannot approve
        na = requests.post(f"{API}/stock-opname/{oid}/approve",
                           headers=_h(gudang_token), timeout=30)
        assert na.status_code == 403

        ap = requests.post(f"{API}/stock-opname/{oid}/approve",
                           headers=_h(owner_token), timeout=30)
        assert ap.status_code == 200

        # verify status changed
        again = requests.get(f"{API}/stock-opname?period=monthly",
                             headers=_h(owner_token), timeout=30).json()
        row = next(x for x in again if x["id"] == oid)
        assert row["status"] == "approved"


# =============================================================== REPORTS
class TestReports:
    def test_daily_sales_accounting_and_owner(self, akun_token, owner_token):
        for tok in (akun_token, owner_token):
            r = requests.get(f"{API}/reports/daily-sales",
                             headers=_h(tok), timeout=30)
            assert r.status_code == 200
            body = r.json()
            for key in ("date", "transaction_count", "total_income",
                        "total_profit", "by_method", "sales"):
                assert key in body
            assert isinstance(body["sales"], list)

    def test_daily_sales_forbidden_for_warehouse_and_employee(self, gudang_token, karyawan_token):
        for tok in (gudang_token, karyawan_token):
            assert requests.get(f"{API}/reports/daily-sales",
                                headers=_h(tok), timeout=30).status_code == 403

    def test_summary_owner_only(self, owner_token, akun_token):
        r = requests.get(f"{API}/reports/summary",
                         headers=_h(owner_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        for k in ("in_stock", "stock_value", "sales_count", "pending_approvals",
                  "total_revenue", "total_cost", "gross_profit", "margin"):
            assert k in body
        assert isinstance(body["in_stock"], int)
        # accounting forbidden
        assert requests.get(f"{API}/reports/summary",
                            headers=_h(akun_token), timeout=30).status_code == 403
