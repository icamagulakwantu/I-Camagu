import { useState } from 'react'
import Stokvels from './Stokvels.jsx'
import MyStokvelInvites from '../components/MyStokvelInvites.jsx'

// The Stokvels screen with any invitations waiting for the person shown on
// top. Joining one remounts the list so the new stokvel appears straight away.
export default function StokvelsWithInvites(props) {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <>
      <div className="px-4 pt-6 bg-cream empty:hidden">
        <MyStokvelInvites onJoined={() => setRefreshKey((k) => k + 1)} />
      </div>
      <Stokvels key={refreshKey} {...props} />
    </>
  )
}
