import streamlit as st

# Konfigurasi Halaman (Wajib di baris pertama)
st.set_page_config(
    page_title="Bekal Bangsa",
    page_icon="🍱",
    layout="wide"
)

# --- CSS Styling (Biar warnanya Emerald & Gold) ---
st.markdown("""
<style>
    .stApp {
        background-color: #f8f9fa;
    }
    .main-header {
        font-size: 3rem;
        color: #064e3b; /* Emerald Dark */
        text-align: center;
        font-weight: bold;
        margin-bottom: 0;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #d97706; /* Amber/Gold */
        text-align: center;
        margin-bottom: 3rem;
        font-weight: 500;
    }
    .card {
        background-color: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        text-align: center;
        height: 300px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: 1px solid #e5e7eb;
        transition: transform 0.2s;
    }
    .card:hover {
        transform: translateY(-5px);
        border: 2px solid #064e3b;
    }
    .emoji-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# --- Hero Section ---
st.markdown('<div class="main-header">Bekal Bangsa</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Menjaga Gizi, dari UMKM untuk Negeri 🇮🇩</div>', unsafe_allow_html=True)

# --- Role Selection ---
col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    <div class="card">
        <div class="emoji-icon">🏪</div>
        <h2 style="color:#064e3b;">Mitra Pedagang</h2>
        <p style="color:#4b5563;">Upload stok dagangan pasar, cek kualitas dengan AI, dan jual langsung ke SPPG terdekat.</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.write("") # Spacer
    if st.button("Masuk sebagai Pedagang ➡️", type="primary", use_container_width=True):
        st.switch_page("pages/1_upload.py")

with col2:
    st.markdown("""
    <div class="card">
        <div class="emoji-icon">🏛️</div>
        <h2 style="color:#064e3b;">Dapur SPPG</h2>
        <p style="color:#4b5563;">Monitoring stok pangan nasional, cari supplier terdekat, dan rekomendasi menu gizi.</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.write("") # Spacer
    if st.button("Masuk sebagai Admin SPPG ➡️", use_container_width=True):
        st.switch_page("pages/2_dashboard_SPPG.py")

# --- Footer ---
st.write("---")
st.markdown(
    """
    <div style="text-align: center; color: #6b7280; font-size: 0.8rem;">
    © 2025 Bekal Bangsa Team. Built for Hackathon with FastAPI & Claude Sonnet 4.5.
    </div>
    """, 
    unsafe_allow_html=True
)