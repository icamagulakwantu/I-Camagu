import Icon from './Icon.jsx'

// Scaled down from what larger heritage platforms use (e.g. 10 confirms / 2
// disputes) to fit iCamagu's smaller, growing community — raise these as the
// user base grows.
export const CONFIRMS_NEEDED = 5
export const MAX_DISPUTES = 2

function CommunityVerification({ targetType, targetId, confirmCount = 0, disputeCount = 0, myVote, isOwner, canVote, onVote }) {
  const disputed = disputeCount > MAX_DISPUTES
  const trusted = !disputed && confirmCount >= CONFIRMS_NEEDED
  const progressPct = Math.min(100, Math.round((confirmCount / CONFIRMS_NEEDED) * 100))

  return (
    <div className="mt-3 pt-3 border-t border-terracotta/10">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-black uppercase text-ink-muted tracking-wider">Community Verification</p>
        {trusted && (
          <span className="text-[10px] font-black text-white bg-sage-500 px-2 py-0.5 rounded-pill flex items-center gap-1">
            <Icon name="users" size={10} color="#fff" /> Community Trusted
          </span>
        )}
        {disputed && (
          <span className="text-[10px] font-black text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-pill">
            Disputed — under review
          </span>
        )}
      </div>

      {!trusted && (
        <div className="h-1.5 w-full bg-cream-dark rounded-pill overflow-hidden mb-1.5">
          <div className="h-full bg-sage-500 rounded-pill transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      )}
      <p className="text-[11px] text-ink-muted mb-2">
        {confirmCount}/{CONFIRMS_NEEDED} confirms · {disputeCount}/{MAX_DISPUTES} disputes max
      </p>

      {canVote && !isOwner && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onVote(targetType, targetId, 'CONFIRM')}
            className={`flex-1 text-xs font-bold py-1.5 rounded-pill border-2 flex items-center justify-center gap-1 transition-colors ${
              myVote === 'CONFIRM' ? 'bg-sage-500 border-sage-500 text-white' : 'border-sage-500 text-sage-600'
            }`}
          >
            <Icon name="check" size={12} color={myVote === 'CONFIRM' ? '#fff' : '#4a7a4a'} /> Confirm
          </button>
          <button
            type="button"
            onClick={() => onVote(targetType, targetId, 'DISPUTE')}
            className={`flex-1 text-xs font-bold py-1.5 rounded-pill border-2 flex items-center justify-center gap-1 transition-colors ${
              myVote === 'DISPUTE' ? 'bg-terracotta border-terracotta text-white' : 'border-terracotta text-terracotta'
            }`}
          >
            <Icon name="close" size={12} color={myVote === 'DISPUTE' ? '#fff' : '#c45c26'} /> Dispute
          </button>
        </div>
      )}
    </div>
  )
}

export default CommunityVerification
