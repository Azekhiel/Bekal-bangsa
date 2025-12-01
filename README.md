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

## 2. Folder Structure & File Responsibilities

```text
.
├── backend/
│   ├── main.py           # API Gateway: Defines all HTTP endpoints (Upload, Analyze, Order, Cook).
│   ├── services.py       # Business Logic & AI: Handles interaction with Claude (Kolosal) and Supabase.
│   ├── models.py         # Data Validation: Pydantic models for API request/response structures.
│   ├── database.py       # Database Connection: Initializes the Supabase client.
│   └── requirements.txt  # Dependencies: FastAPI, Uvicorn, Supabase, OpenAI (for Kolosal).
└── frontend_streamlit/
    ├── Home.py           # Landing Page: Role selection (Pedagang vs SPPG).
    └── pages/
        ├── 1_upload.py         # Vendor: Upload/Camera feature for AI inventory scanning.
        ├── 2_dashboard_sppg.py # Admin: Stock monitoring, Supplier search, and AI Menu planning.
        ├── 3_pesanan_masuk.py  # Vendor: Interface to view and accept incoming orders.
        └── 4_dapur_produksi.py # Kitchen: Cooking log (stock deduction) and AI Meal QC scanner.
```

**Key File Functions:**
*   **[backend/main.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/main.py)**: The central controller. It routes requests like `/api/analyze` to the AI service and `/api/orders` to the database.
*   **[backend/services.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py)**: The "Brain". Contains [analyze_market_inventory](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py#28-118) (Vision), [generate_menu_recommendation](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py#119-159) (Reasoning), and [calculate_expiry_date](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py#184-191).
*   **`frontend/pages/1_upload.py`**: The main entry point for data. It handles image capture, calls the AI API, and allows vendors to verify data before saving.

## 3. Implemented Features (Status Check)

### User Role: Mitra Pedagang (Vendor)
*   **AI Inventory Scan:** Functional. Captures photo -> AI Identifies/Counts/Checks Quality -> Auto-fills form.
*   **Stock Management:** Functional. Saves verified stock to Supabase.
*   **Order Management:** Functional. View incoming orders from SPPG and update status (Accept/Ship).

### User Role: SPPG (Admin/Kitchen)
*   **Dashboard:** Functional. Real-time view of total stock, expiry warnings, and distribution charts.
*   **Supplier Search:** Functional. Search for specific ingredients (e.g., "Bawang") and view nearest suppliers.
*   **Order Creation:** Functional. One-click ordering from the search results.
*   **AI Menu Recommendation:** Functional. Generates recipes based on currently available stock ingredients.
*   **Kitchen Production:** Functional. "Cook" feature deducts stock ingredients and logs production.
*   **AI Meal QC:** Functional. Scans cooked meals to detect spoilage and estimate nutrition.

**Status Verification:**
*   **Order Management:** **Fully Implemented** (End-to-end flow from Search -> Order -> Vendor Accept -> Ship).
*   **AI Vision:** **Fully Implemented** (Used in both Inventory Scan and Cooked Meal QC).

## 4. Application Data Flow (Main Use Case: Inventory Upload)

1.  **Capture:** Vendor takes a photo of their goods using **Streamlit** ([1_upload.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/frontend_streamlit/pages/1_upload.py)).
2.  **Upload:** Image is sent to **FastAPI** (`/api/upload`), which saves it to **Supabase Storage** and returns a public URL.
3.  **Analyze:** Image bytes are sent to **FastAPI** (`/api/analyze`).
4.  **AI Processing:**
    *   [backend/services.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py) encodes the image to Base64.
    *   Sends request to **Claude 3.5 Sonnet** (via Kolosal).
    *   Claude analyzes the image for Item Name, Quantity, Unit, Freshness, and Expiry Prediction.
5.  **Verification:** The AI returns a JSON response. Streamlit populates a form with these values for the Vendor to review/edit.
6.  **Persistence:** Vendor clicks "Simpan". Data is sent to (`/api/supplies`) and stored in **Supabase Database** ([supplies](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/main.py#106-116) table).
7.  **Visualization:** The new stock immediately appears on the **SPPG Dashboard** ([2_dashboard_sppg.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/frontend_streamlit/pages/2_dashboard_sppg.py)).

## 5. AI Logic Explanation: [analyze_market_inventory](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py#28-118)

Located in [backend/services.py](file:///c:/Users/Ari%20Azis/Hackathon2025/Bekal-bangsa/backend/services.py), this function is the core of the inventory digitization.

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
    *   **Temperature:** Set to `0.1` (Low) to ensure factual, analytical responses and reduce hallucinations.
    *   **Output Enforcement:** The prompt explicitly requests a **raw JSON** output.
    *   **Error Handling:** The function includes a `try-except` block to catch `JSONDecodeError` (if the AI replies with text) and generic API errors, ensuring the frontend receives a clean error message instead of crashing.
