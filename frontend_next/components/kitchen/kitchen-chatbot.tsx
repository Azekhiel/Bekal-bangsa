"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, User, Send, Mic, Volume2, StopCircle, Loader2, ChefHat, Sparkles } from "lucide-react"

interface Message {
  id: number
  role: "user" | "ai"
  text: string
}

export default function KitchenChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ai",
      text: "Halo Chef! 👋 Saya Asisten Dapur AI.\nSaya punya akses ke data stok dan resep. Mau masak apa hari ini?"
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Suggested Prompts
  const suggestions = [
    "Rekomendasi menu hari ini",
    "Stok apa yang mau habis?",
    "Ide masakan ayam",
    "Buatkan resep nasi goreng"
  ]

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // --- Speech to Text ---
  const startRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'id-ID'
      recognition.interimResults = false

      recognition.onstart = () => setIsRecording(true)

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
      }

      recognition.onend = () => setIsRecording(false)
      recognition.start()
    } else {
      alert("Browser Anda tidak mendukung fitur suara.")
    }
  }

  // --- Text to Speech ---
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'id-ID'
      utterance.rate = 1.0
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return

    const newUserMsg: Message = { id: Date.now(), role: "user", text }
    setMessages(prev => [...prev, newUserMsg])
    setInput("")
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/kitchen/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      })

      const data = await res.json()

      const cleanMarkdown = (txt: string) => {
        return txt
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/###\s*/g, '')
          .replace(/##\s*/g, '')
          .replace(/#\s*/g, '')
          .replace(/`([^`]+)`/g, '$1')
          .trim()
      }

      const aiReply = data.reply || "Maaf, saya sedang gangguan."
      const newAiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: cleanMarkdown(aiReply)
      }
      setMessages(prev => [...prev, newAiMsg])

    } catch (error) {
      console.error("Chat error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[600px] lg:h-full bg-slate-50 relative rounded-2xl overflow-hidden shadow-sm border border-slate-200">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
          <Bot className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm md:text-base">Chef Assistant AI</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Online & Ready
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 mt-10">
            <ChefHat className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">Belum ada percakapan.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${msg.role === "user" ? "bg-slate-800" : "bg-emerald-600"
              }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-3 text-sm shadow-sm leading-relaxed ${msg.role === "user"
                  ? "bg-slate-800 text-white rounded-2xl rounded-tr-sm"
                  : "bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm"
                }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Actions for AI message */}
              {msg.role === "ai" && (
                <button
                  onClick={() => speakText(msg.text)}
                  className="mt-1 ml-1 text-[10px] text-slate-400 font-medium flex items-center gap-1 hover:text-emerald-600 transition-colors"
                >
                  {isSpeaking ? <StopCircle className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  {isSpeaking ? "Berhenti" : "Dengar"}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="bg-white p-3 md:p-4 border-t border-slate-100 sticky bottom-0 z-20">
        {/* Suggestions Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 hover:bg-emerald-100 transition-colors shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            className={`rounded-full w-9 h-9 shrink-0 ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Mic className="w-5 h-5" />
          </Button>

          <input
            className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-slate-700 placeholder:text-slate-400 h-9"
            placeholder={isRecording ? "Mendengarkan..." : "Ketik pesan..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
            className="rounded-full w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </Button>
        </div>
        <p className="text-[10px] text-center text-slate-300 mt-2">
          AI dapat melakukan kesalahan. Cek kembali informasi penting.
        </p>
      </div>
    </div>
  )
}