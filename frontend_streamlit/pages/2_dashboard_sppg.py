import streamlit as st
import requests
import pandas as pd
import plotly.express as px

API_URL = "http://127.0.0.1:8000/api"
import streamlit as st
import requests
import pandas as pd
import plotly.express as px

API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Dashboard SPPG - Bekal Bangsa", page_icon="📊", layout="wide")

st.title("📊 Command Center SPPG")
st.markdown("Pantau ketersediaan pangan lokal & Rencanakan menu bergizi.")

# --- TABS FITUR ---
tab1, tab2, tab3, tab4 = st.tabs(["📦 Monitoring Stok", "🔍 Cari Supplier (Matching)", "🍽️ Rekomendasi Menu", "🌡️ Smart Storage (IoT)"])

# ==========================================
# TAB 1: MONITORING STOK (GET /api/supplies)
# ==========================================
with tab1:
    st.subheader("Real-time Inventory")
    
    # Tombol Refresh
    if st.button("🔄 Refresh Data"):
        st.rerun()

    try:
        # 1. Ambil Data dari API
        resp = requests.get(f"{API_URL}/supplies")
        data = resp.json()
        
        if data:
            df = pd.DataFrame(data)
            
            # 2. Tampilkan Metrics Atas
            c1, c2, c3 = st.columns(3)
            c1.metric("Total Item Terdata", f"{len(df)} Item")
            c2.metric("Total Kuantitas", f"{df['quantity'].sum()} Unit")
            # Hitung yg mau expired (< 3 hari)
            warning_count = len(df[df['expiry_days'] <= 3])
            c3.metric("Perlu Segera Digunakan", f"{warning_count} Item", delta=-warning_count, delta_color="inverse")
            
            # 3. Grafik Sebaran (Biar Keren di Mata Juri)
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                st.caption("Komposisi Stok Barang")
                fig_pie = px.pie(df, names='item_name', values='quantity', hole=0.4)
                st.plotly_chart(fig_pie, use_container_width=True)
                
            with col_chart2:
                st.caption("Kualitas Barang")
                fig_bar = px.bar(df, x='item_name', y='quantity', color='quality_status')
                st.plotly_chart(fig_bar, use_container_width=True)

            # 4. Tabel Detail
            st.dataframe(
                df[['item_name', 'quantity', 'unit', 'quality_status', 'expiry_days', 'location', 'owner_name']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.info("Belum ada data stok masuk. Silakan upload di menu Pedagang.")
            
    except Exception as e:
        st.error(f"Gagal mengambil data: {e}")

# ==========================================
# TAB 2: PENCARIAN / MATCHING (GET Search)
# ==========================================
with tab2:
    st.subheader("🔍 Cari Supplier Terdekat")
    
    keyword = st.text_input("Butuh bahan apa?", placeholder="Contoh: Bawang, Telur, Bayam")
    
# ==========================================
with tab3:
    st.subheader("🍽️ Asisten Gizi AI")
    st.info("AI akan membuatkan menu berdasarkan stok yang tersedia di gudang saat ini.")
    
    # Ambil list bahan unik dari database buat pilihan
    try:
        resp = requests.get(f"{API_URL}/supplies")
        all_data = resp.json()
        # Ambil nama unik
        unique_ingredients = list(set([item['item_name'] for item in all_data]))
    except:
        unique_ingredients = ["Bawang", "Telur", "Bayam"] # Fallback kalau DB error

    selected_ingredients = st.multiselect("Pilih Bahan Tersedia:", unique_ingredients, default=unique_ingredients[:3])
    
    if st.button("✨ Generate Menu Sekolah"):
        if not selected_ingredients:
            st.error("Pilih minimal 1 bahan.")
        else:
            with st.spinner("Koki AI sedang meracik menu..."):
                try:
                    payload = {"ingredients": selected_ingredients}
                    resp_menu = requests.post(f"{API_URL}/recommend-menu", json=payload)
                    menu = resp_menu.json()
                    
                    st.divider()
                    st.markdown(f"## 🍲 {menu.get('menu_name', 'Menu Spesial')}")
                    st.write(menu.get('description'))
                    
                    c1, c2 = st.columns(2)
                    c1.success(f"**Gizi:** {menu.get('nutrition')}")
                    c2.info(f"**Alasan:** {menu.get('reason')}")
                    
                except Exception as e:
                    st.error(f"Gagal generate menu: {e}")

# ==========================================
# TAB 4: SMART STORAGE (IoT Monitoring)
# ==========================================
with tab4:
    st.subheader("🌡️ Smart Storage Monitoring")
    st.info("Data real-time dari sensor IoT di gudang penyimpanan.")
    
    if st.button("🔄 Refresh Sensor"):
        st.rerun()
        
    try:
        # Ambil data logs dari API
        resp = requests.get(f"{API_URL}/iot/logs")
        logs = resp.json()
        
        if logs:
            df_iot = pd.DataFrame(logs)
            
            # Ambil data terbaru (row pertama karena desc sort)
            latest = df_iot.iloc[0]
            
            # 1. Metrics Utama
            c1, c2, c3 = st.columns(3)
            
            # Logic Warna Suhu (Ideal 20-25)
            temp_val = latest['temperature']
            temp_delta = "Normal"
            if temp_val > 25: temp_delta = "Panas!"
            elif temp_val < 20: temp_delta = "Dingin!"
            
            c1.metric("Suhu Gudang", f"{temp_val} °C", delta=temp_delta, delta_color="inverse")
            c2.metric("Kelembaban", f"{latest['humidity']} %")
            c3.metric("Status Sensor", "ONLINE", delta="Active")
            
            # 2. Grafik Line Chart (History)
            st.caption("Grafik Suhu & Kelembaban (50 Data Terakhir)")
            
            # Melt dataframe biar bisa 2 garis dalam 1 chart
            df_chart = df_iot[['created_at', 'temperature', 'humidity']].melt('created_at', var_name='Metric', value_name='Value')
            
            fig = px.line(df_chart, x='created_at', y='Value', color='Metric', markers=True)
            st.plotly_chart(fig, use_container_width=True)
            
        else:
            st.warning("Belum ada data sensor. Jalankan 'iot_simulator.py' di backend.")
            
    except Exception as e:
        st.error(f"Gagal koneksi ke IoT Server: {e}")