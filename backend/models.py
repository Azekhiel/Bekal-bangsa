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