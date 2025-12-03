from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from services.vision import analyze_market_inventory, analyze_cooked_meal
from services.kitchen import generate_menu_recommendation, calculate_meal_expiry, cook_meal, mark_meal_as_served
from services.logistics import search_suppliers, search_nearest_sppg
from services.inventory import calculate_expiry_date, check_expiry_and_notify
from services.storage import upload_image_to_supabase
from services.analytics import get_kitchen_analytics, get_vendor_analytics
from database import supabase
from models import SupplyItem, MenuRequest, OrderRequest, OrderStatusUpdate, CookRequest, MealAnalysisRequest, IoTLogRequest
from typing import List
from datetime import datetime, timedelta

# --- RATE LIMITER IMPORTS ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 1. Setup Limiter (Kunci berdasarkan IP Address User)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()

# 2. Pasang Limiter ke App State & Exception Handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS (Biar Next.js di localhost:3000 bisa akses)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", # Next.js Local
        "http://localhost:8000", # FastAPI Docs
        "https://bekal-bangsa.vercel.app", # Production (Example)
    ], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend Bekal Bangsa Ready 🚀"}

# --- FITUR 1: ANALISIS GAMBAR & UPLOAD FOTO (AI Vision) ---
# LIMIT: 10x per menit (Karena mahal pakai Claude Vision)
@app.post("/api/analyze")
@limiter.limit("10/minute")
async def analyze_image(request: Request, file: UploadFile = File(...)):
    """
    1. Terima Gambar
    2. Kirim ke Claude Sonnet
    3. Balikin JSON (Belum disimpan ke DB, cuma preview)
    """
    try:
        image_bytes = await file.read()
        # Run synchronous AI call in a separate thread
        from fastapi.concurrency import run_in_threadpool
        result = await run_in_threadpool(analyze_market_inventory, image_bytes)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# LIMIT: 20x per menit (Upload file biasa)
@app.post("/api/upload")
@limiter.limit("20/minute")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Upload foto barang ke Supabase Storage.
    Return: {"url": "https://..."}
    """
    try:
        url = await upload_image_to_supabase(file)
        if not url:
            raise HTTPException(status_code=500, detail="Gagal upload ke Supabase")
            
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 2: SIMPAN STOK (BULK INSERT) ---
# LIMIT: 10x per menit (Mencegah spam data sampah ke DB)
@app.post("/api/supplies")
@limiter.limit("10/minute")
async def create_supplies(request: Request, items: List[SupplyItem]):
    """
    Menerima DAFTAR barang (List) dari Frontend, 
    lalu simpan semuanya ke database dalam satu kali tembak.
    """
    if not items:
        return {"status": "empty", "message": "Tidak ada barang untuk disimpan"}

    try:
        data_to_insert = []
        
        # Loop semua barang yang dikirim frontend
        for item in items:
            # Hitung tanggal kadaluarsa otomatis jika belum ada
            final_expiry_date = item.expiry_date
            if not final_expiry_date and item.expiry_days:
                final_expiry_date = calculate_expiry_date(item.expiry_days)
            
            data_to_insert.append({
                "item_name": item.name,
                "quantity": item.qty,
                "unit": item.unit,
                "quality_status": item.freshness,
                "expiry_days": item.expiry_days,
                "expiry_date": final_expiry_date, # Field baru di DB
                "photo_url": item.photo_url,      # Field baru di DB
                "ai_notes": item.note,
                "owner_name": item.owner_name,
                "location": item.location,
                "latitude": item.latitude,   # Simpan GPS Real
                "longitude": item.longitude  # Simpan GPS Real
            })
        
        # Supabase support insert BANYAK sekaligus (Bulk Insert)
        response = supabase.table("supplies").insert(data_to_insert).execute()
        
        return {
            "status": "success", 
            "count": len(items), 
            "data": response.data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 3: LIHAT DASHBOARD (Database) ---
# LIMIT: 60x per menit (Aman untuk refresh dashboard)
@app.get("/api/supplies")
@limiter.limit("60/minute")
async def get_supplies(request: Request, skip: int = 0, limit: int = 100):
    """
    Buat Dashboard Admin SPPG: Ambil semua stok yg tersedia
    Default limit 100 item biar gak berat.
    """
    try:
        response = supabase.table("supplies").select("*")\
            .order("created_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/supplies/vendor")
@limiter.limit("60/minute")
async def get_vendor_supplies(request: Request):
    """
    Returns supplies for the vendor dashboard charts.
    """
    try:
        response = supabase.table("supplies").select("*").order("created_at", desc=True).execute()
        return {"supplies": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/kitchen")
@limiter.limit("30/minute")
async def kitchen_analytics(request: Request):
    result = get_kitchen_analytics()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/api/analytics/vendor")
@limiter.limit("30/minute")
async def vendor_analytics(request: Request):
    result = get_vendor_analytics()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

# --- FITUR 4: REKOMENDASI MENU (AI Reasoning) ---
# LIMIT: 10x per menit (Mahal pakai Claude Text)
@app.post("/api/recommend-menu")
@limiter.limit("10/minute")
async def recommend_menu(request: Request, request_data: MenuRequest):
    # Logicnya udah dipindah ke services, main.py tinggal panggil doang
    from fastapi.concurrency import run_in_threadpool
    result = await run_in_threadpool(generate_menu_recommendation, request_data.ingredients)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

# -- FITUR 5: CARI SUPPLIER (DB Search) ---
# LIMIT: 60x per menit
@app.get("/api/suppliers/search")
@limiter.limit("60/minute")
async def find_suppliers(request: Request, q: str, lat: float = -6.175392, long: float = 106.827153):
    results = search_suppliers(q, lat, long)
    
    if isinstance(results, dict) and "error" in results:
        raise HTTPException(status_code=500, detail=results["error"])
        
    return {
        "status": "success",
        "count": len(results),
        "data": results
    }

# -- FITUR 6: SPPG Bikin Pesanan ---
@app.post("/api/orders")
@limiter.limit("20/minute")
async def create_order(request: Request, order: OrderRequest):
    try:
        data = {
            "supply_id": order.supply_id,
            "qty_ordered": order.qty_ordered,
            "buyer_name": order.buyer_name,
            "status": "pending"
        }
        response = supabase.table("orders").insert(data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- FITUR 7: UMKM Lihat Pesanan Masuk ---
@app.get("/api/orders/umkm")
@limiter.limit("60/minute")
async def get_incoming_orders(request: Request):
    try:
        response = supabase.table("orders").select("*, supplies(*)").order("created_at", desc=True).execute()
        return {"orders": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- FITUR 8: UMKM Update Status ---
@app.put("/api/orders/{order_id}")
async def update_order_status(order_id: int, update: OrderStatusUpdate):
    # Tidak perlu rate limit ketat di sini
    try:
        response = supabase.table("orders").update({"status": update.status}).eq("id", order_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 10: DAPUR PRODUKSI (COOKING) ---
# LIMIT: 10x per menit (Karena memanggil AI untuk hitung expiry/nutrisi)
@app.post("/api/kitchen/cook")
@limiter.limit("10/minute")
async def cook_meal_endpoint(request: Request, req_data: CookRequest):
    """
    Kurangi stok & Catat Produksi dengan Analisis Safety Lengkap
    """
    try:
        result = cook_meal(req_data.menu_name, req_data.qty_produced, req_data.ingredients_ids)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
             
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/kitchen/meals/{meal_id}/serve")
@limiter.limit("30/minute")
async def serve_meal_endpoint(request: Request, meal_id: int):
    """
    Tandai masakan sebagai 'Telah Disajikan'.
    """
    try:
        result = mark_meal_as_served(meal_id)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
             
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/kitchen/meals")
@limiter.limit("30/minute")
async def get_cooked_meals(request: Request):
    """
    Ambil riwayat masakan yang sudah diproduksi (untuk monitoring expiry).
    """
    try:
        response = supabase.table("meal_productions").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 11: MEAL SCANNER (VISION QC) ---
# LIMIT: 5x per menit (Vision API)
@app.post("/api/kitchen/scan-meal")
@limiter.limit("10/minute")
async def scan_meal(request: Request, file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = analyze_cooked_meal(image_bytes)
    return result

# --- FITUR 12: IOT SMART STORAGE ---
# LIMIT: 120x per menit (2 request per detik, cukup untuk 1 alat simulasi)
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
        print(f"❌ Error IoT Log: {e}")
        return {"status": "error", "detail": str(e)}

@app.get("/api/iot/logs")
@limiter.limit("60/minute")
async def get_iot_logs(request: Request):
    try:
        response = supabase.table("storage_logs")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# TRIGGER NOTIFIKASI
@app.post("/api/notifications/trigger")
@limiter.limit("15/minute")
def trigger_expiry_notifications(request: Request):
    """
    Trigger manual cek kadaluarsa & generate notifikasi WhatsApp.
    """
    try:
        return check_expiry_and_notify()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# --- FITUR 13: CARI SPPG TERDEKAT (UMKM) ---
@app.get("/api/sppg/search")
@limiter.limit("60/minute")
async def find_nearest_sppg(request: Request, lat: float, long: float):
    try:
        results = search_nearest_sppg(lat, long)
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/kitchen/scan-food")
@limiter.limit("15/minute")
async def scan_food(request: Request, file: UploadFile = File(...)):
    """
    Endpoint untuk scan bahan makanan mentah di kitchen (QC Incoming).
    """
    try:
        image_bytes = await file.read()
        from fastapi.concurrency import run_in_threadpool
        result = await run_in_threadpool(analyze_cooked_meal, image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))