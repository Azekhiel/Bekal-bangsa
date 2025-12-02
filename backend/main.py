from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services import (
    analyze_market_inventory, 
    generate_menu_recommendation, 
    search_suppliers, 
    calculate_expiry_date, 
    upload_image_to_supabase,
    kolosal_client,
    calculate_meal_expiry,
    check_expiry_and_notify,
    cook_meal,
    analyze_cooked_meal,
    search_nearest_sppg
)
from database import supabase
from models import SupplyItem, MenuRequest, OrderRequest, OrderStatusUpdate, CookRequest, MealAnalysisRequest, IoTLogRequest
from typing import List
from datetime import datetime, timedelta

app = FastAPI()

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
@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    1. Terima Gambar
    2. Kirim ke Claude Sonnet
    3. Balikin JSON (Belum disimpan ke DB, cuma preview)
    """
    try:
        image_bytes = await file.read()
        result = analyze_market_inventory(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
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
# Update: Menerima List[SupplyItem] biar bisa simpan 5 bawang & 8 telur sekaligus
@app.post("/api/supplies")
async def create_supplies(items: List[SupplyItem]):
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
@app.get("/api/supplies")
async def get_supplies(skip: int = 0, limit: int = 100):
    """
    Buat Dashboard Admin SPPG: Ambil semua stok yg tersedia
    Default limit 100 item biar gak berat.
    """
    try:
        # Pagination: Range di Supabase itu inclusive (0-99 = 100 items)
        response = supabase.table("supplies").select("*")\
            .order("created_at", desc=True)\
            .range(skip, skip + limit - 1)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 4: REKOMENDASI MENU (AI Reasoning) ---
@app.post("/api/recommend-menu")
async def recommend_menu(request: MenuRequest):
    # Logicnya udah dipindah ke services, main.py tinggal panggil doang
    result = generate_menu_recommendation(request.ingredients)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

# -- FITUR 5: CARI SUPPLIER (DB Search) ---
@app.get("/api/suppliers/search")
async def find_suppliers(q: str, lat: float = -6.175392, long: float = 106.827153):
    """
    Contoh: /api/suppliers/search?q=Bawang&lat=-6.2&long=106.8
    """
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
async def create_order(order: OrderRequest):
    try:
        # Simpan ke tabel orders
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

# -- FITUR 7: UMKM Lihat Pesanan Masuk (Ambil detail barangnya juga) ---
@app.get("/api/orders/umkm")
async def get_incoming_orders():
    try:
        # Join tabel orders dengan supplies biar tau nama barangnya apa
        # Syntax Supabase: select(*, supplies(*))
        response = supabase.table("orders").select("*, supplies(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- FITUR 8: UMKM Update Status (Terima Pesanan) ---
@app.put("/api/orders/{order_id}")
async def update_order_status(order_id: int, update: OrderStatusUpdate):
    try:
        response = supabase.table("orders").update({"status": update.status}).eq("id", order_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 10: DAPUR PRODUKSI (COOKING) ---
@app.post("/api/kitchen/cook")
async def cook_meal_endpoint(request: CookRequest):
    """
    Kurangi stok & Catat Produksi dengan Analisis Safety Lengkap
    """
    try:
        # Panggil logic di services.py
        result = cook_meal(request.menu_name, request.qty_produced, request.ingredients_ids)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
             
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- FITUR 11: MEAL SCANNER (VISION QC) ---
@app.post("/api/kitchen/scan-meal")
async def scan_meal(file: UploadFile = File(...)):
    image_bytes = await file.read()
    # Panggil fungsi baru di services.py
    result = analyze_cooked_meal(image_bytes)
    return result

# --- FITUR 12: IOT SMART STORAGE ---
@app.post("/api/iot/log")
async def log_iot_data(data: IoTLogRequest):
    """
    Menerima data sensor dari IoT Simulator
    """
    try:
        payload = {
            "temperature": data.temperature,
            "humidity": data.humidity,
            "device_id": data.device_id
        }
        # Simpan ke tabel 'storage_logs'
        # Note: Pastikan tabel ini sudah dibuat di Supabase!
        response = supabase.table("storage_logs").insert(payload).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        print(f"❌ Error IoT Log: {e}")
        # Return success biar simulator gak crash, tapi log error di server
        return {"status": "error", "detail": str(e)}

@app.get("/api/iot/logs")
async def get_iot_logs():
    """
    Ambil data history suhu & kelembaban untuk grafik Dashboard
    """
    try:
        # Ambil 50 data terakhir
        response = supabase.table("storage_logs")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/trigger")
def trigger_expiry_notifications():
    """
    Trigger manual cek kadaluarsa & generate notifikasi WhatsApp (Simulasi).
    """
    try:
        return check_expiry_and_notify()
    except Exception as e:
        import traceback
        traceback.print_exc() # Print ke terminal backend
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# --- FITUR 13: CARI SPPG TERDEKAT (UMKM) ---
@app.get("/api/sppg/search")
async def find_nearest_sppg(lat: float, long: float):
    """
    Cari SPPG (Kitchen Hub) terdekat untuk drop-off bahan makanan.
    """
    try:
        results = search_nearest_sppg(lat, long)
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))