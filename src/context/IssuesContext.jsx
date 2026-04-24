import { createContext, useContext, useState, useEffect } from 'react'

const IssuesContext = createContext(null)

// Seed data for demo
const SEED_ISSUES = [
  {
    id: 'ISS-001',
    title: 'Open Manhole — Bahadurabad',
    description: 'Uncovered manhole on main road near Bahadurabad chowrangi. Extremely dangerous at night with no street lighting.',
    category: 'safety',
    severity: 5,
    tags: ['manhole', 'safety', 'road'],
    lat: 24.8741,
    lng: 67.0601,
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Ahmed K.',
    anonymous: false,
    status: 'active',
    tokensPledged: 890,
    tokensGoal: 1000,
    createdAt: Date.now() - 86400000 * 2,
    proofs: [
      {
        id: 'PRF-001',
        type: 'image',
        url: 'https://picsum.photos/seed/manhole1/400/300',
        addedBy: 'Ahmed K.',
        addedAt: Date.now() - 86400000 * 2,
        caption: 'Wide shot showing location at night',
      },
      {
        id: 'PRF-002',
        type: 'image',
        url: 'https://picsum.photos/seed/manhole2/400/300',
        addedBy: 'Rabia N.',
        addedAt: Date.now() - 86400000 * 1,
        caption: 'Close-up of the open manhole',
      },
    ],
  },
  {
    id: 'ISS-002',
    title: 'Broken Streetlight — PECHS Block 2',
    description: 'Three streetlights not working on the main boulevard. Area is completely dark after 7 PM.',
    category: 'electrical',
    severity: 3,
    tags: ['streetlight', 'electrical', 'dark'],
    lat: 24.8590,
    lng: 67.0718,
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Fatima A.',
    anonymous: false,
    status: 'active',
    tokensPledged: 740,
    tokensGoal: 1000,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'ISS-003',
    title: 'Storm Drain Blockage — Gulshan',
    description: 'Storm drain completely blocked causing flooding during light rain. Water accumulates knee-deep.',
    category: 'sanitation',
    severity: 4,
    tags: ['drain', 'flooding', 'water', 'sanitation'],
    lat: 24.9203,
    lng: 67.1124,
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Zain S.',
    anonymous: false,
    status: 'funded',
    tokensPledged: 1000,
    tokensGoal: 1000,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'ISS-004',
    title: 'Road Crack — Clifton Block 4',
    description: 'Large crack running across the road width. Bikes and rickshaws getting stuck.',
    category: 'road',
    severity: 3,
    tags: ['road', 'crack', 'pothole'],
    lat: 24.8108,
    lng: 67.0261,
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Anonymous',
    anonymous: true,
    status: 'active',
    tokensPledged: 410,
    tokensGoal: 1000,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'ISS-005',
    title: 'Burst Water Pipe — Nazimabad',
    description: 'Water pipe burst near main intersection. Clean water wasting for 3 days. Road eroding.',
    category: 'water',
    severity: 5,
    tags: ['water', 'pipe', 'burst', 'road'],
    lat: 24.9391,
    lng: 67.0424,
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Imran M.',
    anonymous: false,
    status: 'active',
    tokensPledged: 200,
    tokensGoal: 500,
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'ISS-006',
    title: 'Broken Road Stretch — Shahrah-e-Faisal',
    description: 'Severely degraded road surface spanning ~400m between Nursery and Awami Markaz. Multiple potholes and missing asphalt across all lanes causing accidents daily.',
    category: 'road',
    severity: 4,
    tags: ['road', 'pothole', 'stretch', 'asphalt'],
    lat: 24.8632,
    lng: 67.0762,
    geometry: {
      type: 'line',
      coordinates: [
        [24.8654, 67.0820],
        [24.8643, 67.0791],
        [24.8632, 67.0762],
        [24.8621, 67.0738],
        [24.8609, 67.0714],
      ],
    },
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Bilal R.',
    anonymous: false,
    status: 'active',
    tokensPledged: 620,
    tokensGoal: 1500,
    createdAt: Date.now() - 86400000 * 4,
    proofs: [
      {
        id: 'PRF-003',
        type: 'image',
        url: 'https://picsum.photos/seed/road1/400/300',
        addedBy: 'Bilal R.',
        addedAt: Date.now() - 86400000 * 4,
        caption: 'Pothole cluster near Nursery',
      },
    ],
  },
  {
    id: 'ISS-007',
    title: 'Damaged Sidewalk — Tariq Road',
    description: 'Sidewalk tiles broken and uneven along the shopping stretch of Tariq Road. Pedestrians forced onto the road, especially dangerous for elderly and children.',
    category: 'safety',
    severity: 3,
    tags: ['sidewalk', 'pedestrian', 'safety', 'tiles'],
    lat: 24.8689,
    lng: 67.0707,
    geometry: {
      type: 'line',
      coordinates: [
        [24.8708, 67.0705],
        [24.8697, 67.0706],
        [24.8689, 67.0707],
        [24.8680, 67.0708],
        [24.8668, 67.0709],
      ],
    },
    imageUrl: null,
    reporterId: 'SEED',
    reporterName: 'Sana T.',
    anonymous: true,
    status: 'active',
    tokensPledged: 330,
    tokensGoal: 800,
    createdAt: Date.now() - 86400000 * 6,
  },
]

export function IssuesProvider({ children }) {
  const [issues, setIssues] = useState(() => {
    const saved = localStorage.getItem('100rupay_issues')
    return saved ? JSON.parse(saved) : SEED_ISSUES
  })

  // Captured photos (mobile capture, not yet reported)
  const [captures, setCaptures] = useState(() => {
    const saved = localStorage.getItem('100rupay_captures')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('100rupay_issues', JSON.stringify(issues))
  }, [issues])

  useEffect(() => {
    localStorage.setItem('100rupay_captures', JSON.stringify(captures))
  }, [captures])

  // Save a photo capture (mobile)
  const addCapture = (photoData, lat, lng) => {
    const capture = {
      id: 'CAP-' + Date.now(),
      photoData, // base64
      lat,
      lng,
      capturedAt: Date.now(),
      used: false,
    }
    setCaptures(prev => [capture, ...prev])
    return capture
  }

  const removeCapture = (captureId) => {
    setCaptures(prev => prev.filter(c => c.id !== captureId))
  }

  const markCaptureUsed = (captureId) => {
    setCaptures(prev => prev.map(c => c.id === captureId ? { ...c, used: true } : c))
  }

  // Report a new issue (from laptop or mobile)
  const addIssue = (issue) => {
    const newIssue = {
      id: 'ISS-' + Date.now(),
      status: 'active',
      tokensPledged: 0,
      tokensGoal: 500,
      createdAt: Date.now(),
      ...issue,
    }
    setIssues(prev => [newIssue, ...prev])
    return newIssue
  }

  // Append a proof (image or video) to an issue
  const addProofToIssue = (issueId, proof) => {
    const fullProof = {
      id: 'PRF-' + Date.now(),
      addedAt: Date.now(),
      ...proof,
    }
    setIssues(prev => prev.map(iss => {
      if (iss.id !== issueId) return iss
      const existing = iss.proofs || []
      return { ...iss, proofs: [...existing, fullProof] }
    }))
    return fullProof
  }

  // Pledge tokens to an issue
  const pledgeTokens = (issueId, amount) => {
    setIssues(prev => prev.map(iss => {
      if (iss.id !== issueId) return iss
      const newPledged = Math.min(iss.tokensPledged + amount, iss.tokensGoal)
      return {
        ...iss,
        tokensPledged: newPledged,
        status: newPledged >= iss.tokensGoal ? 'funded' : iss.status,
      }
    }))
  }

  // Find nearby issues (for duplicate check)
  const findNearby = (lat, lng, radiusKm = 0.5, tags = []) => {
    return issues.filter(iss => {
      const dist = getDistanceKm(lat, lng, iss.lat, iss.lng)
      if (dist > radiusKm) return false
      if (tags.length === 0) return true
      const matchingTags = tags.filter(t => iss.tags.includes(t))
      return matchingTags.length >= 1
    })
  }

  return (
    <IssuesContext.Provider value={{
      issues, captures,
      addCapture, removeCapture, markCaptureUsed,
      addIssue, pledgeTokens, findNearby, addProofToIssue,
    }}>
      {children}
    </IssuesContext.Provider>
  )
}

export const useIssues = () => useContext(IssuesContext)

// Haversine distance in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
