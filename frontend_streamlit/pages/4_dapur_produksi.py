import streamlit as st
import requests
from datetime import datetime, timedelta
import pandas as pd

API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Dapur Produksi", page_icon="🍳", layout="wide")
st.title("🍳 Dapur & Quality Control")

tab1, tab2, tab3 = st.tabs(["🔥 Mulai Masak", "🍱 Scan Makanan Jadi (QC)", "⏱️ Monitor Expired"])

# --- TAB 1: MASAK (PENGURANGAN STOK) ---
with tab1:
    st.subheader("Catat Produksi Masakan")
    
    # Ambil stok gudang
    try:
        stok = requests.get(f"{API_URL}/supplies").json()
        if stok:
            df = pd.DataFrame(stok)
            # Multiselect bahan yg mau dipake
            bahan_terpilih = st.multiselect(
                "Pilih Bahan yang Dimasak (Akan dihapus dari gudang):", 
                options=df['id'].tolist(),
                format_func=lambda x: df[df['id'] == x]['item_name'].values[0]
            )
            
            menu_name = st.text_input("Nama Menu Masakan", "Nasi Kotak Ayam")
            qty = st.number_input("Jumlah Porsi", 100)
            
            if st.button("🔥 Masak Sekarang"):
                payload = {
                    "menu_name": menu_name,
                    "qty_produced": qty,
                    "ingredients_ids": bahan_terpilih
                }
                with st.spinner("Koki AI sedang memasak & menghitung gizi..."):
                    try:
                        res = requests.post(f"{API_URL}/kitchen/cook", json=payload)
                        if res.status_code == 200:
                            data = res.json()
                            st.success(f"✅ {data.get('message', 'Produksi tercatat!')}")
                            
                            # Display Nutrition
                            nut = data.get('nutrition_estimate', {})
                            if nut:
                                st.markdown("#### 📊 Estimasi Nutrisi per Porsi")
                                c1, c2, c3, c4 = st.columns(4)
                                c1.metric("Kalori", nut.get('calories', '-'))
                                c2.metric("Protein", nut.get('protein', '-'))
                                c3.metric("Karbo", nut.get('carbs', '-'))
                                c4.metric("Lemak", nut.get('fats', '-'))
                                
                            with st.expander("ℹ️ Info Keamanan Pangan"):
                                safety = data.get('safety_analysis', {})
                                st.write(f"**Tips:** {safety.get('storage_tips', '-')}")
                                st.write(f"**Tahan Suhu Ruang:** {safety.get('room_temp_hours')} jam")
                                
                        else:
                            st.error(f"Gagal mencatat produksi: {res.text}")
                    except Exception as e:
                        st.error(f"Error: {e}")
        else:
            st.info("Gudang kosong.")
    except:
        st.error("Gagal konek server.")

# --- TAB 2: MEAL SCANNER (VISION) ---
with tab2:
    st.subheader("🛡️ Quality Control Makanan Jadi")
    st.info("Scan sampel makanan sebelum dibagikan ke anak-anak.")
    
    img = st.camera_input("Foto Makanan Matang")
    if img:
        with st.spinner("AI mencicipi secara visual..."):
            files = {"file": img}
            res = requests.post(f"{API_URL}/kitchen/scan-meal", files=files)
            data = res.json()
            
            c1, c2 = st.columns(2)
            with c1:
                st.image(img, width=300)
            with c2:
                if data.get('is_safe'):
                    st.success(f"✅ AMAN DIMAKAN: {data.get('visual_quality')}")
                else:
                    st.error(f"⛔ BAHAYA / BASI: {data.get('visual_quality')}")
                
                st.write("**Estimasi Gizi:**")
                st.json(data.get('nutrition_estimate'))
                
                if data.get('spoilage_signs'):
                    st.warning(f"Tanda kerusakan: {data.get('spoilage_signs')}")

# --- TAB 3: MONITOR EXPIRED (REAL TIME) ---
with tab3:
    st.subheader("⏱️ Jadwal Basi (Expiry Countdown)")
    
    # (Disini nanti request GET ke tabel meal_productions)
    # Mockup Data biar cepet:
    now = datetime.now()
    meals = [
        {"menu": "Nasi Ayam (Batch 1)", "exp": now + timedelta(hours=2)},
        {"menu": "Tumis Sayur (Batch 1)", "exp": now + timedelta(minutes=30)},
    ]
    
    for m in meals:
        sisa = m['exp'] - now
        # Logic warna: Merah kalau < 1 jam
        color = "red" if sisa.total_seconds() < 3600 else "green"
        st.markdown(f"""
        <div style="padding:10px; border:1px solid #ddd; border-radius:5px; margin-bottom:10px; border-left: 5px solid {color}">
            <h3>{m['menu']}</h3>
            <p>Harus habis sebelum: <b>{m['exp'].strftime('%H:%M')}</b></p>
            <p style="color:{color}; font-weight:bold">Sisa Waktu: {str(sisa).split('.')[0]}</p>
        </div>
        """, unsafe_allow_html=True)