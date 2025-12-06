"use client"

import { useState, useEffect } from "react"
import VendorNavbar from "./vendor-navbar"
import VendorSidebar from "./vendor-sidebar"
import ConnectionStatus from "./connection-status"
import InventoryHealth from "./inventory-health"
import QuickInsights from "./quick-insights"
import InventoryList from "@/components/common/inventory-list"
import InventoryUpload from "./inventory-upload"
import OrderList from "./order-list"
import SppgSearch from "./sppg-search"
import VendorOrderHistory from "./vendor-order-history"

interface VendorDashboardProps {
  onLogout: () => void
}

export default function VendorDashboard({ onLogout }: VendorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "orders" | "sppg" | "history" | "settings">("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)

  // State untuk menyimpan data user yang sedang login
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // 1. Ambil Data User dari LocalStorage
    const userData = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        console.error("Gagal parsing data user:", e)
      }
    }

    // 2. Fetch Analytics (Dengan Token)
    const fetchAnalytics = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const response = await fetch("/api/analytics/vendor", { headers })

        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        } else {
          console.error("Gagal mengambil data analytics vendor")
        }
      } catch (error) {
        console.error("Error fetching vendor analytics:", error)
      }
    }

    fetchAnalytics()
  }, [])

  // Fungsi untuk merender konten berdasarkan tab yang aktif
  const renderContent = () => {
    switch (activeTab) {
      case "upload":
        return <InventoryUpload />
      case "orders":
        return <OrderList />
      case "sppg":
        return <SppgSearch />
      case "history":
        return <VendorOrderHistory />
      case "settings":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-muted-foreground">
            <p>Pengaturan akun akan segera tersedia.</p>
          </div>
        )
      case "dashboard":
      default:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Widget Status Koneksi & Lokasi */}
            <ConnectionStatus location={user?.address || "Lokasi Belum Diatur"} />

            {/* Statistik Ringkas */}
            <InventoryHealth data={analytics?.inventory_health} />

            {/* Grafik Analisis */}
            <QuickInsights data={analytics} />

            {/* Tabel Inventaris (List Produk) */}
            <InventoryList role="vendor" />
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <VendorSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab as any}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <VendorNavbar
          vendorName={user?.full_name || "Mitra Vendor"}
          onLogout={onLogout}
          onMenuToggle={setSidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 bg-stone-50 min-h-[calc(100vh-64px)]">
          <div className="w-full px-6 py-8">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}