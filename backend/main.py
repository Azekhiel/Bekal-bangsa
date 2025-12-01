from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services import (
    analyze_market_inventory, 
    generate_menu_recommendation, 
    search_suppliers, 
    calculate_expiry_date, 
    upload_image_to_supabase,
    kolosal_client
)
from database import supabase
from models import SupplyItem, MenuRequest, OrderRequest, OrderStatusUpdate, calculate_meal_expiry, CookRequest, MealAnalysisRequest
from typing import List

app = FastAPI()

# Setup CORS (Biar Next.js di localhost:3000 bisa akses)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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
                "location": item.location
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
async def get_supplies():
    """
    Buat Dashboard Admin SPPG: Ambil semua stok yg tersedia
    """
    try:
        response = supabase.table("supplies").select("*").order("created_at", desc=True).execute()
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
async def find_suppliers(q: str):
    """
    Contoh: /api/suppliers/search?q=Bawang
    """
    results = search_suppliers(q)
    
    if isinstance(results, dict) and "error" in results:
        raise HTTPException(status_code=500, detail=results["error"])
        
    return {
        "status": "success",
        "count": len(results),
        "data": results
    }

    # --- Update di paling atas (Import) ---
from pydantic import BaseModel

# --- Tambah Model Baru ---
class OrderRequest(BaseModel):
    supply_id: int
    qty_ordered: int
    buyer_name: str = "SPPG Jakarta Pusat"

class OrderStatusUpdate(BaseModel):
    status: str # 'confirmed' atau 'completed'

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

# -- FITUR 9: TRANSAKSI (ORDER MANAGEMENT) ---
@app.post("/api/orders")
async def create_order(order: OrderRequest):
    """SPPG Membuat Pesanan Baru"""
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

@app.get("/api/orders/umkm")
async def get_incoming_orders():
    """UMKM Melihat Pesanan Masuk (Join dengan tabel supplies)"""
    try:
        # Syntax Supabase: select("*, supplies(*)") artinya join tabel supplies
        response = supabase.table("orders").select("*, supplies(*)").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/orders/{order_id}")
async def update_order_status(order_id: int, update: OrderStatusUpdate):
    """Update Status Pesanan (Terima/Kirim)"""
    try:
        response = supabase.table("orders").update({"status": update.status}).eq("id", order_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- FITUR 10: DAPUR PRODUKSI (COOKING) ---
@app.post("/api/kitchen/cook")
async def cook_meal(request: CookRequest):
    """
    Kurangi stok & Catat Produksi dengan Analisis Safety Lengkap
    """
    try:
        # 1. Deduct Stock (Anggap berhasil)
        for item_id in request.ingredients_ids:
            supabase.table("supplies").delete().eq("id", item_id).execute()
        
        # 2. Tanya AI (Panggil fungsi yang baru kita update)
        # Note: Pastikan import calculate_meal_expiry sudah ada di atas
        safety_analysis = calculate_meal_expiry(request.menu_name)
        
        # Ambil data dari hasil AI
        hours_room = safety_analysis.get("room_temp_hours", 4)
        hours_fridge = safety_analysis.get("fridge_hours", 12)
        tips_raw = safety_analysis.get("storage_tips", "Simpan dengan baik.")
        
        # Format Tips biar informatif di Database/Frontend
        # Contoh: "Jangan tutup panas. (Tahan 4 jam suhu ruang, 12 jam di kulkas)"
        formatted_tips = f"{tips_raw} (Tahan {hours_fridge} jam jika masuk kulkas)"
        
        # 3. Simpan ke meal_productions
        data = {
            "menu_name": request.menu_name,
            "qty_produced": request.qty_produced,
            # Kita set expiry date berdasarkan SUHU RUANG (Skenario Terburuk/Aman)
            "expiry_datetime": (datetime.now() + timedelta(hours=hours_room)).isoformat(),
            "status": "fresh",
            "storage_tips": formatted_tips # Simpan tips lengkap di sini
        }
        
        res = supabase.table("meal_productions").insert(data).execute()
        return {"status": "success", "data": res.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- FITUR 11: MEAL SCANNER (VISION QC) ---
@app.post("/api/kitchen/scan-meal")
async def scan_meal(file: UploadFile = File(...)):
    image_bytes = await file.read()
    # Panggil fungsi baru di services.py
    result = analyze_cooked_meal(image_bytes)
    return result

