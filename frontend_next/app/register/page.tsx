"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Leaf, Loader2 } from "lucide-react"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import Image from "next/image" // <<-- added import

// --- KOMPONEN FORM REGISTER ---
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Ambil role dari URL, default 'vendor'
  const roleParam = searchParams.get("role") || "vendor"

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: roleParam, // Set awal sesuai URL
    address: "",
    phone_number: ""
  })

  // Update formData jika URL berubah
  useEffect(() => {
    setFormData(prev => ({ ...prev, role: roleParam }))
  }, [roleParam])

  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  // --- Fungsi Shared: Simpan Token & Redirect ---
  const handleAuthSuccess = (data: any) => {
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.user))
    
    // Redirect ke Root, nanti page.tsx yang arahkan ke Dashboard
    router.push("/")
    router.refresh()
  }

  // --- Handler Register Manual ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.detail || "Gagal mendaftar")
      }

      handleAuthSuccess(data)

    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- Handler Google Register ---
  // (Sama dengan login, backend akan auto-register jika user baru)
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            token: credentialResponse.credential,
            role: formData.role // PENTING: Kirim role yang sedang dipilih di form
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.detail || "Gagal daftar dengan Google")
      }
      
      handleAuthSuccess(data)

    } catch (error: any) {
      console.error("Google Register Error:", error)
      alert("Gagal daftar dengan Google: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Card className="w-full max-w-lg shadow-xl border-emerald-100 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            {/* --- LOGO: ganti Leaf dengan Image --- */}
            <div className="rounded-full bg-white p-[1.5px] shadow-[0_0_12px_rgba(255,255,255,0.9)]">
              <Image
                src="/bekal_bangsa.png"
                alt="Logo"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-emerald-900">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription>
            Bergabung dengan ekosistem Bekal Bangsa
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input 
                  required 
                  placeholder="Contoh: Budi Santoso"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input 
                  required 
                  placeholder="user_budi"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input 
                type="email" 
                required 
                placeholder="budi@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input 
                  type="password" 
                  required 
                  placeholder="******"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">No. Telepon</label>
                <Input 
                  placeholder="0812..."
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Daftar Sebagai</label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">UMKM / Pedagang (Vendor)</SelectItem>
                  <SelectItem value="kitchen">Admin Dapur / SPPG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "vendor" && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Alamat Pasar / Lokasi</label>
                    <Input 
                      placeholder="Pasar Tanah Abang Blok A..." 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    />
                </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-2" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Daftar Sekarang"}
            </Button>
          </form>

          {/* Google Sign Up */}
          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Atau daftar cepat</span></div>
            </div>
            
            <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log('Register Failed')}
                  text="signup_with"
                  width="100%"
                  locale="id"
                />
            </div>
          </div>

        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun? <Link href={`/login?role=${formData.role}`} className="text-emerald-600 font-bold hover:underline">Masuk</Link>
          </p>
        </CardFooter>
      </Card>
    </GoogleOAuthProvider>
  )
}

// --- MAIN PAGE WRAPPER ---
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-emerald-700 font-medium">Memuat form pendaftaran...</p>
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
