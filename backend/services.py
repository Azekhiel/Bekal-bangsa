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
    Sertakan juga step by step langkah memasaknya
    Syarat: Murah, Bergizi, Praktis, Lokal.
    
    Output JSON:
    {{
        "menu_name": "Nama Masakan",
        "description": "Deskripsi singkat menggugah selera dan langkah memasaknya",
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

        return {"error": "Gagal mencari data"}

import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Hitung jarak antara dua titik koordinat (km)
    """
    R = 6371  # Radius bumi dalam km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) * math.sin(dlat / 2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dlon / 2) * math.sin(dlon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def search_suppliers(keyword: str, user_lat: float = -6.175392, user_long: float = 106.827153):
    """
    Cari supplier dan urutkan berdasarkan JARAK TERDEKAT.
    Default User Location: Monas (Jakarta Pusat).
    """
    print(f"🔍 Mencari supplier '{keyword}' dekat {user_lat}, {user_long}")
    
    try:
        # 1. Ambil data dari DB (Filter nama dulu)
        response = supabase.table("supplies")\
            .select("*")\
            .ilike("item_name", f"%{keyword}%")\
            .execute()
            
        items = response.data
        
        # 2. Inject Dummy Location & Hitung Jarak
        # (Karena data DB belum ada lat/long beneran, kita simulasi di sini biar demo lancar)
        import random
        
        results_with_distance = []
        for item in items:
            # 1. Coba ambil Real GPS dari Database
            item_lat = item.get('latitude')
            item_long = item.get('longitude')
            
            # 2. Fallback ke Simulasi jika data GPS kosong (None)
            if item_lat is None or item_long is None:
                # Simulasi koordinat random sekitar Jakarta (± 0.05 derajat)
                item_lat = -6.175392 + random.uniform(-0.05, 0.05)
                item_long = 106.827153 + random.uniform(-0.05, 0.05)
            
            dist = haversine_distance(user_lat, user_long, item_lat, item_long)
            
            # Tambahkan info jarak ke item
            item['distance_km'] = round(dist, 1)
            item['location_lat'] = item_lat
            item['location_long'] = item_long
            
            results_with_distance.append(item)
            
        # 3. Urutkan berdasarkan jarak terdekat (Ascending)
        results_with_distance.sort(key=lambda x: x['distance_km'])
        
        return results_with_distance
        
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

def analyze_cooked_meal(image_bytes):
    """
    VISI KOMPUTER UNTUK MAKANAN JADI (QC FINAL)
    Cek basi/tidak, estimasi gizi visual.
    """
    print("🍱 Menganalisis Makanan Jadi...")
    base64_image = encode_image_to_base64(image_bytes)
    
    prompt_text = """
    Kamu adalah Ahli Keamanan Pangan & Gizi.
    Analisis foto makanan matang (Lunch Box/Piring) ini.
    
    Tugas:
    1. Deteksi menu apa ini.
    2. SAFETY CHECK: Apakah terlihat basi? (Lendir, warna aneh, jamur).
    3. NUTRITION: Estimasi kalori & nutrisi makro sepiring ini.
    
    Output JSON:
    {
        "menu_name": "...",
        "is_safe": true/false,
        "spoilage_signs": ["...", "..."] (jika ada),
        "nutrition_estimate": {
            "calories": "...",
            "protein": "...",
            "carbs": "..."
        },
        "visual_quality": "Sangat Menggugah Selera / Mencurigakan"
    }
    """
    
    # ... (Copy logic request ke Claude dari fungsi analyze_market_inventory, ganti prompt-nya) ...
    # (Biar ringkas, gunakan pola yang sama: kolosal_client.chat.completions.create...)
    # Return JSON hasil parsing.
    # ...
    
    # --- CONTOH IMPLEMENTASI CEPAT (COPAS BAGIAN REQUEST CLAUDE DI BAWAH INI) ---
    try:
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            max_tokens=600
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}

def calculate_meal_expiry(menu_name: str) -> dict:
    """
    Tanya Claude: Analisis umur simpan & Tips penyimpanan.
    Output: Dictionary lengkap (bukan cuma int).
    """
    print(f"🕒 Analisis Safety Food untuk: {menu_name}")
    
    prompt = f"""
    Kamu adalah Ahli Keamanan Pangan & Higiene Sanitasi.
    
    Tugas: Analisis keamanan pangan untuk menu masakan matang: "{menu_name}".
    Berikan estimasi umur simpan (Shelf Life) dalam DUA kondisi dan tips agar awet.
    
    Output HANYA JSON raw (tanpa markdown):
    {{
        "room_temp_hours": (integer, estimasi tahan berapa jam di suhu ruang/kelas),
        "fridge_hours": (integer, estimasi tahan berapa jam jika masuk kulkas/chiller),
        "risk_factor": "Rendah/Sedang/Tinggi (Misal: Tinggi karena bersantan)",
        "storage_tips": "Saran singkat, padat, teknis (Misal: 'Jangan tutup wadah saat panas', 'Pisahkan kuah dan isi')"
    }}
    """
    
    try:
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.2
        )
        
        content = response.choices[0].message.content
        cleaned_content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_content)
        
        print(f"✅ Analisis Selesai: {data.get('risk_factor')}")
        return data

    except Exception as e:
        print(f"⚠️ Gagal hitung expiry: {e}")
        # Default fallback yang aman
        return {
            "room_temp_hours": 4,
            "fridge_hours": 12,
            "risk_factor": "Unknown",
            "storage_tips": "Segera konsumsi. Simpan di tempat sejuk dan tertutup."
        }

