// Detect if user is on mobile device — require at least 2 of 3 signals to avoid
// false positives on touchscreen laptops and false negatives on tablets.
export function isMobile() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  )
  const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  const narrowViewport = window.innerWidth <= 900
  const score = (uaMatch ? 1 : 0) + (touchCapable ? 1 : 0) + (narrowViewport ? 1 : 0)
  return score >= 2
}

// Check if device has camera access
export function hasCamera() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

// Get current GPS position
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

// Format relative time
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Severity label and color
export function getSeverity(level) {
  const map = {
    1: { label: 'Low', color: 'text-txt2', bg: 'bg-border2' },
    2: { label: 'Minor', color: 'text-sky', bg: 'bg-sky/10' },
    3: { label: 'Moderate', color: 'text-amber', bg: 'bg-amber/10' },
    4: { label: 'High', color: 'text-urgent', bg: 'bg-urgent/10' },
    5: { label: 'Critical', color: 'text-urgent', bg: 'bg-urgent/15' },
  }
  return map[level] || map[1]
}

// Category config
export const CATEGORIES = {
  road: { label: 'Road Damage', icon: '🛣️', color: 'text-amber' },
  sanitation: { label: 'Sanitation', icon: '🚰', color: 'text-sky' },
  electrical: { label: 'Electrical', icon: '💡', color: 'text-lime' },
  water: { label: 'Water', icon: '💧', color: 'text-sky' },
  safety: { label: 'Safety', icon: '⚠️', color: 'text-urgent' },
  environmental: { label: 'Environment', icon: '🌿', color: 'text-mint' },
  other: { label: 'Other', icon: '📌', color: 'text-txt2' },
}
