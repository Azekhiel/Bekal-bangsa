# 🏗️ Backend Architecture & Development Guide

**For:** Frontend Developers (Next.js) & Contributors
**Goal:** Understand how the FastAPI backend works internally and how to extend it.

---

## 1. High-Level Architecture

The backend follows a **Service-Oriented Architecture (SOA)** pattern (monolithic codebase but modular logic).

*   **Framework:** FastAPI (Async, Type-Safe).
*   **Database:** Supabase (PostgreSQL) via `supabase-py`.
*   **AI Engine:** Claude 4.5 Sonnet (via `kolosal_client`).
*   **Storage:** Supabase Storage (for images).

### Data Flow
`Request (Frontend)` -> `main.py (Controller)` -> `services/ (Business Logic)` -> `database.py (DB Access)` or `AI Client`

---

## 2. Folder Structure Explained

We recently refactored `services.py` which has too many rows of code, into a clean `services/` package.

```text
backend/
├── main.py                 # 🚦 THE CONTROLLER. All API endpoints live here.
├── database.py             # 🔌 DB CONNECTION. Initializes Supabase client.
├── models.py               # 🛡️ DATA VALIDATION. Pydantic schemas (Types).
├── prompts.py              # 💬 AI PROMPTS. Centralized system prompts for Claude.
├── iot_simulator.py        # 🤖 UTILITY. Script to generate fake sensor data.
│
└── services/               # 🧠 THE BRAIN. Business Logic Modules.
    ├── __init__.py         # Makes this a package.
    ├── clients.py          # Shared clients (Supabase, Kolosal) to avoid circular imports.
    ├── vision.py           # 👁️ AI Vision: Image analysis logic.
    ├── kitchen.py          # 👨‍🍳 Cooking: Menu recs, nutrition calc, stock deduction.
    ├── logistics.py        # 🚚 Maps: Haversine distance, finding suppliers.
    ├── inventory.py        # 📦 Stock: Expiry checks, WhatsApp notifications.
    ├── orders.py           # 🛒 Orders: Manage incoming/outgoing orders.
    └── storage.py          # ☁️ Files: Upload logic to Supabase Storage.
```

---

## 3. Key Modules Deep Dive

### A. `main.py` (The Entry Point)
This file should **ONLY** contain:
1.  **API Routes** (`@app.get`, `@app.post`).
2.  **Request/Response Handling**.
3.  **Error Handling** (`HTTPException`).
*It should NOT contain complex logic. It delegates everything to `services/`.*

### B. `services/` (The Logic)
*   **`vision.py`**: Handles the "Analyze Photo" feature. It encodes images to Base64 and sends them to Claude with a prompt from `prompts.py`.
*   **`kitchen.py`**: The most complex module. It handles the "Cook" action which involves:
    1.  Deleting ingredients from DB (Stock Deduction).
    2.  Asking AI for nutrition facts.
    3.  Logging the production to `meal_productions` table.
*   **`logistics.py`**: Contains the `haversine_distance` math function. It sorts suppliers by distance from the user.
*   **`orders.py`**: Handles order lifecycle (Create -> Pending -> Confirmed -> Completed). Manages status updates and history retrieval.

### C. `models.py` (The Contract)
Defines what data we expect from the Frontend.
*   **Example:** `SupplyItem` ensures that when you upload a supply, you MUST provide `name`, `qty`, `price`, etc.
*   **Tip:** If you want to add a new field to a form, update `models.py` first!

---

## 4. How to Add a New Feature (Workflow)

Want to add a feature? Follow this **"Model-Service-Endpoint"** pattern:

### Step 1: Define the Data (`models.py`)
Create a Pydantic model for your request/response.
```python
# models.py
class NewFeatureRequest(BaseModel):
    user_id: str
    action_type: str
```

### Step 2: Write the Logic (`services/`)
Create a function in the appropriate service file (or create a new one).
```python
# services/kitchen.py
def do_new_thing(data: NewFeatureRequest):
    # Do calculations, DB calls, or AI calls here
    return {"result": "success"}
```

### Step 3: Expose the Endpoint (`main.py`)
Import your service and create the route.
```python
# main.py
from services.kitchen import do_new_thing
from models import NewFeatureRequest

@app.post("/api/new-feature")
async def api_new_feature(req: NewFeatureRequest):
    return do_new_thing(req)
```

---

## 5. AI Integration Guide

We use **Claude 4.5 Sonnet** for everything.

*   **Where is the client?** `services/clients.py`.
*   **Where are the prompts?** `backend/prompts.py`.
*   **How to change AI behavior?**
    *   **DO NOT** change the code in `vision.py` or `kitchen.py` unless necessary.
    *   **DO** change the text in `prompts.py`. This is the safest way to tweak the AI's personality or output format.

---

## 6. Common Gotchas

1.  **Circular Imports:** Never import `main.py` inside `services/`. Always import *downwards* (`main` -> `services` -> `database`).
2.  **Async/Await:**
    *   DB calls (`supabase.table...execute()`) are synchronous in the current Python client (mostly).
    *   File uploads (`await file.read()`) are **async**.
    *   Be careful mixing them.
3.  **Environment Variables:** If you add a new key to `.env`, make sure to add it to `.env.example` so the team knows.

---

## 7. Function Reference (Deep Dive)

Here is exactly what every function does, so you know what you're calling.

### 👁️ `services/vision.py`

#### `analyze_market_inventory(image_bytes)`
*   **Goal:** The "Brain" of the Vendor Upload.
*   **Input:** Raw image bytes (from camera/upload).
*   **Logic:** Sends image to Claude 4.5 Sonnet with `get_inventory_analysis_prompt()`.
*   **Output:** JSON List of items with: `name`, `qty`, `unit`, `freshness`, `expiry_days`, `note`.

#### `analyze_cooked_meal(image_bytes)`
*   **Goal:** Quality Control (QC) for the Kitchen.
*   **Input:** Photo of the finished meal.
*   **Logic:** Asks AI to judge if the food looks safe/fresh and estimates nutrition visually.
*   **Output:** JSON with `freshness_status`, `visual_nutrition_estimate`.

### 👨‍🍳 `services/kitchen.py`

#### `generate_menu_recommendation(ingredients_list)`
*   **Goal:** Help Kitchen plan menus based on *existing* stock (reduce waste).
*   **Input:** List of strings (e.g., `["Spinach", "Tofu", "Chili"]`).
*   **Logic:** Asks Claude to invent a recipe using *only* those ingredients.
*   **Output:** JSON with `menu_name`, `ingredients_needed`, `cooking_steps`, `nutrition`.

#### `calculate_meal_expiry(menu_name)`
*   **Goal:** Food Safety estimation.
*   **Input:** Name of the dish (e.g., "Sayur Asem").
*   **Logic:** Asks AI how long this specific dish lasts at room temp vs fridge.
*   **Output:** JSON with `room_temp_hours`, `fridge_hours`, `storage_tips`.

#### `cook_meal(menu_name, qty_produced, ingredients_ids)`
*   **Goal:** The "Production" button.
*   **Input:** What was cooked, how much, and *which* specific ingredient IDs were used.
*   **Logic:**
    1.  **Delete:** Removes the used `ingredients_ids` from the `supplies` table (Stock Deduction).
    2.  **Analyze:** Calls `calculate_meal_expiry` to get safety data.
    3.  **Log:** Inserts a record into `meal_productions` table.
*   **Output:** Success message + Nutrition info.

### 🚚 `services/logistics.py`

#### `haversine_distance(lat1, lon1, lat2, lon2)`
*   **Goal:** Math helper.
*   **Input:** Two GPS coordinates.
*   **Output:** Distance in Kilometers (float).

#### `search_suppliers(keyword, user_lat, user_long)`
*   **Goal:** Find vendors selling specific items near the Kitchen.
*   **Input:** Search term (e.g., "Bawang"), and Kitchen's GPS.
*   **Logic:**
    1.  Queries DB for items matching `keyword`.
    2.  Calculates distance for each item using `haversine_distance`.
    3.  Sorts results by nearest distance.
*   **Output:** List of supplies sorted by distance.

#### `search_nearest_sppg(user_lat, user_long)`
*   **Goal:** Help Vendor find where to drop off goods.
*   **Input:** Vendor's GPS.
*   **Logic:** Compares Vendor GPS against hardcoded `SPPG_LOCATIONS`.
*   **Output:** List of SPPG hubs sorted by distance.

### 📦 `services/inventory.py`

#### `calculate_expiry_date(days)`
*   **Goal:** Date helper.
*   **Input:** Integer (e.g., `2` days).
*   **Output:** String date `YYYY-MM-DD` (e.g., `2025-12-04`).

#### `check_expiry_and_notify()`
*   **Goal:** The "Cron Job" for notifications.
*   **Input:** None (Triggered manually or by scheduler).
*   **Logic:**
    1.  Queries DB for items with `expiry_days <= 2`.
    2.  **For Vendor:** Generates a "Warning" message (Sell now!).
    3.  **For Kitchen:** Calls `generate_menu_recommendation` to create a "Rescue Recipe" message.
*   **Output:** List of simulated WhatsApp notification payloads.

### 🛒 `services/orders.py`

#### `create_order(buyer_id, supply_id, qty)`
*   **Goal:** Kitchen places an order to a Vendor.
*   **Input:** Who is buying, what item, how much.
*   **Logic:** Inserts record into `orders` table with status `pending`.
*   **Output:** Created order object.

#### `get_orders(role, user_id)`
*   **Goal:** Fetch history.
*   **Input:** Role ('vendor' or 'kitchen') and User ID.
*   **Logic:** Queries `orders` table filtering by `seller_id` (for Vendor) or `buyer_id` (for Kitchen).
*   **Output:** List of orders sorted by date.

#### `update_order_status(order_id, status)`
*   **Goal:** Change state (Accept/Reject/Complete).
*   **Input:** Order ID and new status string.
*   **Logic:** Updates the `status` field in DB.
*   **Output:** Success message.

### ☁️ `services/storage.py`

#### `upload_image_to_supabase(file)`
*   **Goal:** Handle file hosting.
*   **Input:** `UploadFile` object from FastAPI.
*   **Logic:** Uploads bytes to Supabase Storage bucket `supply-photos` with a timestamped filename.
*   **Output:** Public URL string (e.g., `https://supabase.../173000_foto.jpg`).
