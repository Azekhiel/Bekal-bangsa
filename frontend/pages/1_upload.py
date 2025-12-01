import streamlit as st
import requests
import pandas as pd
from datetime import date

# Konfigurasi API
API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Upload Stok - Bekal Bangsa", page_icon="📸")

st.title("📸 Upload Stok Pedagang")
st.info("Foto barang dagangan Anda untuk didata otomatis oleh AI.")

# 1. Input Data Diri (Simulasi Login)
with st.expander("👤 Identitas Pedagang", expanded=True):
    owner_name = st.text_input("Nama Pedagang", value="Pak Asep")
    location = st.text_input("Lokasi Pasar", value="Pasar Induk Cianjur")

# 2. Ambil Foto (Pilih Metode)
st.write("---")
st.subheader("📸 Masukkan Gambar Barang")

tab1, tab2 = st.tabs(["📸 Kamera Langsung", "📂 Upload File"])
img_file = None

with tab1:
    camera_file = st.camera_input("Jepret Foto")
    if camera_file: img_file = camera_file
with tab2:
    uploaded_file = st.file_uploader("Pilih foto dari galeri/komputer", type=['jpg', 'jpeg', 'png'])
    if uploaded_file: img_file = uploaded_file

# Inisialisasi variabel data
photo_url = None
items_data = []

if img_file:
    # Tampilkan spinner loading
    with st.spinner("🤖 AI sedang menganalisis gambar & mengupload..."):
        try:
            # --- STEP A: UPLOAD FOTO KE STORAGE ---
            img_file.seek(0)
            files_upload = {"file": ("upload.jpg", img_file, "image/jpeg")}
            resp_upload = requests.post(f"{API_URL}/upload", files=files_upload)
            if resp_upload.status_code != 200:
                st.error(f"Gagal upload foto: {resp_upload.text}")
                st.stop()
            photo_url = resp_upload.json().get("url")
            
            # --- STEP B: ANALISIS AI (VISION) ---
            img_file.seek(0)
            files_analyze = {"file": ("analyze.jpg", img_file, "image/jpeg")}
            resp_analyze = requests.post(f"{API_URL}/analyze", files=files_analyze)
            if resp_analyze.status_code != 200:
                st.error("Gagal analisis AI. Coba foto ulang.")
                st.stop()
                
            ai_result = resp_analyze.json()
            if ai_result.get("status") != "success":
                st.warning("AI tidak menemukan barang. Coba foto lebih jelas.")
                st.stop()
                
            items_data = ai_result.get("data", [])
            if not items_data:
                st.warning("Tidak ada barang terdeteksi.")
                st.stop()

            # --- 🔥 FIX PENTING: UPDATE MEMORI STREAMLIT 🔥 ---
            # Kita paksa update session_state dengan data baru dari API
            # agar widget form di bawah mau berubah nilainya.
            for i, item in enumerate(items_data):
                st.session_state[f"name_{i}"] = item['name']
                st.session_state[f"qty_{i}"] = int(item['qty'])
                st.session_state[f"unit_{i}"] = item['unit']
                st.session_state[f"fresh_{i}"] = item['freshness']
                st.session_state[f"exp_{i}"] = int(item['expiry'])

            st.success("✅ Analisis Selesai!")
            
        except Exception as e:
            st.error(f"Terjadi kesalahan sistem: {str(e)}")
            st.stop()

# --- STEP C: PREVIEW & EDIT (FORMULIR) ---
# Bagian ini ditaruh di luar blok 'if img_file:' agar tetap muncul setelah interaksi
if items_data and photo_url:
    st.subheader("📝 Verifikasi Data")
    st.image(photo_url, caption="Preview Upload", use_column_width=True)
    
    final_items = []
    
    # Loop setiap barang yang dideteksi
    for i, item in enumerate(items_data):
        with st.container(border=True):
            st.markdown(f"**Barang #{i+1} (Deteksi AI: {item['name']})**")
            c1, c2, c3 = st.columns(3)
            
            # --- PERUBAHAN DI SINI: Hapus parameter 'value=' ---
            # Kita hapus 'value=...' karena nilainya sekarang otomatis diambil 
            # dari st.session_state[key] yang sudah kita update di atas.
            new_name = c1.text_input(f"Nama", key=f"name_{i}")
            new_qty = c2.number_input(f"Jumlah", min_value=1, key=f"qty_{i}")
            new_unit = c3.text_input(f"Satuan", key=f"unit_{i}")
            
            c4, c5 = st.columns(2)
            # Pastikan opsi freshness sama persis dengan output AI/backend
            freshness_options = ["Sangat Segar", "Segar", "Cukup", "Layum", "Busuk"]
            # Fallback jika output AI tidak ada di opsi
            try:
                idx = freshness_options.index(st.session_state[f"fresh_{i}"])
            except ValueError:
                idx = 0

            new_freshness = c4.selectbox(f"Kualitas", freshness_options, index=idx, key=f"fresh_{i}")
            new_expiry = c5.number_input(f"Sisa Umur (Hari)", key=f"exp_{i}")
            
            st.caption(f"🤖 Catatan AI: {item.get('note', '-')}")
            
            # Masukkan ke list final
            final_items.append({
                "name": new_name,
                "qty": new_qty,
                "unit": new_unit,
                "freshness": new_freshness,
                "expiry_days": new_expiry,
                "note": item.get('note'),
                "photo_url": photo_url,
                "owner_name": owner_name,
                "location": location
            })

    # --- STEP D: SIMPAN KE DATABASE ---
    if st.button("🚀 SIMPAN SEMUA KE GUDANG", type="primary", use_container_width=True):
        with st.spinner("Menyimpan ke database..."):
            try:
                resp_save = requests.post(f"{API_URL}/supplies", json=final_items)
                if resp_save.status_code == 200:
                    st.balloons()
                    st.success(f"Berhasil menyimpan {len(final_items)} jenis barang!")
                    # Opsional: Clear data setelah simpan biar form bersih lagi
                    # st.experimental_rerun() 
                else:
                    st.error(f"Gagal menyimpan: {resp_save.text}")
            except Exception as e:
                st.error(f"Gagal connect ke backend: {e}")