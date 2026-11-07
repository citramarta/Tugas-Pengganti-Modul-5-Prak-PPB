import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

// Link unik per produk: https://domain-kamu/?gun=<id>
function buildShareUrl(gunId) {
  return `${window.location.origin}/?gun=${encodeURIComponent(gunId)}`
}

export default function ShareButton({ gun, variant = 'icon' }) {
  const [copied, setCopied] = useState(false)

  // Produk lokal (fallback) belum punya ID server, jadi tidak bisa dibagikan
  if (!gun?.id || String(gun.id).startsWith('local-')) return null

  const handleShare = async (e) => {
    e.stopPropagation() // jangan ikut membuka detail card
    const url = buildShareUrl(gun.id)

    // 1) Web Share API (umumnya HP)
    if (navigator.share) {
      try {
        await navigator.share({
          title: gun.name,
          text: `Lihat ${gun.name} di Bore & Barrel`,
          url,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return // user menutup share sheet
      }
    }

    // 2) Fallback: salin ke clipboard (desktop)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 3) Fallback terakhir: tampilkan link supaya bisa disalin manual
      window.prompt('Salin link produk:', url)
    }
  }

  const Icon = copied ? Check : Share2

  if (variant === 'button') {
    return (
      <button type="button" className="btn btn--outline" onClick={handleShare}>
        <Icon size={16} /> {copied ? 'Link tersalin' : 'Share'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="card-act-btn"
      onClick={handleShare}
      aria-label={`Share ${gun.name}`}
      title={copied ? 'Link tersalin' : 'Share link'}
    >
      <Icon size={14} />
    </button>
  )
}
