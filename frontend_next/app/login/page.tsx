"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import Image from "next/image" // <--- Import Image

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") || "vendor"
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ username_or_email: "", password: "" })
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  const handleAuthSuccess = (data: any) => {
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.user))
    router.push("/")
    router.refresh()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Gagal login")
      handleAuthSuccess(data)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credentialResponse.credential,
          role: roleParam
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Gagal login dengan Google")
      handleAuthSuccess(data)
    } catch (error: any) {
      console.error("Google Login Error:", error)
      alert("Gagal login dengan Google: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Card className="w-full max-w-md shadow-xl border-emerald-100 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            {/* --- GANTI LOGO DISINI --- */}
            <div className="p-[1px] rounded-full bg-white border border-emerald-100 shadow-sm">
              <Image
                src="/bekal_bangsa.png"
                alt="Logo"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            {/* ------------------------- */}
          </div>
          <CardTitle className="text-2xl font-bold text-emerald-900">
            Masuk Sebagai {roleParam === 'vendor' ? 'UMKM Vendor' : 'Admin Dapur SPPG'}
          </CardTitle>
          <CardDescription>
            Kelola pangan lokal untuk masa depan
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Demo Credentials Box - Role Specific */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${roleParam === 'vendor' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="text-xs font-semibold text-gray-700 mb-2">🔑 Akun Demo:</p>
            {roleParam === 'vendor' ? (
              <div className="space-y-1 text-xs text-gray-600">
                <p>👤 <span className="font-mono bg-white px-2 py-0.5 rounded">Username: pak_asep</span> • <span className="font-mono bg-white px-2 py-0.5 rounded">Password: 123456</span></p>
                <p>👤 <span className="font-mono bg-white px-2 py-0.5 rounded">Username: bu_sari</span> • <span className="font-mono bg-white px-2 py-0.5 rounded">Password: 123456</span></p>
                <p className="text-amber-700 font-medium mt-2">✨ Kelola stok pangan & terima pesanan dari SPPG</p>
              </div>
            ) : (
              <div className="space-y-1 text-xs text-gray-600">
                <p>👤 <span className="font-mono bg-white px-2 py-0.5 rounded">Username: sppg_pusat</span> • <span className="font-mono bg-white px-2 py-0.5 rounded">Password: 123456</span></p>
                <p>👤 <span className="font-mono bg-white px-2 py-0.5 rounded">Username: sppg_selatan</span> • <span className="font-mono bg-white px-2 py-0.5 rounded">Password: 123456</span></p>
                <p className="text-emerald-700 font-medium mt-2">✨ Pantau produksi, kelola menu & monitoring IoT</p>
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email atau Username</label>
              <Input
                placeholder={roleParam === 'vendor' ? 'Contoh: pak_asep atau bu_sari' : 'Contoh: sppg_pusat atau sppg_selatan'}
                value={formData.username_or_email}
                onChange={(e) => setFormData({ ...formData, username_or_email: e.target.value })}
                required
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                placeholder="Masukkan password (demo: 123456)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-gray-50"
              />
            </div>
            <Button
              type="submit"
              className={`w-full ${roleParam === 'vendor' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-semibold py-5`}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Masuk Sekarang"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Atau masuk dengan</span></div>
            </div>
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Login Failed')}
                theme="outline"
                size="large"
                text="signin_with"
                width="100%"
                locale="id"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center flex-col gap-4 pb-8">
          <p className="text-sm text-gray-600">
            Belum punya akun? <Link href={`/register?role=${roleParam}`} className="text-emerald-600 font-bold hover:underline">Daftar di sini</Link>
          </p>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
            ← Kembali ke Halaman Depan
          </Link>
        </CardFooter>
      </Card>
    </GoogleOAuthProvider>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-emerald-600" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}