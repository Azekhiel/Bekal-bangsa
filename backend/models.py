from pydantic import BaseModel
from typing import Optional, List

# --- 1. MODEL DATA BARANG (SUPPLY) ---
class SupplyItem(BaseModel):
    # Field Wajib (dari AI)
    name: str           # Contoh: "Bawang Merah"
    qty: int            # Contoh: 5
    unit: str           # Contoh: "Pcs"
    freshness: str      # Contoh: "Sangat Segar"
    expiry_days: int    # Contoh: 14
    
    # Field Optional (Default Value)
    note: Optional[str] = None      # Alasan AI
    owner_name: str = "Pedagang Pasar"  
    location: str = "Pasar Tradisional" 
    
    # Field Lokasi (GPS)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Field Tambahan (Update Produksi)
    photo_url: Optional[str] = None     # Link Foto Bukti
    expiry_date: Optional[str] = None   # Tanggal Pasti (YYYY-MM-DD)

# --- 2. MODEL REQUEST MENU (DEMAND) ---
class MenuRequest(BaseModel):
    ingredients: List[str] # Contoh: ["Bayam", "Tahu"]

# --- 3. MODEL TRANSAKSI (ORDER) ---
class OrderRequest(BaseModel):
    supply_id: int
    qty_ordered: int
    buyer_name: str = "SPPG Jakarta Pusat"

class OrderStatusUpdate(BaseModel):
    status: str # 'confirmed' atau 'completed'

class CookRequest(BaseModel):
    menu_name: str
    qty_produced: int
    ingredients_ids: List[int] # ID barang di gudang yang dipakai
    
class MealAnalysisRequest(BaseModel):
    # Buat foto makanan jadi (Vision)
    pass # Kita pake UploadFile langsung di main.py

# --- 4. MODEL IOT (SMART STORAGE) ---
class IoTLogRequest(BaseModel):
    temperature: float
    humidity: float
    device_id: str = "SENSOR-01"
