import streamlit as st
import requests

API_URL = "http://127.0.0.1:8000/api"

st.set_page_config(page_title="Pesanan Masuk", page_icon="📦")
st.title("📦 Pesanan Masuk")
st.caption("Kelola pesanan dari pemerintah di sini.")

if st.button("🔄 Refresh"):
    st.rerun()

try:
    # Ambil data order
    resp = requests.get(f"{API_URL}/orders/umkm")
    
    # 1. Cek Status Code Dulu!
    if resp.status_code != 200:
        st.error(f"Gagal mengambil data pesanan. Server Error: {resp.text}")
        st.stop()
        
    orders = resp.json()

    # 2. Cek apakah formatnya benar-benar List []
    if not isinstance(orders, list):
        st.error(f"Format data salah dari server. Diterima: {type(orders)}")
        st.write(orders) # Tampilkan biar tau isinya apa
        st.stop()

    if not orders:
        st.info("Belum ada pesanan masuk.")
    else:
        for order in orders:
            # Validasi isi order biar gak crash
            if not isinstance(order, dict):
                continue
                
            # Data Barang ada di dalam key 'supplies' (karena join)
            barang = order.get('supplies', {})
            
            # Handle kalau barangnya udah dihapus tapi ordernya masih ada
            if not barang: 
                item_name = "Barang Terhapus"
                unit = "Unknown"
            else:
                item_name = barang.get('item_name', 'Tanpa Nama')
                unit = barang.get('unit', 'Pcs')

            with st.container(border=True):
                c1, c2, c3 = st.columns([2, 1, 1])
                
                # Kolom 1: Info Barang
                with c1:
                    st.markdown(f"### {item_name}")
                    st.text(f"Pemesan: {order.get('buyer_name', '-')}")
                    tgl = order.get('created_at', '')[:10]
                    st.caption(f"Tanggal: {tgl}")

                # Kolom 2: Info Status
                with c2:
                    st.metric("Jumlah", f"{order.get('qty_ordered', 0)} {unit}")
                    
                    status = order.get('status', 'pending')
                    if status == "pending":
                        st.warning("⏳ Menunggu Konfirmasi")
                    elif status == "confirmed":
                        st.success("✅ Siap Kirim")
                    elif status == "completed":
                        st.info("🏁 Selesai")

                # Kolom 3: Aksi (Tombol)
                with c3:
                    st.write("") # Spacer
                    if status == "pending":
                        if st.button("✅ Terima", key=f"acc_{order['id']}"):
                            requests.put(f"{API_URL}/orders/{order['id']}", json={"status": "confirmed"})
                            st.rerun()
                    
                    elif status == "confirmed":
                        if st.button("🚚 Kirim", key=f"ship_{order['id']}"):
                            requests.put(f"{API_URL}/orders/{order['id']}", json={"status": "completed"})
                            st.rerun()

except Exception as e:
    st.error(f"Terjadi kesalahan aplikasi: {e}")