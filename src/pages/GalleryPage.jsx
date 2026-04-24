import { useIssues } from '../context/IssuesContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Trash2, Send, Images, Clock } from 'lucide-react'
import { isMobile, timeAgo } from '../utils/helpers'

export default function GalleryPage() {
  const { captures, removeCapture } = useIssues()
  const { user } = useAuth()
  const navigate = useNavigate()
  const mobile = isMobile()

  const unusedCaptures = captures.filter(c => !c.used)
  const usedCaptures = captures.filter(c => c.used)

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <Images size={40} className="text-txt3" />
        <p className="text-sm text-txt2 text-center">Log in to see your captured photos</p>
        <button
          onClick={() => navigate('/profile')}
          className="font-mono text-[11px] text-lime underline underline-offset-2"
        >
          Go to Profile →
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Header */}
        <div className="mb-5">
          <h2 className="font-semibold text-lg text-txt">My Captures</h2>
          <p className="text-[11px] text-txt2 mt-1">
            {mobile
              ? 'Photos you have taken in the field. Tap Report to submit one.'
              : 'Photos captured from your mobile. Select one to report the issue.'
            }
          </p>
        </div>

        {unusedCaptures.length === 0 && usedCaptures.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center border border-border2">
              <Images size={28} className="text-txt3" />
            </div>
            <p className="text-sm text-txt3 text-center max-w-[220px]">
              {mobile
                ? 'No captures yet. Use the camera to photograph issues around you.'
                : 'No captures yet. Open 100 Rupay on your phone to capture issues in the field.'
              }
            </p>
            {mobile && (
              <button
                onClick={() => navigate('/capture')}
                className="font-mono text-[11px] text-lime underline underline-offset-2"
              >
                Open Camera →
              </button>
            )}
          </div>
        )}

        {/* Unreported captures */}
        {unusedCaptures.length > 0 && (
          <>
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt3 mb-3">
              Ready to Report · {unusedCaptures.length}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <AnimatePresence>
                {unusedCaptures.map((cap, i) => (
                  <motion.div
                    key={cap.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group rounded-lg overflow-hidden border border-border2 bg-surface2"
                  >
                    <img
                      src={cap.photoData}
                      alt="Captured issue"
                      className="w-full aspect-[4/3] object-cover"
                    />

                    {/* Location badge */}
                    {cap.lat !== 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-bg/80 backdrop-blur px-2 py-0.5 rounded-full">
                        <MapPin size={8} className="text-mint" />
                        <span className="font-mono text-[7px] text-mint">
                          {cap.lat.toFixed(3)}, {cap.lng.toFixed(3)}
                        </span>
                      </div>
                    )}

                    {/* Time */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-bg/80 backdrop-blur px-2 py-0.5 rounded-full">
                      <Clock size={8} className="text-txt3" />
                      <span className="font-mono text-[7px] text-txt3">{timeAgo(cap.capturedAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="absolute bottom-0 left-0 right-0 flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-bg/90 to-transparent pt-6">
                      <button
                        onClick={() => navigate('/report', { state: { captureId: cap.id } })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-lime font-mono text-[9px] uppercase tracking-wider hover:bg-lime/10"
                      >
                        <Send size={12} />
                        Report
                      </button>
                      <button
                        onClick={() => removeCapture(cap.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-urgent font-mono text-[9px] uppercase tracking-wider hover:bg-urgent/10"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                    {/* Mobile: always show actions */}
                    {mobile && (
                      <div className="flex border-t border-border2">
                        <button
                          onClick={() => navigate('/report', { state: { captureId: cap.id } })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-lime font-mono text-[9px] uppercase tracking-wider bg-surface2 hover:bg-lime/10"
                        >
                          <Send size={11} />
                          Report
                        </button>
                        <button
                          onClick={() => removeCapture(cap.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-urgent font-mono text-[9px] uppercase tracking-wider bg-surface2 hover:bg-urgent/10 border-l border-border2"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Already reported */}
        {usedCaptures.length > 0 && (
          <>
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt3 mb-3">
              Already Reported · {usedCaptures.length}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {usedCaptures.map(cap => (
                <div key={cap.id} className="relative rounded-lg overflow-hidden border border-border2 opacity-50">
                  <img src={cap.photoData} alt="Reported" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-bg/50">
                    <span className="font-mono text-[8px] text-mint uppercase tracking-wider">Reported</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
