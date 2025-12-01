import streamlit as st
import requests
import pandas as pd
import plotly.express as px

API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Dashboard SPPG - Bekal Bangsa", page_icon="📊", layout="wide")

st.title("📊 Command Center SPPG")
st.markdown("Pantau ketersediaan pangan lokal & Rencanakan menu bergizi.")

# --- TABS FITUR ---
tab1, tab2, tab3 = st.tabs(["📦 Monitoring Stok", "🔍 Cari Supplier (Matching)", "🍽️ Rekomendasi Menu"])

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
    
    if keyword:
        with st.spinner(f"Mencari pedagang yang punya {keyword}..."):
            try:
                resp = requests.get(f"{API_URL}/suppliers/search", params={"q": keyword})
                results = resp.json().get("data", [])
                
                if results:
                    st.success(f"Ditemukan {len(results)} supplier!")
                    
                    for item in results:
                        with st.container(border=True):
                            c1, c2, c3 = st.columns([2, 2, 1])
                            c1.markdown(f"### {item['item_name']}")
                            c1.caption(f"📍 {item['location']} ({item['owner_name']})")
                            
                            c2.metric("Stok Tersedia", f"{item['quantity']} {item['unit']}")
                            c2.text(f"Kualitas: {item['quality_status']}")
                            
                            # Ganti tombol Chat jadi Order
                            if c3.button("🛒 Pesan", key=f"order_{item['id']}"):
                                with st.spinner("Membuat pesanan..."):
                                    payload = {
                                        "supply_id": item['id'],
                                        "qty_ordered": item['quantity'], # Pesan semua stok (biar gampang)
                                        "buyer_name": "Dapur SPPG 01"
                                    }
                                    res = requests.post(f"{API_URL}/orders", json=payload)
                                    if res.status_code == 200:
                                        st.success("✅ Pesanan Terkirim!")
                                        st.balloons()
                                    else:
                                        st.error("Gagal pesan")
                else:
                    st.warning("Tidak ditemukan supplier untuk barang tersebut.")
            except Exception as e:
                st.error("Error connecting to matching engine.")

# ==========================================
# TAB 3: SMART MENU (POST /api/recommend-menu)
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