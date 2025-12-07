"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, UtensilsCrossed, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function RoleSelector() {
  const router = useRouter()

  const handleSelectRole = (role: "vendor" | "kitchen") => {
    router.push(`/login?role=${role}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#37775f] via-[#1f4d40] to-[#0f2c24] p-4 relative overflow-hidden">

      {/* Soft Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[35%] h-[35%] bg-emerald-400/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[35%] h-[35%] bg-teal-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-6xl space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex items-center justify-center gap-3 mb-6">

            {/* LOGO */}
            <div className="relative w-14 h-14 mr-[-60] p-30 rounded-2xl overflow-hidden backdrop-blur-sm">
              <Image
                src="/bekal_bangsa.png"
                alt="Logo Bekal Bangsa"
                fill
                style={{ objectFit: "contain" }}
                sizes="80px"
                className="w-32 h-32 object-contain drop-shadow-[0_0_2px_rgba(255,255,255,1)]"
              />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200 tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
              Bekal Bangsa
            </h1>
          </div>

          <div className="space-y-2">
            <p className="text-xl md:text-2xl text-emerald-100 font-light tracking-wide">
              Dari UMKM, untuk <span className="font-semibold text-white">Bekal Nasional</span>
            </p>

            <p className="text-white/90 text-sm md:text-base font-mono uppercase tracking-widest">
              Platform AI Inklusif untuk Menjamin Keamanan Pangan & Pemberdayaan UMKM dalam Program Makan Bergizi Gratis
            </p>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 px-4">

          {/* Vendor Card */}
          <div className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150" onClick={() => handleSelectRole("vendor")}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>

            <Card className="relative h-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-amber-500/50 transition-all duration-500 cursor-pointer overflow-hidden rounded-3xl">
              <CardHeader className="text-center pb-8 pt-10 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShoppingCart className="w-32 h-32 text-amber-500" />
                </div>

                <div className="flex justify-center mb-6">
                  <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-6 rounded-2xl border border-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]">
                    <ShoppingCart className="w-12 h-12 text-amber-400" />
                  </div>
                </div>

                <CardTitle className="text-3xl text-white font-bold tracking-tight">Vendor UMKM</CardTitle>
                <CardDescription className="text-amber-200/80 text-lg mt-2 font-medium">
                  Jual & Donasikan Stok Pangan
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 pb-10">
                <ul className="space-y-4 px-4">
                  {[
                    "Scan foto bahan dengan AI",
                    "Deteksi lokasi GPS otomatis",
                    "Cari Kitchen Hub terdekat",
                    "Pantau pesanan real-time"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 items-center text-emerald-50/80 group/item">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 group-hover/item:bg-amber-500 group-hover/item:text-black transition-colors">
                        <span className="text-xs font-bold">✓</span>
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-7 text-lg rounded-xl shadow-lg shadow-orange-900/20 group-hover:shadow-orange-500/40 transition-all duration-300">
                  Masuk Sebagai Vendor <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Kitchen Card */}
          <div className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300" onClick={() => handleSelectRole("kitchen")}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>

            <Card className="relative h-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-emerald-500/50 transition-all duration-500 cursor-pointer overflow-hidden rounded-3xl">
              <CardHeader className="text-center pb-8 pt-10 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <UtensilsCrossed className="w-32 h-32 text-emerald-500" />
                </div>

                <div className="flex justify-center mb-6">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-6 rounded-2xl border border-emerald-500/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                    <UtensilsCrossed className="w-12 h-12 text-emerald-400" />
                  </div>
                </div>

                <CardTitle className="text-3xl text-white font-bold tracking-tight">Admin Dapur SPPG</CardTitle>
                <CardDescription className="text-emerald-200/80 text-lg mt-2 font-medium">
                  Kelola Produksi & Distribusi
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8 pb-10">
                <ul className="space-y-4 px-4">
                  {[
                    "Dashboard stok terpusat",
                    "Rekomendasi menu AI",
                    "Kalkulasi nutrisi otomatis",
                    "Monitoring IoT Smart Storage"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 items-center text-emerald-50/80 group/item">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover/item:bg-emerald-500 group-hover/item:text-black transition-colors">
                        <span className="text-xs font-bold">✓</span>
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-7 text-lg rounded-xl shadow-lg shadow-emerald-900/20 group-hover:shadow-emerald-500/40 transition-all duration-300">
                  Masuk Sebagai Admin <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-emerald-300/40 text-sm animate-in fade-in duration-1000 delay-500">
          <p>© 2025 Bekal Bangsa.</p>
        </div>
      </div>
    </div>
  )
}
