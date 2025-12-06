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
import math
from prompts import (
    get_inventory_analysis_prompt,
    get_menu_recommendation_prompt,
    get_cooked_meal_analysis_prompt,
    get_meal_expiry_prompt
)

# Explicitly load .env from the same directory
load_dotenv(Path(__file__).parent / ".env")

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
    # 2. Prompt Claude
    prompt_text = get_inventory_analysis_prompt()

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
    prompt = get_menu_recommendation_prompt(ingredients_text)
    
    try:
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500
        )
        
        content = response.choices[0].message.content
        print(f"🤖 Raw AI Response: {content}") # Debug print
        cleaned_content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_content)
        
    except Exception as e:
        print(f"❌ Error Menu AI: {e}")
        return {"error": f"Gagal membuat menu: {str(e)}"}

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
    
    prompt_text = get_cooked_meal_analysis_prompt()
    
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
    
    prompt = get_meal_expiry_prompt(menu_name)
    
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
            "storage_tips": "Segera konsumsi. Simpan di tempat sejuk dan tertutup.",
            "nutrition": {"calories": "N/A", "protein": "N/A", "carbs": "N/A", "fats": "N/A"}
        }

def check_expiry_and_notify():
    """
    Cek barang yang mau busuk (expiry_days <= 2).
    Generate notifikasi simulasi untuk WhatsApp.
    """
    print("🔔 Checking expiry for notifications...")
    
    # 1. Ambil data yang mau busuk
    response = supabase.table("supplies").select("*").lte("expiry_days", 2).execute()
    expiring_items = response.data
    
    print(f"DEBUG: expiring_items type: {type(expiring_items)}")
    if expiring_items:
        print(f"DEBUG: First item type: {type(expiring_items[0])}")
        print(f"DEBUG: First item content: {expiring_items[0]}")
    
    if not expiring_items:
        return {"status": "no_risk", "messages": []}
        
    notifications = []
    
    # --- LOGIC 1: NOTIFIKASI KE UMKM (VENDOR) ---
    # Group by Owner
    vendor_items = {}
    for item in expiring_items:
        owner = item.get("owner_name", "Pedagang")
        if owner not in vendor_items:
            vendor_items[owner] = []
        vendor_items[owner].append(item)
        
    # Lokasi SPPG (Monas - Jakarta Pusat)
    sppg_lat = -6.175392
    sppg_long = 106.827153
    
    for owner, items in vendor_items.items():
        item_names = ", ".join([i['item_name'] for i in items])
        
        # Ambil lokasi salah satu item (asumsi pedagang di satu lokasi)
        # Kalau gak ada GPS, pake default
        v_lat = items[0].get('latitude')
        v_long = items[0].get('longitude')
        
        dist_info = ""
        if v_lat and v_long:
            dist = haversine_distance(v_lat, v_long, sppg_lat, sppg_long)
            dist_info = f"SPPG Jakarta Pusat hanya berjarak {dist:.1f} km dari Anda."
        else:
            dist_info = "Segera tawarkan ke SPPG terdekat."
            
        msg = {
            "to": owner,
            "role": "Vendor (UMKM)",
            "type": "WARNING",
            "message": f"⚠️ Halo {owner}! {item_names} Anda akan busuk dalam < 2 hari. {dist_info} Jual murah sekarang sebelum rugi!"
        }
        notifications.append(msg)
        
    # --- LOGIC 2: NOTIFIKASI KE SPPG (KITCHEN) ---
    # SPPG butuh solusi (Resep)
    all_expiring_names = [i['item_name'] for i in expiring_items]
    
    # Minta AI buatkan resep penyelamatan
    # Kita reuse fungsi generate_menu_recommendation tapi dengan konteks "Rescue"
    rescue_menu = generate_menu_recommendation(all_expiring_names)
    
    menu_name = rescue_menu.get("menu_name", "Tumis Campur")
    
    # Format pesan WhatsApp yang rapi
    ingredients_str = "\n".join([f"- {i}" for i in rescue_menu.get("ingredients_needed", [])])
    steps_str = "\n".join([f"{idx+1}. {step}" for idx, step in enumerate(rescue_menu.get("cooking_steps", []))])
    
    nut = rescue_menu.get("nutrition", {})
    nutrition_str = f"Kalori: {nut.get('calories', '-')}, Protein: {nut.get('protein', '-')}"
    
    message_body = f"""🚨 PERHATIAN: {', '.join(all_expiring_names)} di gudang pedagang hampir busuk!
    
    REKOMENDASI AI: Masak '{menu_name}' hari ini!

    🛒 Bahan:
    {ingredients_str}

    👨‍🍳 Cara Masak:
    {steps_str}

    📊 Nutrisi: {nutrition_str}
    ({rescue_menu.get('reason')})"""

    msg_sppg = {
        "to": "Admin SPPG",
        "role": "SPPG (Kitchen)",
        "type": "URGENT + RECIPE",
        "message": message_body
    }
    notifications.append(msg_sppg)
    
    return {"status": "success", "data": notifications}

def cook_meal(menu_name: str, qty_produced: int, ingredients_ids: list):
    """
    Catat produksi masakan:
    1. Kurangi stok bahan baku (deduct stock).
    2. Estimasi nutrisi menu tersebut pakai AI.
    """
    print(f"🍳 Memasak {menu_name} ({qty_produced} porsi)...")
    
    # 1. Kurangi Stok (Simulasi: Hapus item dari DB)
    # Idealnya kurangi qty, tapi untuk hackathon kita hapus row biar visual
    if ingredients_ids:
        try:
            supabase.table("supplies").delete().in_("id", ingredients_ids).execute()
            print(f"✅ Bahan baku {ingredients_ids} telah digunakan.")
        except Exception as e:
            print(f"❌ Gagal update stok: {e}")
            return {"error": "Gagal update stok"}
            
    # 2. Estimasi Nutrisi & Safety pakai AI (Reuse calculate_meal_expiry)
    # Ini lebih efisien karena satu kali panggil dapet expiry + nutrition
    analysis_result = calculate_meal_expiry(menu_name)
    
    # Ambil data nutrisi dari hasil analisis
    nutrition_data = analysis_result.get("nutrition", {"calories": "N/A", "protein": "N/A"})

    # 3. Simpan ke meal_productions
    hours_room = analysis_result.get("room_temp_hours", 4)
    hours_fridge = analysis_result.get("fridge_hours", 12)
    tips_raw = analysis_result.get("storage_tips", "Simpan dengan baik.")
    formatted_tips = f"{tips_raw} (Tahan {hours_fridge} jam jika masuk kulkas)"
    
    data_production = {
        "menu_name": menu_name,
        "qty_produced": qty_produced,
        "expiry_datetime": (datetime.now() + timedelta(hours=hours_room)).isoformat(),
        "status": "fresh",
        "storage_tips": formatted_tips
    }
    
    try:
        supabase.table("meal_productions").insert(data_production).execute()
    except Exception as e:
        print(f"⚠️ Gagal simpan log produksi: {e}")

    return {
        "status": "success",
        "message": f"Berhasil memproduksi {qty_produced} porsi {menu_name}",
        "nutrition_estimate": nutrition_data,
        "safety_analysis": analysis_result
    }

# --- DATA SPPG (HARDCODED NETWORK) ---
SPPG_LOCATIONS = [
    {"id": 1, "name": "SPPG Jakarta Pusat (Monas)", "address": "Jl. Medan Merdeka Barat, Gambir", "lat": -6.175392, "long": 106.827153, "phone": "0812-3456-7890"},
    {"id": 2, "name": "SPPG Jakarta Selatan (Blok M)", "address": "Jl. Melawai Raya, Kebayoran Baru", "lat": -6.244223, "long": 106.801782, "phone": "0812-9876-5432"},
    {"id": 3, "name": "SPPG Jakarta Barat (Grogol)", "address": "Jl. Kyai Tapa, Grogol Petamburan", "lat": -6.167570, "long": 106.790960, "phone": "0812-1122-3344"},
    {"id": 4, "name": "SPPG Jakarta Timur (Jatinegara)", "address": "Jl. Matraman Raya, Jatinegara", "lat": -6.215116, "long": 106.870434, "phone": "0812-5566-7788"},
    {"id": 5, "name": "SPPG Jakarta Utara (Kelapa Gading)", "address": "Jl. Boulevard Raya, Kelapa Gading", "lat": -6.162331, "long": 106.900220, "phone": "0812-9988-7766"}
]

def search_nearest_sppg(user_lat: float, user_long: float):
    """
    Cari SPPG terdekat dari lokasi user (Vendor).
    """
    results = []
    for sppg in SPPG_LOCATIONS:
        dist = haversine_distance(user_lat, user_long, sppg['lat'], sppg['long'])
        sppg_copy = sppg.copy()
        sppg_copy['distance_km'] = round(dist, 2)
        results.append(sppg_copy)
    
    # Urutkan dari yang terdekat
    results.sort(key=lambda x: x['distance_km'])
    return results
