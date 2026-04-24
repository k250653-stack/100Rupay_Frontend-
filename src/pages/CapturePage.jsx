import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { getCurrentPosition } from '../utils/helpers'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Check, MapPin, RotateCcw, Loader2 } from 'lucide-react'

export default function CapturePage() {
  const { user } = useAuth()
  const { addCapture } = useIssues()
  const navigate = useNavigate()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [phase, setPhase] = useState('idle') // idle | streaming | captured | saving
  const [capturedImage, setCapturedImage] = useState(null)
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setPhase('streaming')

      // Get GPS simultaneously
      try {
        const pos = await getCurrentPosition()
        setLocation(pos)
      } catch {
        setError('GPS unavailable — photo will be saved without location')
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.')
    }
  }, [facingMode])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(dataUrl)
    stopCamera()
    setPhase('captured')
  }

  const retake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const saveCapture = async () => {
    if (!user) {
      navigate('/profile')
      return
    }
    setPhase('saving')
    const lat = location?.lat || 0
    const lng = location?.lng || 0
    addCapture(capturedImage, lat, lng)
    // Brief delay for feedback
    setTimeout(() => {
      navigate('/gallery')
    }, 500)
  }

  const flipCamera = () => {
    stopCamera()
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    setTimeout(startCamera, 100)
  }

  return (
    <div className="h-full flex flex-col bg-bg relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* IDLE STATE */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-20 h-20 bg-lime/10 rounded-full flex items-center justify-center border border-lime/20">
            <Camera size={32} className="text-lime" />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-lg text-txt mb-2">Capture an Issue</h2>
            <p className="text-sm text-txt2 max-w-[260px] leading-relaxed">
              Take a photo of a civic problem. Your GPS location will be recorded automatically.
            </p>
          </div>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider px-6 py-3 rounded-lg hover:brightness-110 transition"
          >
            <Camera size={16} />
            Open Camera
          </button>
          {error && (
            <p className="text-[11px] text-urgent font-mono text-center">{error}</p>
          )}
        </div>
      )}

      {/* STREAMING STATE */}
      {phase === 'streaming' && (
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-[15%] left-[10%] w-12 h-12 border-l-2 border-t-2 border-lime/60 rounded-tl-lg" />
            <div className="absolute top-[15%] right-[10%] w-12 h-12 border-r-2 border-t-2 border-lime/60 rounded-tr-lg" />
            <div className="absolute bottom-[25%] left-[10%] w-12 h-12 border-l-2 border-b-2 border-lime/60 rounded-bl-lg" />
            <div className="absolute bottom-[25%] right-[10%] w-12 h-12 border-r-2 border-b-2 border-lime/60 rounded-br-lg" />

            {/* Scan line */}
            <div className="scan-line absolute left-[10%] right-[10%] h-[1px] bg-lime/40 shadow-[0_0_8px_rgba(200,245,96,0.3)]" />
          </div>

          {/* GPS indicator */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-bg/80 backdrop-blur px-3 py-1.5 rounded-full border border-border2">
            <MapPin size={12} className={location ? 'text-mint' : 'text-amber animate-pulse'} />
            <span className="font-mono text-[9px] text-txt2">
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Acquiring GPS...'}
            </span>
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8">
            <button
              onClick={() => { stopCamera(); setPhase('idle'); }}
              className="w-12 h-12 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center border border-border2"
            >
              <X size={20} className="text-txt2" />
            </button>

            <button
              onClick={takePhoto}
              className="w-16 h-16 rounded-full border-4 border-lime flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-lime rounded-full hover:scale-95 transition-transform" />
            </button>

            <button
              onClick={flipCamera}
              className="w-12 h-12 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center border border-border2"
            >
              <RotateCcw size={18} className="text-txt2" />
            </button>
          </div>
        </div>
      )}

      {/* CAPTURED STATE */}
      {phase === 'captured' && capturedImage && (
        <div className="flex-1 relative">
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />

          {/* GPS stamp */}
          {location && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-bg/80 backdrop-blur px-3 py-1.5 rounded-full border border-mint/30">
              <MapPin size={12} className="text-mint" />
              <span className="font-mono text-[9px] text-mint">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          )}

          {/* Confirm / Retake */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 px-6">
            <button
              onClick={retake}
              className="flex-1 flex items-center justify-center gap-2 bg-surface/90 backdrop-blur border border-border2 text-txt2 font-mono text-[11px] font-semibold uppercase tracking-wider py-3 rounded-lg"
            >
              <RotateCcw size={14} />
              Retake
            </button>
            <button
              onClick={saveCapture}
              className="flex-1 flex items-center justify-center gap-2 bg-lime text-bg font-mono text-[11px] font-semibold uppercase tracking-wider py-3 rounded-lg hover:brightness-110 transition"
            >
              <Check size={14} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* SAVING STATE */}
      {phase === 'saving' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={32} className="text-lime animate-spin" />
          <span className="font-mono text-[11px] text-txt2 uppercase tracking-wider">
            Saving capture...
          </span>
        </div>
      )}
    </div>
  )
}
