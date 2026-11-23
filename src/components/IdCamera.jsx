import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { shrinkToDataUrl } from '../lib/idPhoto.js'

// The camera inside the app, for photographing an ID. A frame the shape of
// the document shows where to hold it: a smart ID card is 85.6 x 54 mm
// (landscape), a page of the green ID book 88 x 125 mm (portrait). The whole
// picture is kept, never cut to the frame, so a slightly off-centre ID is
// still complete. After the shot the member checks it and keeps or retakes.
//
// onUnavailable: called when there is no camera or permission is refused,
// so the caller can open the phone's own camera or gallery instead.
const FRAMES = {
  card: { ratio: 85.6 / 54, width: '86%' },
  page: { ratio: 88 / 125, width: '62%' },
}

export default function IdCamera({ title, shape = 'card', onCapture, onClose, onUnavailable }) {
  const t = useT()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [shot, setShot] = useState(null)
  // Kept in a ref so a new function from the parent never restarts the camera.
  const unavailableRef = useRef(onUnavailable)
  unavailableRef.current = onUnavailable

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.play().then(() => setReady(true)).catch(() => setReady(true))
    }).catch(() => { if (!cancelled) unavailableRef.current?.() })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    setShot(shrinkToDataUrl(video, video.videoWidth, video.videoHeight))
  }

  const frame = FRAMES[shape] || FRAMES.card

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <p className="text-[15px] font-bold">{title}</p>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-[14px] font-semibold text-white/80">{t('Cancel')}</button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {shot ? (
          <img src={shot} alt={t('Your photo')} className="h-full w-full object-contain" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            {/* The frame: the rest of the picture is dimmed around it. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-[14px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{ width: frame.width, aspectRatio: String(frame.ratio), maxHeight: '78%' }}
              />
            </div>
            {!ready && <p className="absolute inset-x-0 top-1/2 text-center text-[14px] text-white/80">{t('Opening the camera…')}</p>}
          </>
        )}
      </div>

      <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        {shot ? (
          <>
            <p className="mb-3 text-center text-[13px] text-white/80">{t('Can you read every word and number? No glare, all four corners showing?')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShot(null)} className="h-12 flex-1 rounded-full border border-white/40 text-[15px] font-bold">{t('Retake')}</button>
              <button type="button" onClick={() => onCapture(shot)} className="h-12 flex-[2] rounded-full bg-white text-[15px] font-bold text-[#1f3320]">{t('Use this photo')}</button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-center text-[13px] text-white/80">{t('Lay it flat in good light. Fit it inside the frame.')}</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={capture}
                disabled={!ready}
                aria-label={t('Take photo')}
                className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
              >
                <span className="h-[58px] w-[58px] rounded-full bg-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
