import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../utils/helpers'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { MapPin, Sparkles, AlertTriangle, Eye, EyeOff, Loader2, Check, ChevronRight, Send, Undo2, Trash2, Circle, Route } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const KARACHI_CENTER = { lat: 24.8607, lng: 67.0099 }

const pinIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="display:flex;align-items:center;justify-content:center;">
           <div style="width:16px;height:16px;border-radius:50%;background:#c8f560;border:3px solid #0d0f0e;box-shadow:0 0 0 2px #c8f560;"></div>
         </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const waypointIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#60f5c0;border:2px solid #0d0f0e;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Total line length in meters using Leaflet's geodesic distance
function lineLengthMeters(coords) {
  if (!coords || coords.length < 2) return 0
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += L.latLng(coords[i - 1]).distanceTo(L.latLng(coords[i]))
  }
  return total
}

// Collects map clicks as line waypoints
function LineClickCollector({ onAdd }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

// Re-zooms the map when geometryType toggles between point and line modes.
// Starts line-drawing zoomed in to street level (19), point mode at 17.
function ModeViewController({ geometryType, captureLatLng }) {
  const map = useMap()
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    const targetZoom = geometryType === 'line' ? 19 : 17
    const target = captureLatLng || map.getCenter()
    map.setView(target, targetZoom, { animate: true })
  }, [geometryType])
  return null
}

export default function ReportPage() {
  const { user } = useAuth()
  const { captures, addIssue, markCaptureUsed, findNearby } = useIssues()
  const navigate = useNavigate()
  const location = useLocation()

  // If coming from gallery with a specific capture
  const preselectedCaptureId = location.state?.captureId || null

  const [selectedCapture, setSelectedCapture] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState(3)
  const [anonymous, setAnonymous] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [nearbyIssues, setNearbyIssues] = useState([])
  const [phase, setPhase] = useState('select') // select | form | nearby | success
  const [submitting, setSubmitting] = useState(false)

  // Geometry state — geometryType is 'point' or 'line'
  const [geometryType, setGeometryType] = useState('point')
  const [pointLatLng, setPointLatLng] = useState(null)
  const [waypoints, setWaypoints] = useState([])         // snapped-to-road clicks [[lat,lng], ...]
  const [snappedPath, setSnappedPath] = useState([])     // road-following path from OSRM
  const [routingLoading, setRoutingLoading] = useState(false)
  const [routingError, setRoutingError] = useState(false)
  const [rejectToast, setRejectToast] = useState(false)
  const routeAbortRef = useRef(null)
  const toastTimerRef = useRef(null)
  const shakeControls = useAnimationControls()

  // Initialize marker position when a capture is selected
  useEffect(() => {
    if (!selectedCapture) return
    const hasValidGps =
      typeof selectedCapture.lat === 'number' &&
      typeof selectedCapture.lng === 'number' &&
      (selectedCapture.lat !== 0 || selectedCapture.lng !== 0)
    setPointLatLng(hasValidGps
      ? { lat: selectedCapture.lat, lng: selectedCapture.lng }
      : { ...KARACHI_CENTER })
    setWaypoints([])
    setSnappedPath([])
    setRoutingError(false)
    setRoutingLoading(false)
    if (routeAbortRef.current) routeAbortRef.current.abort()
    setGeometryType('point')
  }, [selectedCapture?.id])

  // Cancel any in-flight routing request + clear toast timer on unmount
  useEffect(() => {
    return () => {
      if (routeAbortRef.current) routeAbortRef.current.abort()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const mapCenter = pointLatLng
    ? [pointLatLng.lat, pointLatLng.lng]
    : [KARACHI_CENTER.lat, KARACHI_CENTER.lng]

  // The capture's GPS (or Karachi fallback) — used to re-center on mode toggle
  const captureLatLng =
    selectedCapture &&
    typeof selectedCapture.lat === 'number' &&
    typeof selectedCapture.lng === 'number' &&
    (selectedCapture.lat !== 0 || selectedCapture.lng !== 0)
      ? [selectedCapture.lat, selectedCapture.lng]
      : [KARACHI_CENTER.lat, KARACHI_CENTER.lng]

  const triggerRejection = () => {
    shakeControls.start({
      x: [-6, 6, -4, 4, -2, 2, 0],
      transition: { duration: 0.4, ease: 'easeInOut' },
    })
    setRejectToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setRejectToast(false), 2000)
  }

  // Validate and snap a raw map click to the nearest road via OSRM's nearest endpoint.
  // Reject if further than 15m from any road; otherwise add the snapped position.
  const handleMapClick = async ([lat, lng]) => {
    try {
      const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`
      const res = await fetch(url)
      if (!res.ok) throw new Error('nearest http ' + res.status)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.waypoints || data.waypoints.length === 0) {
        throw new Error('nearest no waypoint')
      }
      const wp = data.waypoints[0]
      if (typeof wp.distance === 'number' && wp.distance > 15) {
        triggerRejection()
        return
      }
      const [snappedLng, snappedLat] = wp.location
      addWaypoint([snappedLat, snappedLng])
    } catch (err) {
      // Nearest endpoint unreachable — accept raw click and let the route fetch
      // handle fallback to straight lines if needed.
      addWaypoint([lat, lng])
    }
  }

  // Fetch road-snapped route from OSRM public server
  const fetchSnappedRoute = async (pts) => {
    if (!pts || pts.length < 2) {
      setSnappedPath([])
      setRoutingError(false)
      setRoutingLoading(false)
      return
    }
    if (routeAbortRef.current) routeAbortRef.current.abort()
    const ctrl = new AbortController()
    routeAbortRef.current = ctrl
    setRoutingLoading(true)

    try {
      const coordsPart = pts.map(([lat, lng]) => `${lng},${lat}`).join(';')
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsPart}?overview=full&geometries=geojson`
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error('OSRM HTTP ' + res.status)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route')
      }
      const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
      if (routeAbortRef.current !== ctrl) return // superseded
      setSnappedPath(path)
      setRoutingError(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (routeAbortRef.current !== ctrl) return
      setSnappedPath([])
      setRoutingError(true)
    } finally {
      if (routeAbortRef.current === ctrl) setRoutingLoading(false)
    }
  }

  const addWaypoint = (latlng) => {
    const next = [...waypoints, latlng]
    setWaypoints(next)
    if (next.length >= 2) fetchSnappedRoute(next)
  }

  const undoLastWaypoint = () => {
    const next = waypoints.slice(0, -1)
    setWaypoints(next)
    if (next.length >= 2) {
      fetchSnappedRoute(next)
    } else {
      if (routeAbortRef.current) routeAbortRef.current.abort()
      setSnappedPath([])
      setRoutingError(false)
      setRoutingLoading(false)
    }
  }

  const clearWaypoints = () => {
    if (routeAbortRef.current) routeAbortRef.current.abort()
    setWaypoints([])
    setSnappedPath([])
    setRoutingError(false)
    setRoutingLoading(false)
  }

  // Distance derived from snapped path when available, otherwise fallback to straight waypoints
  const measurePath = snappedPath.length >= 2
    ? snappedPath
    : (routingError && waypoints.length >= 2 ? waypoints : [])
  const lineLen = lineLengthMeters(measurePath)

  const lineReady =
    geometryType === 'line' &&
    waypoints.length >= 2 &&
    !routingLoading &&
    (snappedPath.length >= 2 || routingError)
  const pointReady = geometryType === 'point' && pointLatLng
  const geometryReady = lineReady || pointReady

  const unusedCaptures = captures.filter(c => !c.used)

  // Auto-select if coming from gallery
  useEffect(() => {
    if (preselectedCaptureId) {
      const cap = captures.find(c => c.id === preselectedCaptureId)
      if (cap) {
        setSelectedCapture(cap)
        setPhase('form')
        runAiAnalysis(cap)
      }
    }
  }, [preselectedCaptureId])

  // Simulate AI image analysis (replace with real Gemini API call)
  const runAiAnalysis = async (capture) => {
    setAiLoading(true)
    // In production: send capture.photoData to Gemini API
    // For demo: simulate with a delay
    await new Promise(r => setTimeout(r, 1500))

    // Simulated AI response — replace with actual Gemini response
    const mockResults = [
      { title: 'Broken Road Surface', desc: 'Damaged road with visible cracks and potholes causing hazard to vehicles and pedestrians.', category: 'road', severity: 3, tags: ['road', 'crack', 'pothole'] },
      { title: 'Overflowing Drain', desc: 'Storm drain blocked with debris causing water accumulation on the road.', category: 'sanitation', severity: 4, tags: ['drain', 'water', 'flooding', 'sanitation'] },
      { title: 'Damaged Streetlight', desc: 'Streetlight pole damaged or non-functional creating safety hazard in the area.', category: 'electrical', severity: 3, tags: ['streetlight', 'electrical', 'dark'] },
      { title: 'Exposed Wiring', desc: 'Electrical cables exposed near pedestrian area posing electrocution risk.', category: 'safety', severity: 5, tags: ['electrical', 'safety', 'wiring'] },
      { title: 'Water Leakage', desc: 'Water pipe leak causing water waste and road erosion.', category: 'water', severity: 4, tags: ['water', 'pipe', 'leak'] },
    ]
    const result = mockResults[Math.floor(Math.random() * mockResults.length)]

    setAiResult(result)
    setTitle(result.title)
    setDescription(result.desc)
    setCategory(result.category)
    setSeverity(result.severity)
    setAiLoading(false)

    // Check for nearby duplicates
    if (capture.lat && capture.lng) {
      const nearby = findNearby(capture.lat, capture.lng, 0.5, result.tags)
      setNearbyIssues(nearby)
    }
  }

  const handleSelectCapture = (cap) => {
    setSelectedCapture(cap)
    setPhase('form')
    runAiAnalysis(cap)
  }

  const handleSubmit = () => {
    if (!user) { navigate('/profile'); return }
    if (!title || !category) return
    if (!geometryReady) return

    setSubmitting(true)

    setTimeout(() => {
      let issueLat, issueLng, geometry
      if (geometryType === 'line') {
        const coords = snappedPath.length >= 2 ? snappedPath : waypoints
        const mid = coords[Math.floor(coords.length / 2)]
        issueLat = mid[0]
        issueLng = mid[1]
        geometry = { type: 'line', coordinates: coords, waypoints }
      } else {
        issueLat = pointLatLng.lat
        issueLng = pointLatLng.lng
        geometry = { type: 'point', lat: issueLat, lng: issueLng }
      }

      addIssue({
        title,
        description,
        category,
        severity,
        tags: aiResult?.tags || [category],
        lat: issueLat,
        lng: issueLng,
        geometry,
        imageUrl: selectedCapture?.photoData || null,
        reporterId: user.id,
        reporterName: anonymous ? 'Anonymous' : user.name,
        anonymous,
      })

      if (selectedCapture) markCaptureUsed(selectedCapture.id)
      setPhase('success')
      setSubmitting(false)
    }, 800)
  }

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <AlertTriangle size={40} className="text-amber" />
        <p className="text-sm text-txt2 text-center">You need to log in to report an issue</p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg"
        >
          Log In →
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* PHASE: SELECT CAPTURE */}
        {phase === 'select' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="font-semibold text-lg text-txt mb-1">Report an Issue</h2>
            <p className="text-[11px] text-txt2 mb-5">Select a captured photo to create a report</p>

            {unusedCaptures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface2 rounded-lg border border-border2">
                <p className="text-sm text-txt3 text-center">No captures available</p>
                <p className="text-[10px] text-txt3 text-center max-w-[240px]">
                  Open 100 Rupay on your phone to capture photos of issues in the field.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {unusedCaptures.map(cap => (
                  <button
                    key={cap.id}
                    onClick={() => handleSelectCapture(cap)}
                    className="text-left rounded-lg overflow-hidden border border-border2 hover:border-lime/30 transition-colors bg-surface2"
                  >
                    <img src={cap.photoData} alt="" className="w-full aspect-[4/3] object-cover" />
                    <div className="p-2.5 flex items-center gap-1.5">
                      <MapPin size={10} className="text-mint shrink-0" />
                      <span className="font-mono text-[8px] text-txt3 truncate">
                        {cap.lat.toFixed(3)}, {cap.lng.toFixed(3)}
                      </span>
                      <ChevronRight size={10} className="text-txt3 ml-auto shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* PHASE: FORM */}
        {phase === 'form' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button
              onClick={() => { setPhase('select'); setSelectedCapture(null); setAiResult(null); }}
              className="font-mono text-[10px] text-txt3 mb-4 hover:text-txt2"
            >
              ← Back to captures
            </button>

            {/* Selected image */}
            {selectedCapture && (
              <div className="rounded-lg overflow-hidden border border-border2 mb-5 relative">
                <img src={selectedCapture.photoData} alt="" className="w-full aspect-video object-cover" />
                {selectedCapture.lat !== 0 && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-bg/80 backdrop-blur px-2 py-1 rounded-full">
                    <MapPin size={10} className="text-mint" />
                    <span className="font-mono text-[8px] text-mint">
                      {selectedCapture.lat.toFixed(4)}, {selectedCapture.lng.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis */}
            {aiLoading && (
              <div className="flex items-center gap-3 p-4 bg-violet/10 border border-violet/20 rounded-lg mb-5">
                <Loader2 size={16} className="text-violet animate-spin" />
                <div>
                  <span className="font-mono text-[10px] text-violet uppercase tracking-wider">
                    AI Analyzing Image...
                  </span>
                  <p className="text-[10px] text-txt3 mt-0.5">Detecting issue type, severity, and tags</p>
                </div>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div className="flex items-start gap-3 p-4 bg-mint/8 border border-mint/20 rounded-lg mb-5">
                <Sparkles size={16} className="text-mint shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-[10px] text-mint uppercase tracking-wider">
                    AI Detection Complete
                  </span>
                  <p className="text-[10px] text-txt2 mt-1">
                    Detected: {aiResult.title} · Severity {aiResult.severity}/5
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {aiResult.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-mint/10 rounded font-mono text-[8px] text-mint uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nearby duplicates warning */}
            {nearbyIssues.length > 0 && (
              <div className="p-4 bg-amber/10 border border-amber/20 rounded-lg mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber" />
                  <span className="font-mono text-[10px] text-amber uppercase tracking-wider">
                    Similar issues nearby
                  </span>
                </div>
                {nearbyIssues.slice(0, 3).map(iss => (
                  <div key={iss.id} className="flex items-center justify-between py-2 border-b border-amber/10 last:border-0">
                    <div>
                      <span className="text-[11px] text-txt2">{iss.title}</span>
                      <span className="font-mono text-[9px] text-txt3 block">
                        {iss.tokensPledged}/{iss.tokensGoal} tokens
                      </span>
                    </div>
                    <button
                      onClick={() => { navigate('/'); }}
                      className="font-mono text-[9px] text-amber underline underline-offset-2"
                    >
                      View →
                    </button>
                  </div>
                ))}
                <p className="text-[9px] text-txt3 mt-2">
                  If this is the same issue, consider funding the existing report instead.
                </p>
              </div>
            )}

            {/* Mark affected area */}
            <div className="mb-5">
              <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                Mark affected area
              </label>

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setGeometryType('point')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition ${
                    geometryType === 'point'
                      ? 'bg-lime/10 border-lime/40 text-lime'
                      : 'bg-surface2 border-border2 text-txt3 hover:text-txt2'
                  }`}
                >
                  <Circle size={12} /> Point
                </button>
                <button
                  onClick={() => setGeometryType('line')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-mono text-[10px] uppercase tracking-wider transition ${
                    geometryType === 'line'
                      ? 'bg-mint/10 border-mint/40 text-mint'
                      : 'bg-surface2 border-border2 text-txt3 hover:text-txt2'
                  }`}
                >
                  <Route size={12} /> Road Stretch
                </button>
              </div>

              <p className="font-mono text-[9px] text-txt3 mb-2">
                {geometryType === 'point'
                  ? 'Drag the pin to fine-tune the exact location.'
                  : 'Click along the road — line will snap to streets automatically.'}
              </p>

              <motion.div
                animate={shakeControls}
                className="h-64 rounded-lg overflow-hidden border border-border2 relative"
              >
                {pointLatLng && (
                  <MapContainer
                    center={mapCenter}
                    zoom={17}
                    className="w-full h-full"
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <ModeViewController geometryType={geometryType} captureLatLng={captureLatLng} />

                    {geometryType === 'point' && (
                      <Marker
                        position={[pointLatLng.lat, pointLatLng.lng]}
                        icon={pinIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const ll = e.target.getLatLng()
                            setPointLatLng({ lat: ll.lat, lng: ll.lng })
                          },
                        }}
                      />
                    )}

                    {geometryType === 'line' && (
                      <>
                        <LineClickCollector onAdd={handleMapClick} />
                        {snappedPath.length >= 2 && (
                          <Polyline
                            positions={snappedPath}
                            pathOptions={{
                              color: '#60f5c0',
                              weight: 5,
                              opacity: 0.85,
                              lineCap: 'round',
                              lineJoin: 'round',
                            }}
                          />
                        )}
                        {snappedPath.length < 2 && routingError && waypoints.length >= 2 && (
                          <Polyline
                            positions={waypoints}
                            pathOptions={{
                              color: '#f5a623',
                              weight: 4,
                              opacity: 0.7,
                              dashArray: '6 8',
                              lineCap: 'round',
                            }}
                          />
                        )}
                        {waypoints.map((c, i) => (
                          <Marker key={i} position={c} icon={waypointIcon} />
                        ))}
                      </>
                    )}
                  </MapContainer>
                )}

                {/* Off-road rejection toast */}
                <AnimatePresence>
                  {rejectToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-md bg-urgent/90 text-white font-mono text-[10px] uppercase tracking-wider shadow-lg pointer-events-none whitespace-nowrap"
                    >
                      Not a valid road — click on a street
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {geometryType === 'line' && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={undoLastWaypoint}
                      disabled={waypoints.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border2 font-mono text-[9px] uppercase tracking-wider text-txt3 hover:text-txt2 hover:border-mint/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Undo2 size={11} /> Undo
                    </button>
                    <button
                      onClick={clearWaypoints}
                      disabled={waypoints.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border2 font-mono text-[9px] uppercase tracking-wider text-txt3 hover:text-urgent hover:border-urgent/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-right">
                    {routingLoading && (
                      <Loader2 size={11} className="animate-spin text-mint" />
                    )}
                    <span className="font-mono text-[10px] text-mint">
                      {lineLen < 1000 ? `${lineLen.toFixed(0)} m` : `${(lineLen / 1000).toFixed(2)} km`}
                    </span>
                    <span className="font-mono text-[9px] text-txt3 ml-1">
                      {waypoints.length} pt{waypoints.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              {geometryType === 'line' && routingError && waypoints.length >= 2 && (
                <p className="font-mono text-[9px] text-amber mt-1.5">
                  ⚠ Routing unavailable — using straight lines
                </p>
              )}

              {geometryType === 'line' && waypoints.length < 2 && (
                <p className="font-mono text-[9px] text-amber mt-1.5">
                  Add at least 2 points to mark the stretch.
                </p>
              )}
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Broken Streetlight — PECHS"
                  className="w-full px-3 py-2.5 bg-surface2 border border-border2 rounded-lg text-txt text-sm font-mono outline-none focus:border-lime/50 transition"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-3 py-2.5 bg-surface2 border border-border2 rounded-lg text-txt text-sm outline-none focus:border-lime/50 transition resize-none"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-mono transition ${
                        category === key
                          ? 'bg-lime/10 border-lime/30 text-lime'
                          : 'bg-surface2 border-border2 text-txt3 hover:text-txt2'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] font-semibold uppercase tracking-wider text-txt3 block mb-1.5">
                  Severity: {severity}/5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  className="w-full accent-lime"
                />
                <div className="flex justify-between font-mono text-[8px] text-txt3 mt-1">
                  <span>Low</span><span>Minor</span><span>Moderate</span><span>High</span><span>Critical</span>
                </div>
              </div>

              {/* Anonymous toggle */}
              <button
                onClick={() => setAnonymous(!anonymous)}
                className="w-full flex items-center justify-between p-3 bg-surface2 border border-border2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {anonymous ? <EyeOff size={14} className="text-violet" /> : <Eye size={14} className="text-txt3" />}
                  <span className="text-[11px] text-txt2">Report anonymously</span>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${anonymous ? 'bg-violet' : 'bg-border2'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-txt transition-transform ${anonymous ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </button>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!title || !category || submitting || !geometryReady}
                className="w-full flex items-center justify-center gap-2 bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider py-3 rounded-lg hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </motion.div>
        )}

        {/* PHASE: SUCCESS */}
        {phase === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="w-16 h-16 bg-mint/10 rounded-full flex items-center justify-center border border-mint/20">
              <Check size={28} className="text-mint" />
            </div>
            <h3 className="font-semibold text-lg text-txt">Issue Reported!</h3>
            <p className="text-[11px] text-txt2 text-center max-w-[260px]">
              Your report is now visible on the map. Others in the area will be able to see and fund it.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => navigate('/')}
                className="font-mono text-[11px] text-lime bg-lime/10 border border-lime/20 px-4 py-2 rounded-lg"
              >
                View on Map →
              </button>
              <button
                onClick={() => { setPhase('select'); setSelectedCapture(null); setAiResult(null); setTitle(''); setDescription(''); setCategory(''); }}
                className="font-mono text-[11px] text-txt2 bg-surface2 border border-border2 px-4 py-2 rounded-lg"
              >
                Report Another
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}


