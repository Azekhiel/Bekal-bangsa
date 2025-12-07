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
    Kamu adalah Ahli Gizi dan Koki untuk program Makan Bergizi Gratis (MBG).
    STOK BAHAN TERSEDIA di gudang: {ingredients_text}.

    Tugasmu:
    1. Rancang Menu Makan Siang **Terbaik** untuk anak sekolah, berdasarkan bahan yang tersedia (meskipun menu hanya terdiri dari satu komponen, itu tidak masalah).
    2. Sesuaikan hidangan berdasarkan bahan, jangan memaksakan bahan untuk membuat hidangan yang aneh. Hidangan bisa berupa makanan gurih/asin, bisa manis/dessert, bisa kudapan, bisa minuman.
    contoh: bahan hanya semangka, maka menu adalah jus semangka bukan nasi goreng semangka
    3. Kepatuhan: Menu harus memenuhi syarat **Murah, Bergizi, Praktis, dan Lokal**.

    Output HANYA dalam format JSON raw (tanpa markdown ```json):
    {{
        "recommendations": [
            {{
                "menu_name": "Nama Menu Final (Contoh: Potongan Semangka Saja)",
                "description": "Deskripsi singkat tentang menu ini.",
                "ingredients": ["List bahan yang digunakan dari stok", "termasuk buah/penutup"],
                "ingredients_needed": [
                    "Sebutkan BAHAN dan KUANTITAS spesifik (Contoh: Ayam 5 kg)",
                    "Contoh: Beras 10 kg"
                ],
                "cooking_steps": [
                    "Langkah 1: Siapkan...",
                    "Langkah 2: Proses memasak...",
                    "Langkah 3: Sajikan..."
                ],
                "nutrition": {{
                    "calories": "Estimasi Kalori (misal: 500 kcal)",
                    "protein": "Estimasi Protein (misal: 20g)",
                    "carbs": "Estimasi Karbohidrat",
                    "fats": "Estimasi Lemak"
                }},
                "reason": "Jelaskan kenapa menu ini cocok."
            }}
        ]
    }}
    """
    
def get_cooked_meal_analysis_prompt():
    return """
    Kamu adalah Ahli Keamanan Pangan & Gizi.
    Analisis foto makanan matang (Lunch Box/Piring) ini.
    
    Tugas:
    1. Deteksi menu apa ini.
    2. SAFETY CHECK: Apakah terlihat basi? (Lendir, warna aneh, jamur, bau).
    3. NUTRITION: Estimasi kalori & nutrisi makro sepiring ini.
    
    PENTING: 
    - ANALISIS GAMBAR YANG DIBERIKAN, jangan asal copy contoh
    - is_safe: true jika makanan AMAN, false jika ADA TANDA-TANDA PEMBUSUKAN, MENTAH/TIDAK MATANG, ATAU TIDAK LAYAK KONSUMSI
    - spoilage_signs: isi dengan tanda pembusukan atau tidak layak konsumsi  yang terlihat (jika ada), kosongkan [] jika aman
    - Nilai nutrition_estimate harus ANGKA saja (contoh: "650", bukan "650-750 kkal")
    - Gunakan key "fats" bukan "fat"
    - JANGAN tambahkan field seperti "fiber", "detail_analysis", dll
    
    Output HANYA JSON dengan format ini:
    {
        "menu_name": "Nama menu berdasarkan analisis gambar",
        "is_safe": true atau false (ANALISIS GAMBAR!),
        "spoilage_signs": ["tanda1", "tanda2"] atau [] jika aman,
        "nutrition_estimate": {
            "calories": "estimasi angka",
            "protein": "estimasi angka",
            "carbs": "estimasi angka",
            "fats": "estimasi angka"
        },
        "visual_quality": "Deskripsi kualitas visual"
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

