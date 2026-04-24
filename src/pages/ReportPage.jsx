import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles, AlertTriangle, Eye, EyeOff, Loader2, Check, ChevronRight, Send } from 'lucide-react'

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

    setSubmitting(true)

    setTimeout(() => {
      const issueLat = selectedCapture?.lat || 24.86 + Math.random() * 0.08
      const issueLng = selectedCapture?.lng || 67.01 + Math.random() * 0.1
      addIssue({
        title,
        description,
        category,
        severity,
        tags: aiResult?.tags || [category],
        lat: issueLat,
        lng: issueLng,
        geometry: { type: 'point', lat: issueLat, lng: issueLng },
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
                disabled={!title || !category || submitting}
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


