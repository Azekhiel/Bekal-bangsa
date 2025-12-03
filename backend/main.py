import traceback
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

# --- RATE LIMITER ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# --- TAMBAHAN PENTING (DARI MAIN_OLD) ---
from pydantic import BaseModel 

# --- DATABASE & MODELS ---
from database import supabase
from models import (
    SupplyItem, MenuRequest, OrderRequest, OrderStatusUpdate, 
    CookRequest, IoTLogRequest, UserRegister, UserLogin, Token,
    GoogleLoginRequest, ChatRequest
)

# --- SECURITY ---
# Pastikan file security.py sudah dibuat di folder yang sama
from security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user
)

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

# --- SERVICES ---
from services.vision import analyze_market_inventory, analyze_cooked_meal
from services.kitchen import generate_menu_recommendation, cook_meal, chat_with_chef
from services.logistics import search_suppliers, search_nearest_sppg
from services.inventory import calculate_expiry_date, check_expiry_and_notify
from services.storage import upload_image_to_supabase
from services.analytics import get_kitchen_analytics, get_vendor_analytics

# 1. Setup Limiter (Kunci berdasarkan IP Address)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Bekal Bangsa API", version="1.0.0")

# 2. Pasang Limiter & CORS
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all untuk kemudahan demo/hackathon
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend Bekal Bangsa Ready 🚀", "auth_mode": "JWT Enabled"}

# ==========================================
# 🔐 BAGIAN 1: OTENTIKASI (AUTH)
# ==========================================

@app.post("/api/auth/register", response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, user: UserRegister):
    """
    Mendaftarkan user baru (Vendor/Kitchen) ke database Supabase.
    """
    # 1. Cek apakah email/username sudah ada
    existing = supabase.table("users").select("id")\
        .or_(f"email.eq.{user.email},username.eq.{user.username}")\
        .execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="Email atau Username sudah terdaftar")

    # 2. Hash Password
    hashed_pw = get_password_hash(user.password)

    # 3. Siapkan data user (Default lokasi Monas untuk demo jika kosong)
    user_data = {
        "full_name": user.full_name,
        "email": user.email,
        "username": user.username,
        "password": hashed_pw,
        "role": user.role,
        "phone_number": user.phone_number,
        "address": user.address,
        "latitude": -6.175392, # Default demo location
        "longitude": 106.827153
    }
    
    try:
        # 4. Insert ke DB
        res = supabase.table("users").insert(user_data).execute()
        new_user = res.data[0]
        
        # 5. Auto Login (Generate Token)
        access_token = create_access_token(data={"sub": str(new_user['id']), "role": new_user['role']})
        
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {
                "id": new_user['id'],
                "full_name": new_user['full_name'],
                "role": new_user['role']
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal register: {str(e)}")

@app.post("/api/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, creds: UserLogin):
    """
    Login dengan Username ATAU Email.
    """
    try:
        # Cari user di DB
        res = supabase.table("users").select("*")\
            .or_(f"email.eq.{creds.username_or_email},username.eq.{creds.username_or_email}")\
            .execute()
        
        user = res.data[0] if res.data else None

        # Verifikasi Password
        if not user or not verify_password(creds.password, user['password']):
            raise HTTPException(status_code=401, detail="Username atau Password salah")

        # Generate Token JWT
        token = create_access_token(data={"sub": str(user['id']), "role": user['role']})
        
        return {
            "access_token": token, 
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "full_name": user['full_name'],
                "role": user['role'],
                "address": user.get('address'),
                "latitude": user.get('latitude'),
                "longitude": user.get('longitude')
            }
        }
    except Exception as e:
        # Tangkap error lain biar server gak crash
        print(f"Login Error: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal Server Error saat Login")

# ==========================================
# 📦 BAGIAN 2: FITUR VENDOR (PROTECTED)
# ==========================================

@app.post("/api/supplies")
@limiter.limit("20/minute")
async def create_supplies(
    request: Request, 
    items: List[SupplyItem], 
    current_user: dict = Depends(get_current_user) # <--- WAJIB LOGIN
):
    """
    Upload stok dagangan. 
    Hanya user dengan role 'vendor' yang boleh akses.
    Data otomatis diberi label milik user yang login.
    """
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Akses ditolak: Hanya Vendor bisa upload stok")

    try:
        # Ambil info lengkap user (buat field owner_name & location di tabel supplies)
        user_info_res = supabase.table("users").select("*").eq("id", current_user["user_id"]).single().execute()
        user_info = user_info_res.data

        data_to_insert = []
        for item in items:
            # Hitung tanggal expiry otomatis jika user tidak isi manual
            final_expiry = item.expiry_date
            if not final_expiry and item.expiry_days:
                final_expiry = calculate_expiry_date(item.expiry_days)
            
            data_to_insert.append({
                "item_name": item.name,
                "quantity": item.qty,
                "unit": item.unit,
                "quality_status": item.freshness,
                "expiry_days": item.expiry_days,
                "expiry_date": final_expiry,
                "photo_url": item.photo_url,
                "ai_notes": item.note,
                
                # --- PENTING: RELASI KE USER ---
                "user_id": current_user["user_id"], # Link ID Foreign Key
                
                # Denormalisasi data (opsional, biar query gampang)
                "owner_name": user_info.get('full_name', 'Vendor'), 
                "location": user_info.get('address', 'Pasar Tradisional'),
                "latitude": item.latitude or user_info.get('latitude'),
                "longitude": item.longitude or user_info.get('longitude')
            })
        
        response = supabase.table("supplies").insert(data_to_insert).execute()
        return {"status": "success", "count": len(items), "data": response.data}
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/supplies/vendor")
async def get_my_supplies(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Dashboard Vendor: Hanya menampilkan barang milik user yang sedang login.
    """
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    try:
        # Filter: user_id == ID Login
        response = supabase.table("supplies").select("*")\
            .eq("user_id", current_user["user_id"])\
            .order("created_at", desc=True).execute()
        return {"supplies": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# backend/main.py

@app.get("/api/orders/umkm")
async def get_incoming_orders(request: Request, current_user: dict = Depends(get_current_user)):
    # 1. Cek Role
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Akses ditolak")

    print(f"🔍 Fetching orders for Seller ID: {current_user['user_id']}") # Debug Log di Terminal

    try:
        # STRATEGI 1: Cari berdasarkan seller_id (Langsung & Cepat)
        orders_query = supabase.table("orders")\
            .select("*, supplies(item_name, unit)")\
            .eq("seller_id", current_user["user_id"])\
            .order("created_at", desc=True)\
            .execute()
        
        orders_data = orders_query.data

        # STRATEGI 2: Fallback (Jika data lama belum punya seller_id)
        if not orders_data:
            print("⚠️ No orders found by seller_id. Trying fallback via supply ownership...")
            
            # A. Cari ID semua barang milik vendor ini
            my_supplies = supabase.table("supplies").select("id").eq("user_id", current_user["user_id"]).execute()
            my_supply_ids = [s['id'] for s in my_supplies.data]
            
            if my_supply_ids:
                # B. Cari Order yang supply_id-nya ada di list barang saya
                fallback_query = supabase.table("orders")\
                    .select("*, supplies(item_name, unit)")\
                    .in_("supply_id", my_supply_ids)\
                    .order("created_at", desc=True)\
                    .execute()
                orders_data = fallback_query.data

        print(f"✅ Found {len(orders_data)} orders") # Debug Log
        return {"orders": orders_data}

    except Exception as e:
        print(f"❌ Error fetching orders: {e}")
        # Jangan sembunyikan error, kirim ke frontend biar ketahuan
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/orders/{order_id}")
async def update_order_status(order_id: int, update: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    """
    Vendor menerima/menolak pesanan.
    """
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    try:
        # Idealnya cek dulu apakah order ini milik vendor, tapi untuk demo langsung update aja
        response = supabase.table("orders").update({"status": update.status}).eq("id", order_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🍳 BAGIAN 3: FITUR KITCHEN (PROTECTED)
# ==========================================

@app.post("/api/orders")
@limiter.limit("20/minute")
async def create_order(
    request: Request, 
    order: OrderRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Kitchen membuat pesanan ke Vendor.
    """
    if current_user["role"] != "kitchen":
        raise HTTPException(status_code=403, detail="Hanya Kitchen bisa memesan")

    try:
        # Ambil nama kitchen buat dipasang di order
        user_res = supabase.table("users").select("full_name").eq("id", current_user["user_id"]).single().execute()
        kitchen_name = user_res.data['full_name']

        # Cari tahu siapa penjualnya (Seller ID) berdasarkan supply_id
        supply_res = supabase.table("supplies").select("user_id").eq("id", order.supply_id).single().execute()
        seller_id = supply_res.data['user_id'] if supply_res.data else None

        data = {
            "supply_id": order.supply_id,
            "qty_ordered": order.qty_ordered,
            "status": "pending",
            
            # Info Pembeli & Penjual
            "buyer_id": current_user["user_id"],
            "buyer_name": kitchen_name, 
            "seller_id": seller_id
        }
        
        response = supabase.table("orders").insert(data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- TAMBAHAN BARU: RIWAYAT BELANJA KITCHEN ---
@app.get("/api/orders/kitchen")
async def get_my_orders(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Melihat riwayat pesanan yang dibuat oleh Kitchen ini.
    """
    if current_user["role"] != "kitchen":
        raise HTTPException(status_code=403, detail="Akses ditolak")

    try:
        # Ambil orders dimana buyer_id = user yang login
        # Join dengan supplies untuk dapat nama barang
        orders = supabase.table("orders")\
            .select("*, supplies(item_name, unit)")\
            .eq("buyer_id", current_user["user_id"])\
            .order("created_at", desc=True)\
            .execute()
            
        return {"orders": orders.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/kitchen/cook")
async def cook_meal_endpoint(request: Request, req_data: CookRequest, current_user: dict = Depends(get_current_user)):
    """
    Mencatat produksi makanan & mengurangi stok.
    """
    if current_user["role"] != "kitchen":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    try:
        # Panggil logic service
        result = cook_meal(req_data.menu_name, req_data.qty_produced, req_data.ingredients_ids)
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kitchen/meals")
async def get_cooked_meals(request: Request):
    """
    Ambil riwayat masakan yang sudah diproduksi (untuk monitoring expiry).
    """
    try:
        response = supabase.table("meal_productions").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🤖 BAGIAN 4: FITUR PUBLIK & AI
# ==========================================

@app.post("/api/analyze")
@limiter.limit("10/minute")
async def analyze_image(request: Request, file: UploadFile = File(...)):
    """
    AI Vision: Analisis Stok Mentah.
    Rate Limit: 10x / menit per IP.
    """
    try:
        image_bytes = await file.read()
        # Jalankan di threadpool biar tidak blocking
        result = await run_in_threadpool(analyze_market_inventory, image_bytes)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/api/kitchen/scan-meal")
@app.post("/api/kitchen/scan-food") # Alias untuk endpoint yang sama
@limiter.limit("10/minute")
async def scan_meal(request: Request, file: UploadFile = File(...)):
    """
    AI Vision: QC Makanan Matang.
    """
    try:
        image_bytes = await file.read()
        result = await run_in_threadpool(analyze_cooked_meal, image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
@limiter.limit("30/minute")
async def upload_file_endpoint(request: Request, file: UploadFile = File(...)):
    """
    Upload gambar ke Supabase Storage.
    """
    try:
        url = await upload_image_to_supabase(file)
        if not url:
            raise HTTPException(status_code=500, detail="Gagal upload ke Storage")
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend-menu")
@limiter.limit("10/minute")
async def recommend_menu_endpoint(request: Request, request_data: MenuRequest):
    """
    AI Text: Rekomendasi Menu dari Stok.
    """
    result = await run_in_threadpool(generate_menu_recommendation, request_data.ingredients)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

# ==========================================
# 🌍 BAGIAN 5: DASHBOARD & PENCARIAN
# ==========================================

@app.get("/api/supplies")
async def get_all_supplies(request: Request, skip: int = 0, limit: int = 100):
    """
    Melihat semua stok di pasar (Katalog Belanja Kitchen).
    Tidak perlu login biar Kitchen bisa browsing dulu.
    """
    try:
        response = supabase.table("supplies").select("*")\
            .order("created_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/suppliers/search")
async def find_suppliers(request: Request, q: str, lat: float = -6.175392, long: float = 106.827153):
    """
    Cari supplier berdasarkan keyword & lokasi terdekat.
    """
    results = search_suppliers(q, lat, long)
    if isinstance(results, dict) and "error" in results:
        raise HTTPException(status_code=500, detail=results["error"])
    return {"status": "success", "count": len(results), "data": results}

@app.get("/api/sppg/search")
async def find_nearest_sppg(request: Request, lat: float, long: float):
    """
    Vendor mencari lokasi Kitchen/SPPG terdekat.
    """
    results = search_nearest_sppg(lat, long)
    return {"status": "success", "data": results}

# --- ANALYTICS ---
@app.get("/api/analytics/kitchen")
async def kitchen_analytics_endpoint(request: Request):
    result = get_kitchen_analytics()
    if "error" in result: raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/api/analytics/vendor")
async def vendor_analytics_endpoint(request: Request, current_user: dict = Depends(get_current_user)):
    # Pastikan user adalah vendor
    if current_user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Akses ditolak")

    # Kirim user_id ke fungsi analytics
    result = get_vendor_analytics(current_user["user_id"])
    
    if "error" in result: 
        raise HTTPException(status_code=500, detail=result["error"])
    return result
# ==========================================
# 📡 BAGIAN 6: IOT & NOTIFIKASI
# ==========================================

@app.post("/api/iot/log")
@limiter.limit("120/minute")
async def log_iot_data(request: Request, data: IoTLogRequest):
    try:
        payload = {
            "temperature": data.temperature,
            "humidity": data.humidity,
            "device_id": data.device_id
        }
        response = supabase.table("storage_logs").insert(payload).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/api/iot/logs")
async def get_iot_logs(request: Request):
    try:
        response = supabase.table("storage_logs").select("*").order("created_at", desc=True).limit(50).execute()
        return {"logs": response.data} # Wrap in object for frontend consistency
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/trigger")
def trigger_expiry_notifications(request: Request):
    """
    Cron job untuk cek barang mau busuk.
    """
    try:
        return check_expiry_and_notify()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🌍 GOOGLE LOGIN MODEL
# ==========================================

class GoogleLoginRequest(BaseModel):
    token: str
    role: str = "vendor" # Default role jika user baru

@app.post("/api/auth/google", response_model=Token)
async def google_login(data: GoogleLoginRequest):
    """
    Tukar Google Token dengan App Token (JWT).
    Jika user belum ada di DB, otomatis REGISTER.
    """
    token = data.token
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    try:
        # 1. Verifikasi Token ke Server Google
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        
        # Ambil data profil dari Google
        email = id_info['email']
        name = id_info.get('name', 'Google User')
        google_sub = id_info['sub'] # ID unik Google user
        
        # 2. Cek apakah user sudah ada di Database
        res = supabase.table("users").select("*").eq("email", email).execute()
        user = res.data[0] if res.data else None
        
        if not user:
            # 3. Jika belum ada, AUTO REGISTER
            new_user_data = {
                "full_name": name,
                "email": email,
                "username": email.split("@")[0], # Pakai nama depan email sbg username
                "password": get_password_hash(f"GOOGLE_{google_sub}"), # Password dummy acak yg kuat
                "role": data.role, # Role diambil dari pilihan user di frontend
                "latitude": -6.175392, # Default
                "longitude": 106.827153
            }
            insert_res = supabase.table("users").insert(new_user_data).execute()
            user = insert_res.data[0]
            
        # 4. Generate Token Aplikasi (Sama seperti login biasa)
        access_token = create_access_token(data={"sub": str(user['id']), "role": user['role']})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "full_name": user['full_name'],
                "role": user['role'],
                "address": user.get('address'),
                "latitude": user.get('latitude'),
                "longitude": user.get('longitude')
            }
        }
        
    except ValueError as e:
        # Token tidak valid
        raise HTTPException(status_code=401, detail="Token Google tidak valid")
    except Exception as e:
        print(f"Google Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Tambahkan di BAGIAN 3 (FITUR KITCHEN)

@app.post("/api/kitchen/chat")
async def chat_chef_endpoint(request: Request, chat_data: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Endpoint Chatbot AI Chef dengan konteks stok + logistik vendor.
    """
    if current_user["role"] != "kitchen":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    try:
        # Panggil fungsi chat_with_chef yang baru
        result = await run_in_threadpool(chat_with_chef, chat_data.message, current_user["user_id"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))