import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORIES, getSeverity, timeAgo } from '../utils/helpers'
import { X, MapPin, ChevronRight, ChevronLeft, Coins, Plus, Play, ImageIcon, List } from 'lucide-react'
import IssuesSidebar from '../components/IssuesSidebar'

function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${breakpoint}px)`).matches
      : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const update = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])
  return isDesktop
}

const SEVERITY_COLORS = {
  1: '#8a9488',
  2: '#60c8f5',
  3: '#f5a623',
  4: '#f55a5a',
  5: '#f55a5a',
}

function severityColor(severity, status) {
  if (status === 'funded') return '#60f5c0'
  return SEVERITY_COLORS[severity] || '#c8f560'
}

// Custom marker icons by severity
function createIcon(severity, status) {
  const color = severityColor(severity, status)

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0.2;animation:ping-slow 2.5s infinite;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0d0f0e;position:relative;z-index:2;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Tracks zoom level changes from user interaction
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  })
  return null
}

// Midpoint of a line's coordinate array (middle vertex)
function lineMidpoint(coords) {
  if (!coords || coords.length === 0) return null
  return coords[Math.floor(coords.length / 2)]
}

// Component to set map view
function MapViewSetter({ center }) {
  const map = useMap()
  map.setView(center, 13)
  return null
}

export default function MapPage() {
  const { issues, pledgeTokens, addProofToIssue } = useIssues()
  const { user, spendTokens } = useAuth()
  const navigate = useNavigate()
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [pledgeAmount, setPledgeAmount] = useState(1)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(13)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const proofFileInputRef = useRef(null)
  const mapRef = useRef(null)
  const isDesktop = useIsDesktop(900)

  // Build combined proof list — original report photo first, then user-submitted proofs
  const proofList = useMemo(() => {
    if (!selectedIssue) return []
    const list = []
    if (selectedIssue.imageUrl) {
      list.push({
        id: 'original-' + selectedIssue.id,
        type: 'image',
        url: selectedIssue.imageUrl,
        addedBy: selectedIssue.anonymous ? 'Anonymous' : selectedIssue.reporterName,
        addedAt: selectedIssue.createdAt,
        caption: 'Original report photo',
      })
    }
    if (selectedIssue.proofs) list.push(...selectedIssue.proofs)
    return list
  }, [selectedIssue])

  const proofContributors = useMemo(() => {
    return new Set(proofList.map(p => p.addedBy)).size
  }, [proofList])

  // Arrow-key + Escape navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + proofList.length) % proofList.length)
      else if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % proofList.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, proofList.length])

  const handleAddProofClick = () => {
    if (!user) return navigate('/profile')
    proofFileInputRef.current?.click()
  }

  const handleProofFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedIssue) return
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    const reader = new FileReader()
    reader.onload = () => {
      const proof = addProofToIssue(selectedIssue.id, {
        type: mediaType,
        url: reader.result,
        addedBy: user?.name || 'Anonymous',
        caption: '',
      })
      setSelectedIssue(prev => prev ? {
        ...prev,
        proofs: [...(prev.proofs || []), proof],
      } : prev)
    }
    reader.readAsDataURL(file)
  }

  const center = [24.8607, 67.0099] // Karachi center

  const filteredIssues = issues.filter(iss => {
    if (filter === 'all') return true
    if (filter === 'urgent') return iss.severity >= 4
    if (filter === 'funded') return iss.status === 'funded'
    return iss.category === filter
  })

  const handlePledge = () => {
    if (!user) return navigate('/profile')
    if (spendTokens(pledgeAmount)) {
      pledgeTokens(selectedIssue.id, pledgeAmount)
      setSelectedIssue(prev => ({
        ...prev,
        tokensPledged: Math.min(prev.tokensPledged + pledgeAmount, prev.tokensGoal),
      }))
    }
  }

  // Sidebar card click → fly map to issue and open the detail sheet
  const handleSelectFromSidebar = (issue) => {
    setSelectedIssue(issue)
    if (mapRef.current) {
      mapRef.current.flyTo([issue.lat, issue.lng], 16, { duration: 1 })
    }
    if (!isDesktop) setDrawerOpen(false)
  }

  return (
    <div className="h-full flex">
      {/* Desktop sidebar (left) */}
      {isDesktop && (
        <aside className="w-[360px] shrink-0 border-r border-border">
          <IssuesSidebar
            allIssues={issues}
            filteredIssues={filteredIssues}
            filter={filter}
            setFilter={setFilter}
            onSelectIssue={handleSelectFromSidebar}
            selectedIssueId={selectedIssue?.id}
          />
        </aside>
      )}

      {/* Map panel */}
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomTracker onZoomChange={setZoom} />
          {filteredIssues.map(issue => {
            const isLine = issue.geometry?.type === 'line'

            if (isLine && zoom >= 15) {
              return (
                <Polyline
                  key={issue.id}
                  positions={issue.geometry.coordinates}
                  pathOptions={{
                    color: severityColor(issue.severity, issue.status),
                    weight: 6,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{
                    click: () => setSelectedIssue(issue),
                  }}
                />
              )
            }

            const markerPos = isLine
              ? lineMidpoint(issue.geometry.coordinates)
              : [issue.lat, issue.lng]

            return (
              <Marker
                key={issue.id}
                position={markerPos}
                icon={createIcon(issue.severity, issue.status)}
                eventHandlers={{
                  click: () => setSelectedIssue(issue),
                }}
              />
            )
          })}
        </MapContainer>

        {/* Mobile bottom pill — opens drawer */}
        {!isDesktop && !drawerOpen && !selectedIssue && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] flex items-center gap-2 bg-surface/95 backdrop-blur border border-border2 px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-wider text-txt2 shadow-lg hover:text-txt transition"
          >
            <List size={12} className="text-lime" />
            {filteredIssues.length} issues · tap to view
          </button>
        )}

        {/* Mobile drawer */}
        <AnimatePresence>
          {!isDesktop && drawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/60 z-[950]"
                onClick={() => setDrawerOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                className="absolute inset-x-0 bottom-0 top-10 z-[960] bg-surface border-t border-border rounded-t-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-txt3">
                    Issues · Karachi
                  </span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded text-txt3 hover:text-txt hover:bg-surface2"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <IssuesSidebar
                    allIssues={issues}
                    filteredIssues={filteredIssues}
                    filter={filter}
                    setFilter={setFilter}
                    onSelectIssue={handleSelectFromSidebar}
                    selectedIssueId={selectedIssue?.id}
                    onClose={() => setDrawerOpen(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Issue detail sheet */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed bottom-[64px] ${isDesktop ? 'left-[360px]' : 'left-0'} right-0 z-[1000] max-h-[60vh] overflow-y-auto bg-surface border-t border-border rounded-t-2xl`}
          >
            <div className="max-w-lg mx-auto">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 bg-border2 rounded-full" />
              </div>

              <div className="px-5 pb-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {CATEGORIES[selectedIssue.category]?.icon || '📌'}
                      </span>
                      <h3 className="font-semibold text-base text-txt">{selectedIssue.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                        getSeverity(selectedIssue.severity).bg
                      } ${getSeverity(selectedIssue.severity).color} border-current/20`}>
                        {getSeverity(selectedIssue.severity).label}
                      </span>
                      <span className="font-mono text-[9px] text-txt3">
                        {timeAgo(selectedIssue.createdAt)}
                      </span>
                      <span className="font-mono text-[9px] text-txt3">
                        by {selectedIssue.anonymous ? 'Anonymous' : selectedIssue.reporterName}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="p-1.5 rounded-lg hover:bg-surface2 text-txt3"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-txt2 leading-relaxed mb-4">
                  {selectedIssue.description}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1.5 mb-4 font-mono text-[10px] text-txt3">
                  <MapPin size={12} />
                  {selectedIssue.lat.toFixed(4)}° N, {selectedIssue.lng.toFixed(4)}° E
                </div>

                {/* Proof gallery */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-txt3">Proof</span>
                    <button
                      onClick={handleAddProofClick}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-border2 font-mono text-[9px] uppercase tracking-wider text-txt3 hover:text-mint hover:border-mint/40 transition"
                    >
                      <Plus size={10} /> Add Proof
                    </button>
                    <input
                      ref={proofFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleProofFile}
                      className="hidden"
                    />
                  </div>

                  {proofList.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-4 bg-surface2 border border-dashed border-border2 rounded-lg">
                      <ImageIcon size={14} className="text-txt3" />
                      <span className="text-[11px] text-txt3">No proof submitted yet</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                        {proofList.map((p, i) => (
                          <button
                            key={p.id}
                            onClick={() => setLightboxIndex(i)}
                            className="shrink-0 relative w-20 h-20 rounded border border-border2 overflow-hidden hover:border-lime/40 transition group"
                          >
                            {p.type === 'video' ? (
                              <>
                                <video src={p.url} className="w-full h-full object-cover" muted preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition">
                                  <Play size={18} className="text-white fill-white" />
                                </div>
                              </>
                            ) : (
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="font-mono text-[9px] text-txt3 mt-1.5">
                        {proofList.length} proof{proofList.length !== 1 ? 's' : ''} submitted by {proofContributors} user{proofContributors !== 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </div>

                {/* Funding progress */}
                <div className="bg-surface2 rounded-lg p-4 border border-border2 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-txt3">Funding</span>
                    <span className="font-mono text-xs font-semibold text-lime">
                      ₨ {(selectedIssue.tokensPledged * 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border2 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedIssue.tokensPledged / selectedIssue.tokensGoal) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        background: selectedIssue.status === 'funded' ? '#60f5c0' :
                          selectedIssue.severity >= 4 ? '#f55a5a' : '#c8f560'
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-txt3">
                    <span>{selectedIssue.tokensPledged} / {selectedIssue.tokensGoal} tokens</span>
                    <span>{Math.round((selectedIssue.tokensPledged / selectedIssue.tokensGoal) * 100)}%</span>
                  </div>
                </div>

                {/* Pledge action */}
                {selectedIssue.status !== 'funded' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-border2 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setPledgeAmount(prev => Math.max(1, prev - 1))}
                        className="px-3 py-2 text-txt2 hover:text-txt hover:bg-surface2 font-mono text-sm"
                      >−</button>
                      <span className="px-3 py-2 font-mono text-sm text-txt min-w-[40px] text-center border-x border-border2">
                        {pledgeAmount}
                      </span>
                      <button
                        onClick={() => setPledgeAmount(prev => prev + 1)}
                        className="px-3 py-2 text-txt2 hover:text-txt hover:bg-surface2 font-mono text-sm"
                      >+</button>
                    </div>
                    <button
                      onClick={handlePledge}
                      className="flex-1 flex items-center justify-center gap-2 bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider py-2.5 rounded-lg hover:brightness-110 transition"
                    >
                      <Coins size={14} />
                      Pledge ₨ {(pledgeAmount * 100).toLocaleString()}
                    </button>
                  </div>
                )}

                {selectedIssue.status === 'funded' && (
                  <div className="flex items-center gap-2 p-3 bg-mint/10 border border-mint/20 rounded-lg font-mono text-[10px] text-mint">
                    ✅ Fully funded — awaiting resolution
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {selectedIssue.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-border/50 rounded font-mono text-[9px] text-txt3 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proof lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && proofList[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            {proofList.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(i => (i - 1 + proofList.length) % proofList.length)
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
                  aria-label="Previous"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(i => (i + 1) % proofList.length)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
                  aria-label="Next"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <motion.div
              key={proofList[lightboxIndex].id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) setLightboxIndex(i => (i + 1) % proofList.length)
                else if (info.offset.x > 80) setLightboxIndex(i => (i - 1 + proofList.length) % proofList.length)
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="max-w-[92vw] max-h-[82vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {proofList[lightboxIndex].type === 'video' ? (
                <video
                  src={proofList[lightboxIndex].url}
                  controls
                  autoPlay
                  className="max-w-[92vw] max-h-[72vh] rounded-lg"
                />
              ) : (
                <img
                  src={proofList[lightboxIndex].url}
                  alt=""
                  className="max-w-[92vw] max-h-[72vh] object-contain rounded-lg"
                  draggable={false}
                />
              )}
              <div className="text-center">
                {proofList[lightboxIndex].caption && (
                  <p className="text-sm text-txt2 mb-1">{proofList[lightboxIndex].caption}</p>
                )}
                <p className="font-mono text-[10px] text-txt3">
                  {lightboxIndex + 1} / {proofList.length} · by {proofList[lightboxIndex].addedBy} · {timeAgo(proofList[lightboxIndex].addedAt)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
