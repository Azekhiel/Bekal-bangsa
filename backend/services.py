from database import supabase
import os
import json
import base64
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from datetime import datetime, timedelta
from fastapi import UploadFile
import time

# Explicitly load .env from the same directory
load_dotenv(Path(__file__).parent / ".env")

# Tentukan lokasi folder prompts
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# --- SETUP CLIENTS ---
kolosal_client = OpenAI(
    api_key=os.getenv("KOLOSAL_API_KEY"),
    base_url=os.getenv("KOLOSAL_BASE_URL")
)

def encode_image_to_base64(image_bytes):
    """Helper buat ubah bytes gambar jadi string base64"""
    return base64.b64encode(image_bytes).decode('utf-8')

def analyze_market_inventory(image_bytes):
    """
    Claude untuk Deteksi Jenis, Hitung Jumlah, Cek Kualitas.
    """
    
    print("✨ Mengirim gambar ke Claude Sonnet 4.5 (All-in-One Analysis)...")
    
    # 1. Siapkan Gambar
    base64_image = encode_image_to_base64(image_bytes)

    # 2. Prompt Claude
    prompt_text = """
    Kamu adalah AI Inventory Cerdas untuk pedagang pasar tradisional Indonesia.
    Tugasmu adalah melihat gambar stok dagangan dan mengekstrak data logistik.

    Lakukan langkah berpikir ini:
    1. IDENTIFIKASI: Barang apa ini? (Gunakan nama lokal Indonesia, misal: Bawang Merah, Cabe Rawit).
    2. HITUNG (COUNTING): 
       - Hitung jumlah objek yang terlihat dengan teliti.
       - Jika barangnya satuan (seperti Bawang, Telur, Buah), hitung per butir/pcs.
       - Jika barangnya dalam wadah (seperti Beras dalam karung), hitung wadahnya.
       - Jika bertumpuk sangat banyak (seperti cabe sekilo), berikan estimasi "1" dengan satuan "Tumpukan/Kg".
    3. QUALITY CHECK: Lihat warna, tekstur, dan kulit. Apakah segar? Ada busuk?
    4. EXPIRY PREDICTION: Estimasi sisa hari layak konsumsi di suhu ruang.

    Output HANYA JSON raw (tanpa markdown ```json):
    {
        "items": [
            {
                "name": "Nama Barang",
                "qty": (integer),
                "unit": "Pcs/Ikat/Karung/Kg",
                "freshness": "Sangat Segar/Cukup/Layum/Busuk",
                "expiry_days": (integer sisa hari),
                "visual_reasoning": "Penjelasan singkat kenapa dinilai segitu"
            }
        ]
    }
    """

    try:
        # 3. Panggil API Colossal
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5", # Pastikan nama model sesuai instruksi Colossal
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.1 # Penting! Rendah biar dia teliti ngitung (gak kreatif/halu)
        )
        
        # 4. Parsing Hasil
        content = response.choices[0].message.content
        print(f"🤖 Claude Raw Response: {content[:100]}...") # Debug dikit

        # Bersihin markdown kalau ada
        cleaned_content = content.replace("```json", "").replace("```", "").strip()
        parsed_data = json.loads(cleaned_content)
        
        # 5. Format Return
        final_data = []
        for item in parsed_data.get("items", []):
            final_data.append({
                "name": item.get("name"),
                "qty": item.get("qty"),
                "unit": item.get("unit"),
                "freshness": item.get("freshness"),
                "expiry": item.get("expiry_days"),
                "note": item.get("visual_reasoning") # Bonus: alesan AI-nya
            })
            
        return {"status": "success", "data": final_data}

    except json.JSONDecodeError:
        print("❌ Error: Claude tidak mengembalikan JSON valid.")
        return {"error": "AI Error (Invalid JSON)"}
    except Exception as e:
        print(f"❌ Error API: {e}")
        return {"error": f"Gagal analisis: {str(e)}"}

def generate_menu_recommendation(ingredients_list):
    """
    Fungsi untuk minta ide menu ke Claude berdasarkan stok
    """
    print(f"👨‍🍳 Mengirim request menu ke Claude untuk: {ingredients_list}")
    
    ingredients_text = ", ".join(ingredients_list)
    
    # Prompt Menu
    prompt = f"""
    Saya punya stok bahan berikut di gudang: {ingredients_text}.
    
    Buatkan 1 Rekomendasi Menu Makan Siang Bergizi Gratis (MBG) untuk anak sekolah.
    Syarat: Murah, Bergizi, Praktis, Lokal.
    
    Output JSON:
    {{
        "menu_name": "Nama Masakan",
        "description": "Deskripsi singkat menggugah selera",
        "nutrition": "Estimasi Kalori & Protein",
        "reason": "Kenapa menu ini cocok dengan bahan yg ada",
        "ingredients_used": ["Bahan A", "Bahan B"]
    }}
    """
    
    try:
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600
        )
        
        content = response.choices[0].message.content
        cleaned_content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_content)
        
    except Exception as e:
        print(f"❌ Error Menu AI: {e}")
        return {"error": "Gagal membuat menu"}

def search_suppliers(keyword: str):
    """
    Cari supplier berdasarkan nama barang.
    Menggunakan filter 'ilike' (mirip SQL LIKE %keyword%).
    """
    print(f"🔍 Mencari supplier untuk: {keyword}")
    
    try:
        # Cari di kolom 'item_name' yang mengandung keyword
        # Order by 'expiry_days' ascending (Prioritaskan barang yg harus segera laku/expired duluan biar ga mubazir)
        # Atau order by 'quantity' desc (Cari yg stoknya banyak)
        
        response = supabase.table("supplies")\
            .select("*")\
            .ilike("item_name", f"%{keyword}%")\
            .order("expiry_days", desc=False)\
            .execute()
            
        return response.data
        
    except Exception as e:
        print(f"❌ Error DB Search: {e}")
        return {"error": "Gagal mencari data"}

def calculate_expiry_date(days: int) -> str:
    """
    Menghitung tanggal kadaluarsa berdasarkan jumlah hari dari sekarang.
    Output: YYYY-MM-DD
    """
    expiry_date = datetime.now() + timedelta(days=days)
    return expiry_date.strftime("%Y-%m-%d")

async def upload_image_to_supabase(file: UploadFile) -> str:
    """
    Upload file gambar ke Supabase Storage dan kembalikan URL publiknya.
    """
    try:
        # 1. Baca file bytes
        file_bytes = await file.read()
        
        # 2. Generate nama file unik (timestamp_filename)
        timestamp = int(time.time())
        filename = f"{timestamp}_{file.filename}"
        
        # 3. Upload ke Supabase Storage (Bucket: 'supply-photos')
        # Pastikan bucket 'supply-photos' sudah dibuat di Supabase Dashboard!
        bucket_name = "supply-photos"
        
        response = supabase.storage.from_(bucket_name).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        # 4. Ambil Public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return public_url
        
    except Exception as e:
        print(f"❌ Error Upload Supabase: {e}")
        # Jangan raise error biar flow gak putus, tapi return None atau string kosong
        # Nanti di main.py bisa dicek
        return None