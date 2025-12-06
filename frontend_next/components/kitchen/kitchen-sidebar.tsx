"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Search, ChefHat, Thermometer, Camera, LogOut, Menu, X, MessageSquare, Leaf, ShoppingBag } from "lucide-react"

interface KitchenSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
}

export default function KitchenSidebar({ activeTab, onTabChange, onLogout }: KitchenSidebarProps) {
  const [open, setOpen] = useState(false)

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "AI Chef Assistant", icon: MessageSquare }, // <-- Tambah ini
    { id: "search", label: "Cari Supplier", icon: Search },
    { id: "cook", label: "Dapur & Produksi", icon: ChefHat },
    { id: "iot", label: "Smart Storage", icon: Thermometer },
    { id: "qc", label: "Quality Control", icon: Camera },
    { id: "history", label: "Riwayat Transaksi", icon: ShoppingBag },
  ]

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40 bg-white/80 backdrop-blur-md border border-border shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white border-r border-white/10 z-30 transition-transform duration-300 lg:translate-x-0 shadow-2xl ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Bekal Bangsa</h2>
                <p className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">SPPG Control Center</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu Utama</div>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id)
                    setOpen(false)
                  }}
                  className={`w-full justify-start gap-3 text-sm font-medium transition-all duration-300 relative overflow-hidden group ${isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] border border-emerald-500/50"
                    : "bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-emerald-400"}`} />
                  {item.label}
                  {isActive && (
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-400 shadow-[0_0_10px_#34d399]"></div>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <Button
              onClick={onLogout}
              className="w-full justify-start gap-3 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  )
}
