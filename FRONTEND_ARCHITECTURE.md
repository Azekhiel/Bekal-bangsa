# Frontend Next.js Architecture Guide

**Last Updated:** December 2, 2025  
**Version:** Next.js 15 with App Router

---

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [Key Features by Role](#key-features-by-role)
6. [State Management & Data Flow](#state-management--data-flow)
7. [Styling System](#styling-system)
8. [API Integration](#api-integration)
9. [Development Workflow](#development-workflow)

---

## Overview

The `frontend_next` folder contains a modern Next.js application that serves as the user interface for **Bekal Bangsa**. It provides separate dashboards for **UMKM Vendors** and **SPPG Kitchen Admins**, featuring AI-powered inventory management, menu recommendations, and quality control.

### Why Next.js?
- **Server-Side Rendering (SSR)**: Better SEO and initial page load performance
- **File-based Routing**: Automatic routing based on folder structure
- **Modern React**: Uses latest React features with TypeScript support
- **Production-Ready**: Built-in optimization and deployment features

---

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 15 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Pre-built accessible components |
| **Charts** | Recharts | Data visualization |
| **Icons** | Lucide React | Modern icon library |
| **Forms** | React Hook Form | Form validation |
| **HTTP Client** | Fetch API | API communication |

---

## Project Structure

```
frontend_next/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles & Tailwind imports
│   ├── layout.tsx               # Root layout (HTML wrapper)
│   └── page.tsx                 # Home page (Role Selector)
│
├── components/                   # React Components
│   ├── common/                  # Shared components
│   │   └── inventory-list.tsx   # Reusable inventory table
│   │
│   ├── kitchen/                 # SPPG Kitchen components
│   │   ├── kitchen-dashboard.tsx           # Main container
│   │   ├── kitchen-dashboard-overview.tsx  # Dashboard home
│   │   ├── kitchen-location.tsx            # GPS location widget
│   │   ├── expiry-alerts.tsx               # Expiry notifications
│   │   ├── menu-recommendation.tsx         # AI menu generator
│   │   ├── scan-food-qc.tsx               # Food quality scanner
│   │   ├── supplier-search-order.tsx       # Search & order supplies
│   │   ├── cooking-production.tsx          # Production tracking
│   │   ├── iot-monitoring.tsx             # Sensor dashboard
│   │   └── kitchen-sidebar.tsx            # Navigation sidebar
│   │
│   ├── vendor/                  # UMKM Vendor components
│   │   ├── vendor-dashboard.tsx           # Main container
│   │   ├── connection-status.tsx          # SPPG connection info
│   │   ├── inventory-upload.tsx           # AI photo upload
│   │   ├── inventory-health.tsx           # Stock status cards
│   │   ├── sppg-search.tsx               # Find nearest SPPG
│   │   ├── order-list.tsx                # Incoming orders
│   │   ├── quick-insights.tsx            # Analytics charts
│   │   └── vendor-sidebar.tsx            # Navigation sidebar
│   │
│   ├── shared/                  # Reusable utilities
│   │   ├── error-boundary.tsx   # Error handling wrapper
│   │   └── loading-spinner.tsx  # Loading state
│   │
│   ├── ui/                      # shadcn/ui components (73 files)
│   │   ├── button.tsx           # Button variants
│   │   ├── card.tsx             # Card layouts
│   │   ├── input.tsx            # Form inputs
│   │   ├── dialog.tsx           # Modal dialogs
│   │   ├── alert.tsx            # Alert notifications
│   │   ├── chart.tsx            # Recharts wrapper
│   │   └── ...                  # 67+ more UI primitives
│   │
│   ├── role-selector.tsx        # Landing page role picker
│   └── theme-provider.tsx       # Dark/Light mode provider
│
├── hooks/                       # Custom React hooks
│   ├── use-location.ts         # Geolocation hook
│   ├── use-mobile.ts           # Responsive detection
│   └── use-toast.ts            # Toast notifications
│
├── lib/                        # Utilities
│   ├── api.ts                  # API helper functions
│   └── utils.ts                # Tailwind class merger (cn)
│
├── public/                     # Static assets
│   ├── icon.svg               # Favicon
│   └── placeholder.*          # Placeholder images
│
├── styles/                    # Additional styles
│   └── globals.css           # Duplicate of app/globals.css
│
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies
└── components.json          # shadcn/ui config

```

---

## Component Architecture

### Design Pattern: Feature-Based Organization
Components are organized by **user role** (kitchen/vendor) and **shared components** (common/ui).

### Example: Kitchen Dashboard Flow

```
kitchen-dashboard.tsx (Container)
  ├── kitchen-sidebar.tsx (Navigation)
  │   └── Tabs: Dashboard, Menu, Scan, Orders, IoT
  │
  └── Content Area (Based on active tab)
      ├── kitchen-dashboard-overview.tsx
      │   ├── kitchen-location.tsx (GPS widget)
      │   ├── expiry-alerts.tsx (Notifications)
      │   ├── menu-recommendation.tsx (AI feature)
      │   └── inventory-list.tsx (Shared table)
      │
      ├── scan-food-qc.tsx (Camera/Upload)
      ├── supplier-search-order.tsx (Search)
      └── iot-monitoring.tsx (Charts)
```

### Component Naming Convention
- **Containers**: `[role]-dashboard.tsx` (e.g., `kitchen-dashboard.tsx`)
- **Features**: `[feature]-[function].tsx` (e.g., `menu-recommendation.tsx`)
- **Shared**: `[entity]-list.tsx` (e.g., `inventory-list.tsx`)
- **UI Primitives**: `[component].tsx` (e.g., `button.tsx`)

---

## Key Features by Role

### 🧑‍🍳 SPPG Kitchen Admin

| Component | Feature | AI/Tech Used |
|-----------|---------|--------------|
| `kitchen-location.tsx` | GPS location tracking | Geolocation API |
| `expiry-alerts.tsx` | Expiry notifications | `/api/notifications/trigger` |
| `menu-recommendation.tsx` | AI menu generator | `/api/recommend-menu` (Claude) |
| `scan-food-qc.tsx` | Food QC scanner | `/api/kitchen/scan-food` (Vision AI) |
| `supplier-search-order.tsx` | Search nearby supplies | `/api/suppliers/search` (Geospatial) |
| `iot-monitoring.tsx` | Temperature/humidity charts | `/api/iot` (Real-time data) |
| `cooking-production.tsx` | Production tracking | `/api/kitchen/cook` |

### 🛒 UMKM Vendor

| Component | Feature | AI/Tech Used |
|-----------|---------|--------------|
| `inventory-upload.tsx` | AI photo analysis | `/api/analyze` (Vision AI) |
| `sppg-search.tsx` | Find nearest SPPG | `/api/sppg/search` (Geospatial) |
| `order-list.tsx` | Incoming orders | `/api/orders` |
| `inventory-health.tsx` | Stock status dashboard | `/api/analytics/vendor` |
| `quick-insights.tsx` | Sales & expiry charts | Recharts visualization |

---

## State Management & Data Flow

### State Management Strategy
This app uses **local component state** (useState) + **data fetching** (useEffect + fetch). No global state library (Redux/Zustand) is needed.

### Data Flow Pattern

```
User Action → Frontend Component → API Call → FastAPI Backend → Supabase DB
                    ↑                                                  ↓
                    └──────────── Response ←──────────← JSON Response ←┘
```

### Example: AI Menu Recommendation

```typescript
// frontend_next/components/kitchen/menu-recommendation.tsx

const [ingredients, setIngredients] = useState<string[]>([])
const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([])

const handleGetRecommendations = async () => {
  const response = await fetch("/api/recommend-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  })
  const data = await response.json()
  setRecommendations(data.recommendations)
}
```

**Backend Route:** `POST /api/recommend-menu` → `kitchen.py:recommend_menu()`

---

## Styling System

### Tailwind CSS + shadcn/ui

The app uses **utility-first CSS** with Tailwind. All styling is done inline:

```tsx
<Card className="border-0 shadow-md overflow-hidden">
  <CardHeader className="bg-gradient-to-r from-primary/10 to-emerald-50">
    <CardTitle>Dashboard</CardTitle>
  </CardHeader>
</Card>
```

### Theme Configuration

**File:** `tailwind.config.ts`

```typescript
colors: {
  primary: "hsl(142, 76%, 36%)",    // Emerald green
  secondary: "hsl(43, 96%, 56%)",   // Amber/Yellow
  destructive: "hsl(0, 84%, 60%)",  // Red
}
```

### Responsive Design
- **Mobile-First**: All components use `sm:`, `md:`, `lg:` breakpoints
- **Grid Layouts**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

---

## API Integration

### API Proxy Configuration

**File:** `next.config.mjs`

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://127.0.0.1:8000/api/:path*', // FastAPI backend
    },
  ]
}
```

This allows frontend to call `/api/analyze` which proxies to `http://127.0.0.1:8000/api/analyze`.

### API Endpoints Used

| Frontend Component | Backend Endpoint | Method | Purpose |
|--------------------|------------------|--------|---------|
| `inventory-upload.tsx` | `/api/analyze` | POST | AI inventory scan |
| `inventory-upload.tsx` | `/api/upload` | POST | Image upload to Supabase |
| `menu-recommendation.tsx` | `/api/recommend-menu` | POST | AI menu generation |
| `scan-food-qc.tsx` | `/api/kitchen/scan-food` | POST | Cooked meal QC |
| `supplier-search-order.tsx` | `/api/suppliers/search` | GET | Search supplies |
| `sppg-search.tsx` | `/api/sppg/search` | GET | Find nearest SPPG |
| `expiry-alerts.tsx` | `/api/notifications/trigger` | POST | Get expiry alerts |
| `iot-monitoring.tsx` | `/api/iot` | GET | IoT sensor data |
| `order-list.tsx` | `/api/orders` | GET/POST | Order management |

---

## Development Workflow

### 1. Install Dependencies
```bash
cd frontend_next
npm install
```

### 2. Run Development Server
```bash
npm run dev
# App runs at http://localhost:3000
```

### 3. Build for Production
```bash
npm run build
npm start
```

### 4. Code Structure Guidelines

#### Creating a New Feature Component

**Steps:**
1. Create file in appropriate folder (`components/kitchen/` or `components/vendor/`)
2. Import UI components from `@/components/ui/`
3. Use TypeScript interfaces for props
4. Follow naming convention: `feature-description.tsx`

**Example:**
```typescript
// components/kitchen/new-feature.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface NewFeatureProps {
  userId: string
}

export default function NewFeature({ userId }: NewFeatureProps) {
  const [data, setData] = useState(null)

  const handleFetch = async () => {
    const response = await fetch(`/api/some-endpoint`)
    const result = await response.json()
    setData(result)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Feature</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleFetch}>Fetch Data</Button>
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </CardContent>
    </Card>
  )
}
```

#### Integrating with Backend

1. **Ensure Backend Endpoint Exists:**
   - Check `backend/main.py` for route definition
   - Example: `@app.post("/api/some-endpoint")`

2. **Frontend API Call:**
   ```typescript
   const response = await fetch("/api/some-endpoint", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ param: "value" }),
   })
   const data = await response.json()
   ```

3. **Error Handling:**
   ```typescript
   try {
     const response = await fetch("/api/endpoint")
     if (!response.ok) {
       throw new Error("API Error")
     }
     const data = await response.json()
   } catch (error) {
     console.error("Error:", error)
     alert("Failed to fetch data")
   }
   ```

---

## Common Patterns & Examples

### Pattern 1: Camera/Upload Functionality
**Components:** `scan-food-qc.tsx`, `inventory-upload.tsx`

```typescript
const [photo, setPhoto] = useState<string | null>(null)
const videoRef = useRef<HTMLVideoElement>(null)

const capturePhoto = () => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.drawImage(videoRef.current, 0, 0)
  const photoData = canvas.toDataURL('image/jpeg')
  setPhoto(photoData)
}
```

### Pattern 2: Geolocation
**Components:** `kitchen-location.tsx`, `sppg-search.tsx`

```typescript
const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

const getLocation = () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      })
    },
    (error) => {
      // Fallback to default (Monas, Jakarta)
      setLocation({ lat: -6.175392, lon: 106.827153 })
    }
  )
}
```

### Pattern 3: Real-time Charts
**Component:** `iot-monitoring.tsx`

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={sensorData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="timestamp" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
```

---

## Troubleshooting

### Issue: API Calls Failing (404)
**Solution:** Ensure FastAPI backend is running on `http://127.0.0.1:8000`
```bash
cd backend
uvicorn main:app --reload
```

### Issue: TypeScript Errors
**Solution:** Check `tsconfig.json` and ensure all imports use `@/` alias:
```typescript
import { Button } from "@/components/ui/button"  // ✅ Correct
import { Button } from "../ui/button"            // ❌ Avoid
```

### Issue: Tailwind Styles Not Working
**Solution:** Ensure `globals.css` is imported in `app/layout.tsx`:
```typescript
import './globals.css'
```

### Issue: Camera Not Working
**Solution:** Camera API requires HTTPS in production. For local dev, use `http://localhost:3000` (allowed).

---

## Next Steps for Contributors

1. **Read this documentation** to understand the structure
2. **Explore `components/`** to see existing patterns
3. **Check `backend/main.py`** for available API endpoints
4. **Use shadcn/ui components** for consistency
5. **Follow TypeScript** for type safety
6. **Test on mobile** (responsive design is critical)

For backend documentation, see [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md).
