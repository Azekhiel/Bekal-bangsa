## Bekal Bangsa ##

*Latest Update: December 2, 2025*

## 1. Project Context & Objectives

### What is this project?
**Bekal Bangsa** is a comprehensive platform designed to address critical issues in the **MBG (Makan Bergizi Gratis)** program and the local food (UMKM) ecosystem. The system addresses critical failures in the entire food supply chain, transforming manual operations into an intelligent, traceable ecosystem.

### 🚨 Current Pain Points:
The platform focuses on solving three core issues that threaten the stability and health objectives of the MBG program:

1. **Supply Chain Security & Safety Risk:**
- Issue: The lack of visual quality standards, manual inventory checks, and poor tracking of ingredient shelf-life lead directly to high risks of food poisoning and the use of substandard ingredients.

2. **Economic Exclusion of UMKM (Vendor Marginalization):**
- Issue: Traditional market vendors (UMKM) are often locked out of large-scale government procurement due to complex administrative barriers and a lack of digital tools, causing local economies to suffer.

3. **Nutritional Inefficiency & Food Waste:**
- Issue: A constant mismatch between available market supply and kitchen demand leads to ingredients expiring (food waste). Menus are often planned generically, failing to maximize nutritional value based on fresh local stock.

### 💡Our Solution:

**A. 🤝 Mitra Pedagang (UMKM) Empowerment:**
- **Digital Cataloging:** 
    - Function: Helps UMKM create a Digital Catalog (inventory, price, quantity, and freshness with expiry date prediction) for their stock by simply taking photo. 
    - Outcome: Local UMKM gain smart cataloging for their stock.

- **UMKM Integration into the MBG supply chain:** 
    - Function: Shows nearest SPPG Kitchen based on GPS coordinates for UMKM to sell their ingredients. 
    - Outcome: Local UMKM gain immediate, transparent access to the massive government procurement market and digital stock management.

- **Proactive Waste Mitigation (UMKM Warning):** 
    - Function: Sends a warning using whatsapp notification to the UMKM vendor to sell the nearly expiring ingredients to the nearest SPPG kitchen before it spoils. 
    - Outcome: UMKM vendor can sell the ingredients before it spoils, reducing food waste.

**B. 🧠 Portal SPPG (Admin & Kitchen):** 
- **Smart & Efficient Logistics:** 
    - Function: Provides Real-time Geospatial Search to match SPPG demand with the nearest available UMKM supply. 
    - Outcome: Empowers local UMKM and ensures Fresh/Expiring stock is prioritized, optimizing nutritional output.

- **Smart Dashboard & Inventory:** 
    - Function: Displays available supplies from all vendors in a single dashboard, sorted by freshness and expiry date. 
    - Outcome: Kitchen staff can track and plan procurement based on existing ingredients.

- **AI Menu Recommendation:** 
    - Function: Generates healthy and nutritious recipes based existing fresh ingredients catalog. 
    - Outcome: Kitchen staff can plan menus based on existing ingredients, reducing waste and ensuring nutritional value.

- **Proactive Waste Mitigation (SPPG Warning):** 
    - Function: Sends a warning using whatsapp notification to the SPPG kitchen to create a healthy recommendation menu based on nearly expiring ingredients, ensuring that no ingredients goes to waste. 
    - Outcome: SPPG kitchen can optimize their menu based on existing ingredients before it spoils, signficantly reducing food waste.

**C. 🍽️ End-to-End Food Safety (Core AI Innovation)**
- **AI Quality Control & Meal Safety:** 
    - Function: Uses Multimodal AI Vision and IoT sensors to automatically verify the freshness, nutrition, and estimate the absolute expiry date of menus cooked for MBG. 
    - Outcome: Guarantees that only safe and high-quality meals are served to the students, mitigating the risk of toxic and unhealthy food.


### 👥 Users
1.  **Pedagang Pasar (Vendors):** Upload photos of their inventory to sell/donate before it spoils.
2.  **Admin SPPG (Kitchen):** Receive ingredients, plan menus, cook meals, and monitor storage conditions.

### 🛠️ Technology Stack
-   **Backend:** Python **FastAPI** (High performance, async support).
-   **Frontend:** **Streamlit** (Rapid prototyping for Data/AI apps).
-   **Database:** **Supabase** (PostgreSQL) for relational data and Realtime subscriptions.
-   **AI Models:**
    -   **Claude 4.5 Sonnet (via Kolosal):** For Vision (Ingredient Analysis) and Reasoning (Menu Recommendation, Nutrition Estimation).
-   **IoT:** Simulated Temperature/Humidity sensors for Smart Storage.

---

## 2. Installation & Run Tutorial

### Prerequisites
-   Python 3.9+
-   Supabase Account & Credentials

### Step-by-Step Guide

#### 1. Clone & Setup Environment
```bash
git clone <repository_url>
cd Bekal-bangsa

# Create Virtual Environment
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install Dependencies
pip install -r backend/requirements.txt
pip install -r frontend_streamlit/requirements.txt
```

#### 2. Configure Environment Variables
Create a `.env` file in the `backend/` folder:
```ini
SUPABASE_URL="your_supabase_url"
SUPABASE_KEY="your_supabase_anon_key"
KOLOSAL_API_KEY="your_kolosal_api_key"
```

#### 3. Run the Backend (FastAPI)
```bash
cd backend
uvicorn main:app --reload
# Server running at http://127.0.0.1:8000
```

#### 4. Run the IoT Simulator (Optional)
To generate dummy sensor data:
```bash
python backend/iot_simulator.py
```

#### 5. Run the Frontend (Streamlit)
Open a new terminal:
```bash
streamlit run frontend_streamlit/Home.py
# App running at http://localhost:8501
```

---

## 3. Folder Structure & File Responsibilities

```text
Bekal-bangsa/
├── backend/
│   ├── main.py             # Entry point. Defines API endpoints and connects services.
│   ├── services.py         # Business logic: AI calls, DB operations, Distance calc.
│   ├── models.py           # Pydantic models for Data Validation (Request/Response).
│   ├── prompts.py          # Centralized AI Prompts for Claude Sonnet.
│   ├── iot_simulator.py    # Script to simulate IoT sensor data sending to API.
│   └── database.py         # Supabase client initialization.
├── frontend_streamlit/
│   ├── Home.py             # Main Landing Page.
│   └── pages/
│       ├── 1_upload.py     # Vendor: Upload photo, AI analysis, Search SPPG.
│       ├── 2_dashboard_sppg.py # Admin: View stock, IoT logs, Menu Recs.
│       ├── 3_tracking.py   # Tracking orders (Basic).
│       └── 4_dapur_produksi.py # Kitchen: Cook meals, Deduct stock, Nutrition Info.
└── README.md               # This documentation.
```

---

## 4. Implemented Features (Status Check)

### 🛒 For Pedagang (Vendors)
-   **[✅ Functional] AI Inventory Scan:** Upload a photo, AI detects items, quantity, and freshness.
-   **[✅ Functional] GPS Location:** Auto-detects (simulated) or manual input of vendor location.
-   **[✅ Functional] Search Nearest SPPG:** Finds the closest Kitchen Hub based on GPS distance.

### 👨‍🍳 For SPPG (Kitchen Admin)
-   **[✅ Functional] Smart Dashboard:** View available supplies from all vendors.
-   **[✅ Functional] AI Menu Recommendation:** Generates recipes based on expiring ingredients.
-   **[✅ Functional] Kitchen Production:**
    -   One-click "Cook" button.
    -   Auto-deducts stock from DB.
    -   **AI Nutrition Est:** Calculates Calories/Protein per serving.
    -   **AI Safety Check:** Estimates shelf-life.
-   **[✅ Functional] IoT Monitoring:** Real-time chart of storage temperature/humidity.
-   **[✅ Functional] Expiry Alerts:** WhatsApp-style notifications for expiring batches.

---

## 5. Application Data Flow (End-to-End)

**Scenario: A Vendor uploads a basket of vegetables.**

1.  **Capture:** User takes a photo in `1_upload.py` (Streamlit).
2.  **Upload:** Image is sent to `POST /api/upload` -> Saved to Supabase Storage -> Returns URL.
3.  **Analyze:** Image bytes sent to `POST /api/analyze`.
    -   **Backend:** `services.analyze_market_inventory` calls **Claude 4.5 Sonnet**.
    -   **AI:** Identifies "5kg Spinach, Fresh".
    -   **Response:** JSON data returned to Frontend.
4.  **Review:** User verifies data in Streamlit form, adds GPS location.
5.  **Save:** User clicks "Simpan". Data sent to `POST /api/supplies`.
    -   **Database:** Saved to `supplies` table in Supabase.
6.  **Visualize:** Data immediately appears on `2_dashboard_sppg.py` for the Kitchen Admin to see.

---

## 6. AI Logic Explanation

### `analyze_market_inventory` (in `backend/services.py`)

This function is the "Brain" of the intake process. It uses a **Single-Shot Prompting** strategy with Claude 4.5 Sonnet to perform three tasks simultaneously:

1.  **Object Detection & Counting:** It visually identifies items (e.g., "Tomatoes") and estimates quantity (e.g., "3 kg" or "10 pcs").
2.  **Quality Assessment:** It analyzes visual cues (color, texture) to determine freshness (e.g., "Fresh", "Wilting", "Rotten").
3.  **Expiry Prediction:** Based on the item type and visual state, it estimates `expiry_days` (e.g., "Spinach" + "Wilting" = 1 day left).

**How it works:**
-   The image is encoded in Base64.
-   Sent to Kolosal API with a strict system prompt: *"You are an expert food quality inspector..."*
-   The model is forced to output **ONLY JSON** (no markdown), ensuring the backend can parse it directly into Pydantic models without regex hacking.
