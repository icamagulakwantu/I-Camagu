import { useRef, useState, useEffect } from 'react'
import Icon from '../../components/Icon.jsx'
import { pressable, inp, money } from './shared.js'

// Shrink a camera photo to a small JPEG so it uploads quickly on township data.
async function compressPhoto(file, maxSide = 720) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function PhotoField({ label, hint, value, onChange, facing }) {
  const inputRef = useRef(null)
  return (
    <div>
      <p className="text-xs font-bold text-ink mb-1">{label}</p>
      <button type="button" onClick={() => inputRef.current?.click()}
        className={`w-full flex items-center gap-3 border-2 border-dashed border-terracotta/30 rounded-soft p-3 text-left ${pressable}`}>
        {value ? (
          <img src={value} alt={label} className="h-16 w-16 rounded-[12px] object-cover flex-shrink-0" />
        ) : (
          <span className="h-16 w-16 rounded-[12px] bg-terracotta/10 flex items-center justify-center flex-shrink-0">
            <Icon name="camera" size={22} color="#c45c26" />
          </span>
        )}
        <span className="text-xs text-ink-muted leading-snug">{value ? 'Tap to retake' : hint}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture={facing} className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) onChange(await compressPhoto(file))
          e.target.value = ''
        }} />
    </div>
  )
}

// Finger or mouse signature on a canvas, saved as a PNG.
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    const c = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2b2420'
  }, [])

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    canvasRef.current.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    setSigned(true)
    onChange(canvasRef.current.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setSigned(false)
    onChange('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-ink">Borrower signature</p>
        {signed && <button type="button" onClick={clear} className="text-xs font-bold text-terracotta">Clear</button>}
      </div>
      <canvas ref={canvasRef}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
        className="w-full h-32 bg-cream border-2 border-terracotta/25 rounded-soft touch-none" />
      {!signed && <p className="text-[11px] text-ink-muted mt-1">Sign with your finger inside the box.</p>}
    </div>
  )
}

// Step two of a loan request. Loans are unsecured, so the group keeps a photo,
// a signature and the accepted terms on record before officials vote.
export default function BorrowerAgreement({ amount, interest, months, totalDue, value, onChange }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <div className="space-y-3 pt-1">
      <div className="bg-terracotta/5 border-2 border-terracotta/20 rounded-soft p-3 flex gap-2">
        <Icon name="shieldCheck" size={18} color="#c45c26" className="flex-shrink-0 mt-0.5" />
        <p className="text-xs text-ink leading-relaxed">
          This agreement protects the group and the borrower. Only officials can see these photos.
        </p>
      </div>
      <PhotoField label="Photo of the borrower" hint="Take a clear photo of the borrower's face" value={value.borrowerPhoto} onChange={set('borrowerPhoto')} facing="user" />
      <PhotoField label="ID document (optional)" hint="Photo of the borrower's ID book or card" value={value.idPhoto} onChange={set('idPhoto')} facing="environment" />
      <label className="block text-xs text-ink-muted">Borrower cellphone number
        <input type="tel" inputMode="tel" placeholder="072 123 4567" value={value.borrowerPhone || ''}
          onChange={(e) => set('borrowerPhone')(e.target.value)} className={`${inp} mt-1`} />
      </label>
      <div className="bg-white border-2 border-terracotta/20 rounded-soft p-3 text-xs text-ink leading-relaxed">
        I agree to borrow <strong>{money(amount)}</strong> from the group at <strong>{interest}%</strong> interest and
        to repay <strong>{money(totalDue)}</strong> over <strong>{months} month(s)</strong>. If I do not pay, the group
        may share this agreement with the authorities.
      </div>
      <SignaturePad onChange={set('signature')} />
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={Boolean(value.agreed)} onChange={(e) => set('agreed')(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-terracotta flex-shrink-0" />
        <span className="text-xs text-ink leading-snug">I have read and accept these terms.</span>
      </label>
    </div>
  )
}
