import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORIES, getSeverity, timeAgo } from '../utils/helpers'
import { X, MapPin, ChevronRight, Coins } from 'lucide-react'

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
  const { issues, pledgeTokens } = useIssues()
  const { user, spendTokens } = useAuth()
  const navigate = useNavigate()
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [pledgeAmount, setPledgeAmount] = useState(1)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(13)

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

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-border bg-surface">
        {['all', 'urgent', 'road', 'sanitation', 'electrical', 'water', 'safety'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all border ${
              filter === f
                ? 'bg-lime/15 border-lime/30 text-lime'
                : 'bg-transparent border-border2 text-txt3 hover:text-txt2'
            }`}
          >
            {f === 'all' ? 'All Issues' : f === 'urgent' ? '🔴 Urgent' : CATEGORIES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
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

        {/* Issue count overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] font-mono text-[9px] text-txt3 uppercase tracking-wider bg-surface/90 backdrop-blur px-3 py-1.5 rounded border border-border2">
          {filteredIssues.length} issues · Karachi
        </div>
      </div>

      {/* Issue detail sheet */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-[64px] left-0 right-0 z-[1000] max-h-[60vh] overflow-y-auto bg-surface border-t border-border rounded-t-2xl"
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
    </div>
  )
}
