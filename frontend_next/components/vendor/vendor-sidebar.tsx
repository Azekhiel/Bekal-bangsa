"use client"

import { Home, Camera, Package, History, Settings, X, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface VendorSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "upload", label: "Upload Stok", icon: Camera },
  { id: "orders", label: "Pesanan Masuk", icon: Package },
  { id: "sppg", label: "Cari SPPG", icon: MapPin },
  { id: "history", label: "Riwayat Transaksi", icon: History },
  { id: "settings", label: "Pengaturan", icon: Settings },
]

export default function VendorSidebar({ activeTab, onTabChange, isOpen, onClose }: VendorSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - SPPG Style (Full Match) */}
      <aside
        className={`fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/10 z-[60] transition-transform duration-300 lg:translate-x-0 cursor-default shadow-2xl ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">

          {/* HEADER - Strict Match with Kitchen Sidebar Dimensions */}
          <div className="p-6 border-b border-white/10 bg-white/5 relative">
            <div className="flex items-center gap-3">

              {/* LOGO - 64px - Matches Kitchen Exact */}
              <div className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
                <Image
                  src="/bekal_bangsa.png"
                  alt="Bekal Bangsa"
                  width={100}
                  height={100}
                  className="object-cover scale-110"
                  priority
                />
              </div>

              {/* TEXT - Compact & Tighter - Matches Kitchen Exact */}
              <div className="flex-1 -ml-1">
                <h2 className="text-lg font-bold text-white tracking-tight leading-none">Bekal Bangsa</h2>
                <p className="text-[10px] text-amber-400 font-bold tracking-wider uppercase mt-1">
                  UMKM Vendor Portal
                </p>
              </div>

            </div>

            {/* Close Button for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden absolute right-2 top-2 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigasi Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto w-full">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu Utama</div>

            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id)
                    onClose()
                  }}
                  variant="ghost"
                  className={`w-full justify-start gap-3 text-sm font-medium transition-all duration-300 relative overflow-hidden group ${isActive
                      ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] border border-amber-500/50"
                      : "bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${isActive
                        ? "text-white"
                        : "text-slate-500 group-hover:text-amber-400"
                      }`}
                  />
                  {item.label}
                  {isActive && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Footer Branding */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="text-center">
              <p className="text-xs font-medium text-amber-500/80">© 2025 Bekal Bangsa</p>
            </div>
          </div>

        </div>
      </aside>

      {/* Desktop sidebar placeholder */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
}