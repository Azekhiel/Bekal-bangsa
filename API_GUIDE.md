# Bekal Bangsa - API Integration Guide

This guide is for the **Next.js Frontend Developer** to integrate with the Bekal Bangsa FastAPI Backend.

## 1. Base URL & CORS
*   **Base URL:** `http://localhost:8000`
*   **CORS:** Allowed origins include `http://localhost:3000` (Next.js), `http://localhost:8000`, and `https://bekal-bangsa.vercel.app`.

## 2. Type Generation (TypeScript)
We use **OpenAPI** to generate strict TypeScript types.
1.  Run backend: `uvicorn backend.main:app`
2.  Run export script: `python backend/export_openapi.py` -> generates `openapi.json`
3.  Use a generator (like `openapi-typescript-codegen`) to create your API client.

## 3. Key Endpoints

### A. Upload & Analyze (Vendor)
*   **POST** `/api/upload`: Upload image to Supabase Storage.
    *   **Input:** `Multipart/Form-Data` (file)
    *   **Output:** `{"url": "https://..."}`
*   **POST** `/api/analyze`: Analyze image with AI.
    *   **Input:** `Multipart/Form-Data` (file)
    *   **Output:** JSON with detected items (name, qty, freshness, expiry).

### B. Save Supplies (Vendor)
*   **POST** `/api/supplies`: Save verified inventory to Database.
    *   **Input:** JSON Array of `SupplyItem`.
    *   **New Fields (GPS):**
        *   `latitude`: float (Optional) - Real GPS Latitude.
        *   `longitude`: float (Optional) - Real GPS Longitude.
    *   **Note:** Use `navigator.geolocation.getCurrentPosition` in Next.js to get these values.

### C. Search Suppliers (SPPG)
*   **GET** `/api/suppliers/search`: Search for ingredients.
    *   **Query Params:**
        *   `q`: string (Keyword, e.g., "Bawang")
        *   `lat`: float (Optional, default=-6.175392) - User's current Latitude.
        *   `long`: float (Optional, default=106.827153) - User's current Longitude.
    *   **Response:** List of items sorted by **Distance** (nearest first).

### D. Menu Recommendation (SPPG)
*   **POST** `/api/recommend-menu`: Generate AI menu based on ingredients.
    *   **Input:** `{"ingredients": ["Bawang", "Telur"]}`
    *   **Output:**
        ```json
        {
            "menu_name": "Telur Balado",
            "description": "...",
            "nutrition": {
                "calories": "200 kcal",
                "protein": "12g"
            },
            "reason": "..."
        }
        ```

### E. Order Management
*   **POST** `/api/orders`: Create a new order (SPPG).
*   **GET** `/api/orders/umkm`: Get incoming orders (Vendor).
*   **PUT** `/api/orders/{order_id}`: Update order status (Vendor).

### F. Kitchen Production
*   **POST** `/api/kitchen/cook`: Log cooking production and deduct stock.
*   **POST** `/api/kitchen/scan-meal`: QC scan for cooked meals.

### G. IoT Smart Storage
*   **GET** `/api/iot/logs`: Get historical sensor data (Temperature/Humidity).
*   **POST** `/api/iot/log`: Send new sensor data (used by Simulator).

### H. Notifications
*   **POST** `/api/notifications/trigger`: Manually trigger expiry checks and WhatsApp alerts.

## 4. Authentication
*   Currently, the API is open (Hackathon mode).
*   For production, we will implement JWT via Supabase Auth. Pass the `Authorization: Bearer <token>` header in every request.

## 5. IoT Simulator
To test the "Smart Storage" feature without real hardware:
```bash
python backend/iot_simulator.py
```
This will send data to the backend every 5 seconds.

## 6. GPS Location (Real vs Simulation)

We support real GPS data (`latitude`, `longitude`) in the `POST /api/supplies` endpoint.

### Frontend Limitation (Streamlit vs Next.js)
*   **Streamlit (Current):** Runs on the server, so it cannot easily access the user's phone GPS. We currently simulate locations around Jakarta.
*   **Next.js (Future):** Runs on the client (browser/mobile). You should use the **Geolocation API** (`navigator.geolocation.getCurrentPosition`) to get the real coordinates and send them when uploading supplies.
