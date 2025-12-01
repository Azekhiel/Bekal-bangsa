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
from models import SupplyItem, MenuRequest
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

# --- FITUR 1: ANALISIS GAMBAR (AI Vision) ---
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

# --- FITUR BARU: UPLOAD FOTO ---
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