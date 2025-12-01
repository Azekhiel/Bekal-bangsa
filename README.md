# Bekal Bangsa - Project Documentation

## 1. Project Context & Objectives
**Bekal Bangsa** is a digital ecosystem designed to support the **"Makan Siang Bergizi Gratis" (Free Nutritious Lunch)** program by connecting traditional market vendors (UMKM) directly with central kitchens (SPPG).

*   **Main Problem Solved:** Streamlining the supply chain from local markets to school kitchens, ensuring ingredient freshness, minimizing waste, and automating nutritional planning.
*   **Target Users:**
    *   **Mitra Pedagang (Vendors):** Use the app to digitize their market inventory simply by taking photos.
    *   **SPPG (Admin/Kitchen):** Monitor national stock availability, source ingredients locally, plan nutritious menus using AI, and manage mass cooking production.
*   **Technology Stack:**
    *   **Frontend:** Streamlit (Python)
    *   **Backend:** FastAPI (Python)
    *   **Database:** Supabase (PostgreSQL + Storage)
    *   **AI Models:** **Claude 3.5 Sonnet** (via Kolosal API) for both Computer Vision (Inventory/QC) and Reasoning (Menu Generation).
    *   **IoT:** Simulated Smart Storage sensors (Temperature/Humidity).

## 2. Installation & How to Run

### Prerequisites
*   Python 3.10+
*   Supabase Account (URL & Key)
*   Kolosal API Key (for Claude 3.5 Sonnet)

### Setup
1.  **Clone the repository**
2.  **Create Virtual Environment:**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```
4.  **Environment Variables:**
    Create a `.env` file in `backend/` with:
    ```ini
    SUPABASE_URL=your_supabase_url
    SUPABASE_KEY=your_supabase_key
    KOLOSAL_API_KEY=your_kolosal_key
    KOLOSAL_BASE_URL=https://llm.kolosal.ai/v1
    ```

### Running the App
1.  **Start Backend (FastAPI):**
    ```bash
    uvicorn backend.main:app --reload
    ```
    *API Docs available at: http://127.0.0.1:8000/docs*

2.  **Start Frontend (Streamlit):**
    ```bash
    streamlit run frontend_streamlit/Home.py
    ```

3.  **Start IoT Simulator (Optional):**
    ```bash
    python backend/iot_simulator.py
    ```

## 3. Folder Structure & File Responsibilities

```text
.
├── backend/
│   ├── main.py           # API Gateway: Defines all HTTP endpoints (Upload, Analyze, Order, Cook, IoT).
│   ├── services.py       # Business Logic & AI: Handles Claude (Kolosal), Supabase, and Geospatial logic.
│   ├── models.py         # Data Validation: Pydantic models (SupplyItem, IoTLogRequest).
│   ├── iot_simulator.py  # Simulation: Generates dummy sensor data for the Smart Storage feature.
│   ├── export_openapi.py # Tool: Exports OpenAPI JSON for frontend type generation.
│   └── database.py       # Database Connection: Initializes the Supabase client.
└── frontend_streamlit/
    ├── Home.py           # Landing Page: Role selection (Pedagang vs SPPG).
    └── pages/
        ├── 1_upload.py         # Vendor: AI Inventory scanning with Real GPS input.
        ├── 2_dashboard_sppg.py # Admin: Stock monitoring, Geospatial Supplier search, IoT Dashboard.
        ├── 3_pesanan_masuk.py  # Vendor: Interface to view and accept incoming orders.
        └── 4_dapur_produksi.py # Kitchen: Cooking log (stock deduction) and AI Meal QC scanner.
```

**Key File Functions:**
*   **`backend/main.py`**: The central controller. Routes requests like `/api/analyze` (AI), `/api/orders` (DB), and `/api/iot/log` (Sensors).
*   **`backend/services.py`**: The "Brain". Contains `analyze_market_inventory` (Vision), `generate_menu_recommendation` (Reasoning), and `haversine_distance` (Geospatial).
*   **`frontend/pages/1_upload.py`**: The main entry point for data. Handles image capture, AI analysis, and **GPS Location** input.

## 4. Implemented Features (Status Check)

### User Role: Mitra Pedagang (Vendor)
*   **AI Inventory Scan:** Functional. Captures photo -> AI Identifies/Counts/Checks Quality -> Auto-fills form.
*   **Real GPS Integration:** Functional. Vendors can input Latitude/Longitude to be discoverable by location.
*   **Stock Management:** Functional. Saves verified stock to Supabase.
*   **Order Management:** Functional. View incoming orders from SPPG and update status (Accept/Ship).

### User Role: SPPG (Admin/Kitchen)
*   **Dashboard:** Functional. Real-time view of total stock, expiry warnings, and distribution charts.
*   **Geospatial Supplier Search:** Functional. Search for ingredients (e.g., "Bawang") and sort by **Nearest Distance** (using Haversine formula).
*   **IoT Smart Storage:** Functional. Real-time monitoring of warehouse Temperature & Humidity (via Simulator).
*   **AI Menu Recommendation:** Functional. Generates recipes based on currently available stock ingredients.
*   **Kitchen Production:** Functional. "Cook" feature deducts stock ingredients (bulk delete) and logs production.
*   **AI Meal QC:** Functional. Scans cooked meals to detect spoilage and estimate nutrition.

## 5. Application Data Flow (Main Use Case: Inventory Upload)

1.  **Capture:** Vendor takes a photo of their goods using **Streamlit** (`1_upload.py`) and enters their **GPS Location**.
2.  **Upload:** Image is sent to **FastAPI** (`/api/upload`), which saves it to **Supabase Storage** and returns a public URL.
3.  **Analyze:** Image bytes are sent to **FastAPI** (`/api/analyze`).
4.  **AI Processing:**
    *   `backend/services.py` encodes the image to Base64.
    *   Sends request to **Claude 3.5 Sonnet** (via Kolosal).
    *   Claude analyzes the image for Item Name, Quantity, Unit, Freshness, and Expiry Prediction.
5.  **Verification:** The AI returns a JSON response. Streamlit populates a form with these values for the Vendor to review/edit.
6.  **Persistence:** Vendor clicks "Simpan". Data (including GPS) is sent to (`/api/supplies`) and stored in **Supabase Database**.
7.  **Visualization:** The new stock immediately appears on the **SPPG Dashboard**, searchable by distance.

## 6. AI Logic Explanation: `analyze_market_inventory`

Located in `backend/services.py`, this function is the core of the inventory digitization.

*   **Multi-Tasking Prompt:** The prompt instructs Claude to perform four distinct cognitive tasks simultaneously on a single image:
    1.  **Identification:** Recognize the object using local Indonesian terminology (e.g., "Cabe Rawit").
    2.  **Counting (Logic):**
        *   If discrete (eggs, fruits): Count individual items.
        *   If bulk/containers (rice sacks): Count the containers.
        *   If piled (heaps of chili): Estimate as "1 Pile/Kg".
    3.  **Quality Check:** Analyze visual features like skin texture, color vibrancy, and spots to determine freshness ("Sangat Segar", "Layum", etc.).
    4.  **Expiry Prediction:** Estimate remaining shelf life (in days) based on the visual freshness assessment.

*   **Technical Implementation:**
    *   **Model:** Claude 3.5 Sonnet.
    *   **Temperature:** Set to `0.1` (Low) to ensure factual, analytical responses.
    *   **Output Enforcement:** The prompt explicitly requests a **raw JSON** output for easy parsing.
