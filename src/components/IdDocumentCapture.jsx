import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import IdCamera from './IdCamera.jsx'
import { useT } from '../i18n/index.jsx'
import { canUseCamera, fileToIdPhoto } from '../lib/idPhoto.js'

// Photos of a South African ID for verification. A smart ID card needs its
// front and its back; the green ID book needs its photo page (the page with
// the barcode, ID number and photo). Each one can be taken with the camera in
// the app, or chosen from the phone's photos.
//
// value: { type: 'SMART_ID' | 'GREEN_BOOK' | null, front, back } (data URLs)
export const ID_TYPES = [
  { id: 'SMART_ID', title: 'Smart ID card', note: 'Front and back' },
  { id: 'GREEN_BOOK', title: 'Green ID book', note: 'The photo page' },
]

const SLOTS = {
  SMART_ID: [
    { key: 'front', label: 'Front of the card', camera: 'Front of your smart ID card', shape: 'card' },
    { key: 'back', label: 'Back of the card', camera: 'Back of your smart ID card', shape: 'card' },
  ],
  GREEN_BOOK: [
    { key: 'front', label: 'Photo page', camera: 'The photo page of your ID book', shape: 'page' },
  ],
}

// True when every photo this ID needs is there.
export function idPhotosComplete(value) {
  const slots = SLOTS[value?.type]
  return Boolean(slots && slots.every((slot) => value[slot.key]))
}

export default function IdDocumentCapture({ value, onChange, onError }) {
  const t = useT()
  const [cameraFor, setCameraFor] = useState(null)
  const [busy, setBusy] = useState(null)
  const fileRefs = useRef({})
  const nativeCameraRefs = useRef({})

  const set = (patch) => onChange({ ...value, ...patch })
  const chooseType = (type) => {
    if (type === value.type) return
    onChange({ type, front: null, back: null })
  }

  const fromFile = async (key, file) => {
    if (!file) return
    setBusy(key)
    try {
      set({ [key]: await fileToIdPhoto(file) })
    } catch (err) {
      onError?.(t(err.message))
    } finally {
      setBusy(null)
    }
  }

  // The camera in the app where the phone allows it; otherwise the phone's
  // own camera through the file picker.
  const takePhoto = (slot) => {
    if (canUseCamera()) setCameraFor(slot)
    else nativeCameraRefs.current[slot.key]?.click()
  }

  const slots = SLOTS[value.type] || []

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-bold text-ink">{t('Which ID do you have?')}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Which ID do you have?')}>
          {ID_TYPES.map((type) => {
            const on = value.type === type.id
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => chooseType(type.id)}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition-colors ${on ? 'border-[#1f3320] bg-[#1f3320]/[0.06]' : 'border-ink/15 bg-white'}`}
              >
                <IdShape kind={type.id} on={on} />
                <span className="mt-2 block text-[14px] font-bold leading-tight text-ink">{t(type.title)}</span>
                <span className="block text-[12px] text-ink-muted">{t(type.note)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {slots.map((slot, index) => {
        const photo = value[slot.key]
        return (
          <div key={slot.key} className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.08]">
            <div className="flex items-center gap-3">
              <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream ${slot.shape === 'page' ? 'h-[76px] w-[54px]' : 'h-[54px] w-[86px]'}`}>
                {photo
                  ? <img src={photo} alt={t(slot.label)} className="h-full w-full object-cover" />
                  : <span className="text-[13px] font-bold text-ink-muted">{index + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">{t(slot.label)}</p>
                <p className="text-[12px] text-ink-muted">
                  {busy === slot.key ? t('Preparing the photo…') : photo ? <span className="font-semibold text-[#3f6b3f]">✓ {t('Photo added')}</span> : t('Not added yet')}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => takePhoto(slot)}
                className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold ${photo ? 'border border-ink/20 text-ink' : 'bg-[#1f3320] text-white'}`}
              >
                <Icon name="camera" size={15} color={photo ? '#1f3320' : '#fff'} /> {photo ? t('Retake') : t('Take photo')}
              </button>
              <button
                type="button"
                onClick={() => fileRefs.current[slot.key]?.click()}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/20 text-[13px] font-bold text-ink"
              >
                <Icon name="upload" size={15} color="#1f3320" /> {t('Upload')}
              </button>
            </div>
            <input ref={(el) => { fileRefs.current[slot.key] = el }} type="file" accept="image/*" className="hidden" onChange={(e) => { fromFile(slot.key, e.target.files?.[0]); e.target.value = '' }} />
            <input ref={(el) => { nativeCameraRefs.current[slot.key] = el }} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { fromFile(slot.key, e.target.files?.[0]); e.target.value = '' }} />
          </div>
        )
      })}

      {cameraFor && (
        <IdCamera
          title={t(cameraFor.camera)}
          shape={cameraFor.shape}
          onClose={() => setCameraFor(null)}
          onCapture={(photo) => { set({ [cameraFor.key]: photo }); setCameraFor(null) }}
          onUnavailable={() => {
            const key = cameraFor.key
            setCameraFor(null)
            nativeCameraRefs.current[key]?.click()
          }}
        />
      )}
    </div>
  )
}

// A small drawing of the document: a green booklet or a card.
function IdShape({ kind, on }) {
  const ink = on ? '#1f3320' : '#8a8278'
  if (kind === 'GREEN_BOOK') {
    return (
      <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
        <rect x="1" y="1" width="28" height="36" rx="3" fill={on ? '#2f5d3a' : '#e9e4da'} stroke={ink} strokeWidth="1.5" />
        <rect x="6" y="8" width="18" height="3" rx="1" fill={on ? '#fff' : '#b9b1a5'} />
        <circle cx="15" cy="22" r="5" fill="none" stroke={on ? '#fff' : '#b9b1a5'} strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="44" height="30" viewBox="0 0 44 30" aria-hidden="true">
      <rect x="1" y="1" width="42" height="28" rx="4" fill={on ? '#fff' : '#f6f3ee'} stroke={ink} strokeWidth="1.5" />
      <rect x="5" y="7" width="11" height="14" rx="2" fill={on ? '#1f3320' : '#c9c1b5'} />
      <rect x="20" y="9" width="18" height="2.5" rx="1" fill={ink} opacity="0.6" />
      <rect x="20" y="15" width="13" height="2.5" rx="1" fill={ink} opacity="0.4" />
    </svg>
  )
}
