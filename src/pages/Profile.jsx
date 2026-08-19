import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96]'

export default function Profile() {
  const { user, logout, accessToken, updateUser } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    paternalIziduko: user?.paternalIziduko || '',
    maternalIziduko: user?.maternalIziduko || '',
    paternalGrandmotherIziduko: user?.paternalGrandmotherIziduko || '',
    maternalGrandmotherIziduko: user?.maternalGrandmotherIziduko || '',
    address: user?.address || '',
    age: user?.age || '',
    phoneNumber: user?.phoneNumber || '',
  })

  const handlePictureSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      showToast('Photo too large — please choose an image under 1.5MB', 'error')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ profileImage: reader.result }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update photo')
        updateUser({ profileImage: data.profileImage })
        showToast('Profile picture updated', 'success')
      } catch (err) {
        showToast(err.message || 'Error uploading photo', 'error')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveAll = async (e) => {
    e.preventDefault()
    try {
      const izRes = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          paternalIziduko: form.paternalIziduko,
          maternalIziduko: form.maternalIziduko,
          paternalGrandmotherIziduko: form.paternalGrandmotherIziduko,
          maternalGrandmotherIziduko: form.maternalGrandmotherIziduko,
        }),
      })
      const izData = await izRes.json()
      if (!izRes.ok) throw new Error(izData.error || 'Failed to update Iziduko')

      const profRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          address: form.address,
          age: form.age,
          phoneNumber: form.phoneNumber,
        }),
      })
      const profData = await profRes.json()
      if (!profRes.ok) throw new Error(profData.error || 'Failed to update profile details')

      updateUser({ ...izData, ...profData })
      setEditing(false)
      showToast('Profile updated', 'success')
    } catch (err) {
      showToast(err.message || 'Could not save profile details', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'info')
    } catch {
      showToast('Failed to log out', 'error')
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-10 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-3xl bg-white/15 border-2 border-white/20 flex items-center justify-center text-4xl overflow-hidden active:scale-90 transition-transform flex-shrink-0"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : '👤'}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-bold">...</div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureSelect} className="hidden" />

          <div>
            <h1 className="font-display font-bold text-2xl">{user?.firstName || ''} {user?.lastName || ''}</h1>
            <p className="text-white/70 text-sm">@{user?.username || ''}</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs underline mt-1 text-white/80 block">
              Change photo
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 -mt-6 bg-white border-2 border-ink rounded-soft p-5 shadow-elevated relative z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Iziduko & Details</h3>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-sage-600 font-bold underline">Edit</button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveAll} className="space-y-2">
            <input placeholder="Paternal Iziduko" value={form.paternalIziduko}
              onChange={(e) => setForm({ ...form, paternalIziduko: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            <input placeholder="Maternal Iziduko" value={form.maternalIziduko}
              onChange={(e) => setForm({ ...form, maternalIziduko: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            <input placeholder="Paternal grandmother's Isiduko" value={form.paternalGrandmotherIziduko}
              onChange={(e) => setForm({ ...form, paternalGrandmotherIziduko: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input placeholder="Maternal grandmother's Isiduko" value={form.maternalGrandmotherIziduko}
              onChange={(e) => setForm({ ...form, maternalGrandmotherIziduko: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input placeholder="Address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input type="number" placeholder="Age" value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input placeholder="Phone number" value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="flex-1 border-2 border-ink font-bold py-2 rounded-pill text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sage-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Paternal</p>
              <p className="font-bold text-ink">{user?.paternalIziduko || '—'}</p>
            </div>
            <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Maternal</p>
              <p className="font-bold text-ink">{user?.maternalIziduko || '—'}</p>
            </div>
            <div className="bg-sage-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Paternal grandmother</p>
              <p className="font-bold text-ink">{user?.paternalGrandmotherIziduko || '—'}</p>
            </div>
            <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Maternal grandmother</p>
              <p className="font-bold text-ink">{user?.maternalGrandmotherIziduko || '—'}</p>
            </div>
            {user?.address && <p className="col-span-2 text-sm text-ink-muted">📍 {user.address}</p>}
            {user?.phoneNumber && <p className="col-span-2 text-sm text-ink-muted">📞 {user.phoneNumber}</p>}
          </div>
        )}
      </div>

      <div className="px-4 mt-8 mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full bg-white border-2 border-ink text-ink font-bold py-3.5 rounded-pill',
            'hover:bg-ink hover:text-white transition-colors duration-200',
            pressable
          )}
        >
          🚪 Log Out
        </button>
      </div>
    </div>
  )
}