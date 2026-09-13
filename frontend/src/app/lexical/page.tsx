'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LexicalClipboardModal from '@/components/dashboard/LexicalClipboardModal'

export default function LexicalPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth')
      return
    }
    setAuthenticated(true)
  }, [router])

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#1a0000] flex items-center justify-center font-mono text-[#D4B896] text-sm">
        Authenticating Case Clearance...
      </div>
    )
  }

  return (
    <div
      className="min-h-screen p-6 flex flex-col items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse 35% 80% at 0% 70%, #6a1010 0%, transparent 100%),
          radial-gradient(ellipse 35% 80% at 100% 70%, #6a1010 0%, transparent 100%),
          radial-gradient(ellipse 100% 35% at 50% 100%, #6a1010 0%, transparent 100%),
          radial-gradient(ellipse 60% 60% at 50% 50%, #5a1010 0%, transparent 70%),
          #1a0000
        `.replace(/\s+/g, ' '),
      }}>
      <LexicalClipboardModal
        isOpen={true}
        onClose={() => router.push('/dashboard')}
      />
    </div>
  )
}
