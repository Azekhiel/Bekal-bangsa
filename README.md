## Bekal Bangsa ##

**🌐 [Visit Application](https://bekal-bangsa.vercel.app)** 

*Latest Update: December 7, 2025*

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

**A. 🤝 Mitra UMKM Empowerment:**
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

- **AI Chef Assistant (Chatbot):**
    - Function: Interactive AI (Chef Juna) that helps Kitchen Admin plan menus, answer logistics questions, and manage stock using natural language.
    - Outcome: Reduces administrative burden and provides instant expert guidance.

- **Smart Dashboard & IoT Storage:** 
    - Function: Displays supplies with freshness and expiry date prediction and monitors physical storage conditions (Temperature/Humidity) in real-time using IoT sensors.
    - Outcome: Ensures optimal storage conditions and simplifies procurement planning.

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
1.  **UMKM (Vendors):** Upload photos of their inventory to sell/donate before it spoils.
2.  **Admin SPPG (Kitchen):** Receive ingredients, plan menus, cook meals, and monitor storage conditions.

### 🛠️ Technology Stack
-   **Backend:** Python **FastAPI** (High performance, async support).
-   **Frontend (Primary):** **Next.js 15** with TypeScript (Modern React framework, production-ready).
-   **Frontend (Legacy):** **Streamlit** (Rapid prototyping, deprecated in favor of Next.js).
-   **Database:** **Supabase** (PostgreSQL) for relational data and Realtime subscriptions.
-   **AI Models:**
    -   **Claude 4.5 Sonnet (via Kolosal):** For Vision (Ingredient Analysis) and Reasoning (Menu Recommendation, Nutrition Estimation).
-   **IoT:** Simulated Temperature/Humidity sensors for Smart Storage.
-   **UI Components:** shadcn/ui, Tailwind CSS, Recharts.

---

## 2. Installation & Run Tutorial

### Prerequisites
-   **Node.js 18+** (for Next.js frontend)
-   **Python 3.9+** (for FastAPI backend)
-   **Supabase Account** & Credentials

---

### 🚀 Quick Start

#### Option A: Access Live Demo 
**🌐 [Visit Application](https://bekal-bangsa.vercel.app)** 
-   **Backend:** Deployed on DigitalOcean
-   **Frontend:** Deployed on Vercel
-   **IoT:** Connected to ESP32 physical sensors.

#### Option B: Run Locally

#### 1. Clone & Setup
```bash
git clone <repository_url>
cd Bekal-bangsa
```

#### 2. Run the Frontend (Next.js)
Open a terminal:
```bash
cd frontend_next

# Install Dependencies
npm install

# Setup Environment
# Create .env.local and add:
# NEXT_PUBLIC_API_BASE=https://bekal-bangsa-al8lc.ondigitalocean.app/api

# Run Development Server
npm run dev
# ✅ Frontend running at http://localhost:3000
```

**Access the app:** Open your browser to `http://localhost:3000`

#### 3. (Optional) Run Backend Locally
*Only required if you want to modify backend logic.*

1.  **Configure Vars:** Create `.env` in `backend/` with Supabase & Kolosal keys.
2.  **Run Server:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
# ✅ Backend running at http://127.0.0.1:8000
```

#### 4. Setup IoT Sensors 

**Option A: Use Real ESP32 Device**
1.  Navigate to the `scripts/` folder.
2.  Open `ESP32_Sensor.ino` in Arduino IDE.
3.  Connect your ESP32 with a DHT11/DHT22 (Temperature and Humidity) sensor.
4.  Update the `WIFI_SSID` and `WIFI_PASSWORD` in the code.
5.  Upload the code to your ESP32. It will automatically start sending temperature/humidity data.

**Option B: Use Simulator (No Hardware)**
*Note: The system automatically falls back to simulated data if no sensor is active. You generally DO NOT need to run anything manually.*

However, if you want to manually force specific data, you can run the simulator script (requires local backend or updated URL):
```bash
cd backend
python iot_simulator.py
# 🚀 Simulates temperature/humidity data every 5 seconds
```

---

### 📱 Access on Mobile

### 1. Ensure Same WiFi Network
Make sure your Laptop (running the server) and your Phone are connected to the **same WiFi network**.

### 2. Check Laptop IP Address
1.  Open Terminal (Command Prompt / PowerShell) on your Laptop.
2.  Type command: `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
3.  Find the **IPv4 Address**. E

### 3. Open in Phone Browser
1.  Open Chrome / Safari on your Phone.
2.  Type the following address in the address bar:
    *   **Frontend:** `http://<YOUR_LAPTOP_IP>:3000`
    *   **Backend API:** `http://<YOUR_LAPTOP_IP>:8000/docs`

> **Note:** If it doesn't work, try temporarily disabling the Firewall on your Laptop.

---

## 3. Features & Usage Guide

**Getting Started:**
1.  Open the application landing page.
2.  Choose your role: **UMKM Vendor** (Seller) or **Kitchen Admin** (Buyer).
3.  Login using your credentials or use the provided **Demo Accounts** for quick access.

---

### 🏪 A. UMKM Portal (Vegetable/Food Vendor)
Designed for market vendors to digitize stock and connect with government kitchens.

#### 1. Dashboard & Smart Alerts
-   **Stock Health:** Monitor Fresh vs. Expiring items at a glance.
-   **Proactive Notifications:** Receive **WhatsApp-style alerts** when ingredients are nearing expiry, allowing you to sell them quickly before they spoil.
![Screenshot Vendor Dashboard](https://placehold.co/600x400/png?text=Screenshot+Vendor+Dashboard)

#### 2. Smart Stock Upload
-   **AI Recognition:** Take a photo of your current existing stocks; AI automatically detects **Item Type**, **Quantity**, **Expiry Date**, and **Freshness Level**.
-   **Manual Control:** You can manually edit the AI's detected values to ensure 100% accuracy before saving to the Digital Catalog.
![Screenshot AI Stock Upload](https://placehold.co/600x400/png?text=Screenshot+AI+Stock+Upload)

#### 3. Logistics & Order Management
-   **Find Nearest Kitchen:** Use GPS-based search to locate the closest SPPG Kitchen Hub to supply your ingredients.
-   **Incoming Orders:** Receive and accept purchase orders from SPPG directly in the app.
![Screenshot Incoming Orders](https://placehold.co/600x400/png?text=Screenshot+Incoming+Orders)

---

### 👨‍🍳 B. SPPG Admin Portal (Kitchen Hub)
Central command for managing MBG food supply chain, production, and safety.

#### 1. Command Center & Rescue Menu
-   **Global Stock View:** Monitor current available ingredients.
-   **Rescue Recommendations:** The system identifies near-expiry stock and automatically generates a **"Rescue Menu"** recommendation to utilize those specific ingredients, preventing food waste.
![Screenshot Kitchen Dashboard](https://placehold.co/600x400/png?text=Screenshot+Kitchen+Dashboard)

#### 2. Ingredient Sourcing (Geospatial)
-   **Smart Search:** Search nearest UMKM Vendors that sold the ingredient you need, sorted by distance and freshness.
![Screenshot Map Search](https://placehold.co/600x400/png?text=Screenshot+Map+And+Search)

#### 3. AI Chef Assistant Chatbot
-   **Interactive Assistant:** Chat with "AI Chef Assistant" to plan menus, check inventory, or get recipe ideas based on your current stock.
![Screenshot AI Chatbot](https://placehold.co/600x400/png?text=Screenshot+Kitchen+Chatbot)

#### 4. Quality Control (Computer Vision)
-   **Safety Scan:** Before serving, cooked meals are scanned using **Computer Vision**.
-   **Analysis:** The AI analyzes visual cues to estimate **Nutrition Content** (Calories/Protein) and verifies **Food Safety** status.
![Screenshot Food QC](https://placehold.co/600x400/png?text=Screenshot+Food+QC)

#### 5. Production & Smart Storage (IoT)
-   **Smart Execution:** One-click cooking that **auto-deducts inventory**, provides **Nutrition Estimates**, sets an **Expiry Timer**, and offers **Storage Tips**.
-   **Real-time IoT:** Monitors storage temperature/humidity using **Real ESP32 Sensors**.
-   *Note: If sensors are offline, the system falls back to simulated data for demonstration.*
![Screenshot Cooking - IoT](https://placehold.co/600x400/png?text=Screenshot+IoT+Cooking)

---

## 4. Folder Structure & File Responsibilities

```text
Bekal-bangsa/
├── backend/                     # FastAPI Backend
│   ├── main.py                 # Entry point. API endpoints.
│   ├── services/               # Business logic modules:
│   │   ├── vision.py          # AI Image Analysis (Claude Vision).
│   │   ├── kitchen.py         # Cooking, Menu Recs, Nutrition.
│   │   ├── logistics.py       # Geospatial Search & SPPG Matching.
│   │   ├── inventory.py       # Expiry Checks & Notifications.
│   │   ├── storage.py         # File Uploads to Supabase.
│   │   └── clients.py         # Shared Client Initialization.
│   ├── models.py              # Pydantic models (Request/Response).
│   ├── prompts.py             # AI Prompts for Claude Sonnet.
│   ├── iot_simulator.py       # IoT sensor data simulator.
│   ├── database.py            # Supabase client initialization.
│   └── requirements.txt       # Python dependencies.
│
├── frontend_next/              # Next.js Frontend (PRIMARY)
│   ├── app/                   # App Router (Next.js 15)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (Role Selector)
│   │   └── globals.css        # Global styles
│   ├── components/            # React Components
│   │   ├── kitchen/           # SPPG Kitchen UI
│   │   │   ├── kitchen-dashboard.tsx
│   │   │   ├── menu-recommendation.tsx
│   │   │   ├── scan-food-qc.tsx
│   │   │   ├── supplier-search-order.tsx
│   │   │   └── ...
│   │   ├── vendor/            # UMKM Vendor UI
│   │   │   ├── vendor-dashboard.tsx
│   │   │   ├── inventory-upload.tsx
│   │   │   ├── sppg-search.tsx
│   │   │   └── ...
│   │   ├── common/            # Shared components
│   │   ├── ui/                # shadcn/ui components (73 files)
│   │   └── shared/            # Utilities (error boundary, etc.)
│   ├── lib/                   # Helper functions
│   ├── hooks/                 # Custom React hooks
│   ├── next.config.mjs        # Next.js config (API proxy)
│   ├── tailwind.config.ts     # Tailwind CSS config
│   ├── package.json           # Node dependencies
│   └── tsconfig.json          # TypeScript config
│
├── frontend_streamlit/         # Streamlit Frontend (LEGACY)
│   ├── Home.py                # Landing page
│   └── pages/
│       ├── 1_upload.py        # Vendor: Upload & AI analysis
│       ├── 2_dashboard_sppg.py # Admin: Dashboard
│       ├── 3_pesanan_masuk.py  # Orders
│       └── 4_dapur_produksi.py # Production
│
├── BACKEND_ARCHITECTURE.md     # Backend technical docs
├── FRONTEND_ARCHITECTURE.md    # Frontend technical docs (Next.js)
└── README.md                   # This file
```

---

## 5. Implemented Features (Status Check)

### 🛒 For UMKM (Vendors)
-   **[✅ Functional] AI Inventory Scan:** Upload a photo, AI detects items, quantity, and freshness.
-   **[✅ Functional] GPS Location:** Auto-detects (simulated) or manual input of vendor location.
-   **[✅ Functional] Satellite Map:** View SPPG locations on an interactive map (Leaflet) with satellite imagery.
-   **[✅ Functional] Search Nearest SPPG:** Finds the closest Kitchen Hub based on GPS distance.
-   **[✅ Functional] Incoming Orders:** View and manage orders from the government (SPPG).
-   **[✅ Functional] Transaction History:** Dedicated page to track and manage order status (Pending, Confirmed, Completed).
-   **[✅ Functional] Real User Data:** Dashboard automatically personalizes content based on the logged-in vendor's profile and analytics.

### 👨‍🍳 For SPPG (Kitchen Admin)
-   **[✅ Functional] Smart Dashboard:** View available supplies from all vendors.
-   **[✅ Functional] Satellite Map:** View Supplier locations on an interactive map to plan logistics.
-   **[✅ Functional] AI Menu Recommendation:** Generates recipes based on expiring ingredients.
-   **[✅ Functional] Kitchen Production:**
    -   One-click "Cook" button.
    -   Auto-deducts stock from DB.
    -   **AI Nutrition Est:** Calculates Calories/Protein per serving.
    -   **AI Safety Check:** Estimates shelf-life.
-   **[✅ Functional] IoT Monitoring:** Real-time chart of storage temperature/humidity (Connected to physical ESP32 Sensor).
-   **[✅ Functional] Scan Food (QC):** Visual analysis of cooked meals for safety and nutrition verification.
-   **[✅ Functional] AI Chef Chatbot:** Interactive assistant ("Chef Juna") for menu planning and logistics questions, context-aware of current inventory.
-   **[✅ Functional] Notification System:**
    -   **Popover UI:** Centralized notification center with "wiggle" animation.
    -   **Rescue Menu:** Auto-suggested recipes for expiring items pinned at the top.
    -   **Expiry Alerts:** High-contrast warnings for critical stock.
-   **[✅ Functional] Transaction History:** Dedicated page to view past orders to UMKM.

---

## 6. Documentation

For in-depth technical guides:
- **Backend:** See [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md)
- **Frontend:** See [`FRONTEND_ARCHITECTURE.md`](./FRONTEND_ARCHITECTURE.md)

---

## 7. AI Logic Explanation

This function is the "Brain" of the intake process. It uses a **Single-Shot Prompting** strategy with Claude 4.5 Sonnet to perform three tasks simultaneously:

1.  **Object Detection & Counting:** It visually identifies items (e.g., "Tomatoes") and estimates quantity (e.g., "3 kg" or "10 pcs").
2.  **Quality Assessment:** It analyzes visual cues (color, texture) to determine freshness (e.g., "Fresh", "Wilting", "Rotten").
3.  **Expiry Prediction:** Based on the item type and visual state, it estimates `expiry_days` (e.g., "Spinach" + "Wilting" = 1 day left).

**How it works:**
-   The image is encoded in Base64.
-   Sent to Kolosal API with a strict system prompt: *"You are an expert food quality inspector..."*
-   The model is forced to output **ONLY JSON** (no markdown), ensuring the backend can parse it directly into Pydantic models without regex hacking.

---

