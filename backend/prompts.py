def get_inventory_analysis_prompt():
    return """
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

def get_menu_recommendation_prompt(ingredients_text):
    return f"""
    Saya punya stok bahan berikut di gudang: {ingredients_text}.
    
    Buatkan 1 Rekomendasi Menu Makan Siang Bergizi Gratis (MBG) untuk anak sekolah.
    Sertakan juga step by step langkah memasaknya
    Syarat: Murah, Bergizi, Praktis, Lokal.
    
    Output JSON:
    {{
        "menu_name": "Nama Masakan",
        "description": "Deskripsi singkat menggugah selera",
        "ingredients_needed": [
            "Bahan A (Qty)", 
            "Bahan B (Qty)"
        ],
        "cooking_steps": [
            "Langkah 1...",
            "Langkah 2..."
        ],
        "nutrition": {{
            "calories": "Estimasi Kalori (misal: 500 kcal)",
            "protein": "Estimasi Protein (misal: 20g)",
            "carbs": "Estimasi Karbohidrat",
            "fats": "Estimasi Lemak",
            "vitamins": "Vitamin utama (misal: Vit C, Vit A)"
        }},
        "reason": "Kenapa menu ini cocok dengan bahan yg ada",
        "ingredients_used": ["Bahan A", "Bahan B"]
    }}
    """

def get_cooked_meal_analysis_prompt():
    return """
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

def get_meal_expiry_prompt(menu_name):
    return f"""
    Kamu adalah Ahli Keamanan Pangan & Higiene Sanitasi.
    
    Tugas: Analisis keamanan pangan untuk menu masakan matang: "{menu_name}".
    Berikan estimasi umur simpan (Shelf Life) dalam DUA kondisi, tips penyimpanan, DAN estimasi nutrisi per porsi.
    
    Output HANYA JSON raw (tanpa markdown):
    {{
        "room_temp_hours": (integer, estimasi tahan berapa jam di suhu ruang/kelas),
        "fridge_hours": (integer, estimasi tahan berapa jam jika masuk kulkas/chiller),
        "risk_factor": "Rendah/Sedang/Tinggi (Misal: Tinggi karena bersantan)",
        "storage_tips": "Saran singkat, padat, teknis (Misal: 'Jangan tutup wadah saat panas', 'Pisahkan kuah dan isi')",
        "nutrition": {{
            "calories": "Estimasi Kalori (misal: 500 kcal)",
            "protein": "Estimasi Protein (misal: 20g)",
            "carbs": "Estimasi Karbohidrat",
            "fats": "Estimasi Lemak"
        }}
    }}
    """

