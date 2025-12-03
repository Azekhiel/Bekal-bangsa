import json
from datetime import datetime, timedelta
from .clients import kolosal_client, supabase
from .logistics import haversine_distance
from prompts import (
    get_menu_recommendation_prompt,
    get_meal_expiry_prompt
)

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
        
        # Robust JSON Extraction
        import re
        json_match = re.search(r'\{.*\}|\[.*\]', content, re.DOTALL)
        if json_match:
            cleaned_content = json_match.group(0)
            return json.loads(cleaned_content)
        else:
            # Fallback if no JSON found
            return {"error": "AI did not return valid JSON", "raw": content}
        
    except Exception as e:
        print(f"❌ Error Menu AI: {e}")
        return {"error": f"Gagal membuat menu: {str(e)}"}

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

def mark_meal_as_served(meal_id: int):
    """
    Tandai masakan sebagai 'served' (Telah Disajikan).
    Status ini menghentikan monitoring expiry.
    """
    print(f"🍽️ Marking meal {meal_id} as served...")
    try:
        response = supabase.table("meal_productions").update({"status": "served"}).eq("id", meal_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        print(f"❌ Gagal update status served: {e}")
        return {"error": str(e)}

# backend/services/kitchen.py

def chat_with_chef(user_message: str, user_id: int):
    """
    Chatbot Koki Pintar (Logistik Edition).
    Konteks:
    1. Stok Dapur (Barang yang sudah dibeli/completed orders).
    2. Stok Pasar (Barang vendor + Jarak).
    """
    try:
        # --- LANGKAH 1: AMBIL DATA LOKASI KITCHEN ---
        user_res = supabase.table("users").select("latitude, longitude").eq("id", user_id).single().execute()
        kitchen_loc = user_res.data
        k_lat = kitchen_loc.get('latitude', -6.175392)
        k_long = kitchen_loc.get('longitude', 106.827153)

        # --- LANGKAH 2: AMBIL 'MY STOCK' (APA YG KITA PUNYA) ---
        # Asumsi: Barang milik kitchen adalah barang dari orders yang statusnya 'completed'
        my_stock_res = supabase.table("orders")\
            .select("qty_ordered, supplies(item_name, unit, quality_status)")\
            .eq("buyer_id", user_id)\
            .eq("status", "completed")\
            .execute()
        
        my_stock_list = []
        if my_stock_res.data:
            for o in my_stock_res.data:
                if o.get('supplies'):
                    item = o['supplies']
                    my_stock_list.append(f"- {item['item_name']}: {o['qty_ordered']} {item['unit']} (Kualitas: {item['quality_status']})")
        
        my_stock_text = "\n".join(my_stock_list) if my_stock_list else "- Tidak ada stok (Gudang Kosong)"

        # --- LANGKAH 3: AMBIL 'MARKET STOCK' (APA YG BISA DIBELI) ---
        # Ambil semua supply dari vendor
        market_res = supabase.table("supplies").select("*").execute()
        market_list = []
        
        if market_res.data:
            for item in market_res.data:
                # Hitung Jarak
                dist = 0
                if item.get('latitude') and item.get('longitude'):
                    dist = haversine_distance(k_lat, k_long, item['latitude'], item['longitude'])
                
                # Format: "Bawang Merah (Pak Asep - 2.5km)"
                market_list.append(f"- {item['item_name']}: Tersedia di {item['owner_name']} (Jarak: {dist:.1f} km)")

        market_text = "\n".join(market_list) if market_list else "- Pasar sedang kosong"

        # --- LANGKAH 4: RAKIT SYSTEM PROMPT ---
        system_prompt = f"""
        Kamu adalah "Chef Bekal", asisten dapur AI yang ahli manajemen logistik.
        
        DATA INVENTARIS DAPUR SAYA (Gunakan ini dulu):
        {my_stock_text}
        
        DATA PASAR & VENDOR TERDEKAT (Gunakan ini jika stok dapur kurang):
        {market_text}
        
        TUGAS KAMU:
        1. Saat user minta resep, PERTAMA-TAMA: List dulu bahan apa saja yang SUDAH ADA di dapur saya beserta kualitasnya.
        2. KEDUA: Jika ada bahan yang kurang, cari di DATA PASAR.
           - Jika ada vendor yg jual: Tulis "Bisa beli [Nama Barang] di [Nama Vendor] (Jaraknya [X] km)".
           - Prioritaskan vendor dengan jarak TERDEKAT.
           - Jika tidak ada di pasar: Tulis "Barang ini sedang tidak tersedia di vendor mitra".
        3. KETIGA: Berikan resep masakan lengkapnya.
        
        Gaya bahasa: Ramah, profesional, dan sangat membantu secara operasional.
        """

        # --- LANGKAH 5: KIRIM KE CLAUDE ---
        response = kolosal_client.chat.completions.create(
            model="Claude Sonnet 4.5",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=1500
        )
        
        ai_reply = response.choices[0].message.content
        return {"reply": ai_reply}

    except Exception as e:
        print(f"Chat Error: {e}")
        return {"error": "Maaf, Chef sedang mengecek gudang. Coba lagi nanti."}