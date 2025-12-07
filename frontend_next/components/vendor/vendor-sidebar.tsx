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
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 w-64 h-[calc(100vh-64px)] bg-white border-r border-gray-100 shadow-sm overflow-y-auto transition-transform lg:translate-x-0 z-40 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* HEADER SIDEBAR: LOGO ONLY (CENTERED) */}
        <div className="relative h-16 flex items-center justify-center border-b border-gray-100">
          
          {/* Logo Image Container */}
          <div className="relative w-32 h-32">
             <Image 
               src="/bekal_bangsa.png" 
               alt="Bekal Bangsa" 
               fill
               className="object-contain"
               sizes="(max-width: 768px) 100vw, 128px"
               priority
             />
          </div>

          {/* Tombol Close Mobile (Absolute Position agar Logo tetap Center) */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="lg:hidden absolute right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigasi Menu */}
        <nav className="p-3 space-y-1">
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
                className={`w-full justify-start gap-3 px-3 py-2.5 relative transition-all duration-200 ${isActive
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-600 rounded-r-full" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                <span className="text-sm">{item.label}</span>
              </Button>
            )
          })}
        </nav>
      </aside>

      {/* Desktop sidebar placeholder */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
}