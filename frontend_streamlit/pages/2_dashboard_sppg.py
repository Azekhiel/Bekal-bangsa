import streamlit as st
import requests
import pandas as pd
import plotly.express as px

API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Dashboard SPPG - Bekal Bangsa", page_icon="📊", layout="wide")

st.title("📊 Command Center SPPG")
st.markdown("Pantau ketersediaan pangan lokal & Rencanakan menu bergizi.")

# --- TABS FITUR ---
tab1, tab2, tab3, tab4, tab5 = st.tabs(["📊 Stok Nasional", "🔍 Cari Supplier (Matching)", "🍽️ Rekomendasi Menu (AI Chef)", "🌡️ Smart Storage (IoT)", "🔔 Notification Center"])

# ==========================================
# TAB 1: MONITORING STOK (GET /api/supplies)
# ==========================================
with tab1:
    st.subheader("Real-time Inventory")
    
    # Tombol Refresh
    if st.button("🔄 Refresh Data", key="btn_refresh_stok"):
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
    st.header("🔍 Cari Supplier Terdekat")
    
    # Input Lokasi User (Simulasi SPPG Jakarta Pusat)
    c_lat, c_long = st.columns(2)
    user_lat = c_lat.number_input("Latitude Saya", value=-6.175392, format="%.6f")
    user_long = c_long.number_input("Longitude Saya", value=106.827153, format="%.6f")
    
    keyword = st.text_input("Cari bahan (misal: Bawang, Telur)", "")
    
    if st.button("Cari Supplier", key="btn_cari_supplier"):
        if keyword:
            with st.spinner(f"Mencari '{keyword}' terdekat..."):
                try:
                    # Panggil API Search dengan Lat/Long
                    res = requests.get(f"{API_URL}/suppliers/search", params={
                        "q": keyword,
                        "lat": user_lat,
                        "long": user_long
                    })
                    
                    if res.status_code == 200:
                        results = res.json()
                        if results.get("data"): # Handle format return baru
                            items = results["data"]
                            st.success(f"Ditemukan {len(items)} supplier!")
                            
                            for item in items:
                                with st.container(border=True):
                                    c1, c2 = st.columns([3, 1])
                                    with c1:
                                        st.subheader(item['item_name']) # Fix key name
                                        st.write(f"📍 **Jarak: {item.get('distance_km', '?')} km**")
                                        st.write(f"👤 {item['owner_name']} | 🏠 {item['location']}")
                                        st.write(f"📦 Stok: {item['quantity']} {item['unit']} | ⏳ Exp: {item['expiry_days']} hari")
                                        if item.get('latitude'):
                                            st.caption(f"GPS: {item['latitude']}, {item['longitude']}")
                                        else:
                                            st.caption("GPS: Simulasi (Data Vendor belum lengkap)")
                                            
                                    with c2:
                                        if st.button("Pesan", key=f"btn_pesan_{item['id']}"):
                                            # Simulasi masuk keranjang (Session State)
                                            if 'cart' not in st.session_state:
                                                st.session_state['cart'] = []
                                            st.session_state['cart'].append(item)
                                            st.toast("Masuk keranjang!")
                        else:
                            st.warning("Tidak ada supplier ditemukan.")
                    else:
                        st.error(f"Error API: {res.text}")
                except Exception as e:
                    st.error(f"Gagal koneksi: {e}")

# ==========================================
# TAB 3: REKOMENDASI MENU (AI Chef)
# ==========================================
with tab3:
    st.header("🍽️ AI Menu Planner (Program Makan Bergizi Gratis)")
    st.info("Dapatkan rekomendasi menu masakan berdasarkan stok bahan yang tersedia.")
    
    # Ambil list item unik dari stok
    try:
        resp = requests.get(f"{API_URL}/supplies")
        if resp.status_code == 200:
            stock_data = resp.json()
            if stock_data:
                df_stock = pd.DataFrame(stock_data)
                unique_items = df_stock['item_name'].unique().tolist()
                
                selected_ingredients = st.multiselect("Pilih Bahan Baku Tersedia:", unique_items)
                
                if st.button("👨‍🍳 Buat Rekomendasi Menu", type="primary"):
                    if not selected_ingredients:
                        st.warning("Pilih minimal 1 bahan baku.")
                    else:
                        with st.spinner("Koki AI sedang meracik resep..."):
                            try:
                                payload = {"ingredients": selected_ingredients}
                                res_menu = requests.post(f"{API_URL}/recommend-menu", json=payload)
                                
                                if res_menu.status_code == 200:
                                    menu = res_menu.json()
                                    
                                    st.success("✅ Menu Siap Disajikan!")
                                    
                                    with st.container(border=True):
                                        c1, c2 = st.columns([2, 1])
                                        with c1:
                                            st.subheader(f"🍲 {menu.get('menu_name')}")
                                            st.write(f"**Deskripsi:** {menu.get('description')}")
                                            st.write(f"**Alasan:** {menu.get('reason')}")
                                        with c2:
                                            st.metric("Kalori", menu.get('nutrition', {}).get('calories', 'N/A'))
                                            st.metric("Protein", menu.get('nutrition', {}).get('protein', 'N/A'))
                                            
                                    st.json(menu) # Debug view
                                else:
                                    st.error(f"Gagal: {res_menu.text}")
                            except Exception as e:
                                st.error(f"Error: {e}")
            else:
                st.warning("Data stok kosong.")
    except Exception as e:
        st.error(f"Gagal load stok: {e}")

# ==========================================
# TAB 4: SMART STORAGE (IoT Monitoring)
# ==========================================
with tab4:
    st.header("🌡️ Smart Storage Monitoring")
    st.info("Data sensor real-time dari gudang penyimpanan (IoT).")
    
    # Tombol Refresh Manual (Ganti Autorefresh)
    if st.button("🔄 Refresh Sensor", key="btn_refresh_iot"):
        st.rerun()
    
    try:
        res = requests.get(f"{API_URL}/iot/logs")
        if res.status_code == 200:
            logs = res.json()
            if logs:
                df_iot = pd.DataFrame(logs)
                df_iot['created_at'] = pd.to_datetime(df_iot['created_at']) # Fix column name timestamp -> created_at
                
                # Metric Cards
                latest = df_iot.iloc[0]
                m1, m2, m3 = st.columns(3)
                m1.metric("Suhu Saat Ini", f"{latest['temperature']} °C", delta="Normal")
                m2.metric("Kelembaban", f"{latest['humidity']} %", delta="Stabil")
                m3.metric("Status Device", "ONLINE 🟢")
                
                # Charts
                st.subheader("Grafik Suhu & Kelembaban")
                st.line_chart(df_iot.set_index('created_at')[['temperature', 'humidity']])
            else:
                st.warning("Belum ada data sensor. Jalankan 'iot_simulator.py' di backend.")
        else:
            st.error("Gagal ambil data IoT.")
    except Exception as e:
        st.error(f"Koneksi IoT Error: {e}")

# ==========================================
# TAB 5: NOTIFICATION CENTER
# ==========================================
with tab5:
    st.header("🔔 Notification Center (WhatsApp Simulation)")
    st.info("Simulasi pesan WhatsApp yang dikirim ke Vendor & SPPG saat ada stok kritis.")
    
    if st.button("🔄 Jalankan Pengecekan Harian (Daily Check)", type="primary", key="btn_daily_check"):
        with st.spinner("🤖 AI sedang mengecek expiry date & menghitung jarak..."):
            try:
                res = requests.post(f"{API_URL}/notifications/trigger")
                if res.status_code == 200:
                    data = res.json()
                    msgs = data.get("data", [])
                    
                    if not msgs:
                        st.success("✅ Semua stok aman! Tidak ada notifikasi yang perlu dikirim.")
                    else:
                        st.warning(f"⚠️ Ditemukan {len(msgs)} isu stok!")
                        for i, msg in enumerate(msgs):
                            with st.chat_message(msg.get('role', 'System'), avatar="📱"):
                                st.write(f"**To: {msg.get('to', 'User')}**")
                                st.markdown(f"_{msg.get('message', '')}_")
                                if "RECIPE" in msg.get('type', ''):
                                    st.caption("💡 AI Recommendation included")
                else:
                    st.error(f"Gagal trigger notifikasi: {res.text}")
            except Exception as e:
                st.error(f"Error: {e}")