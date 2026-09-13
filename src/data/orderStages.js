/**
 * The real, backend-verified lifecycle of a SmartMatch bulk order, shared
 * between the Basket screen and My Orders so both describe the same order
 * the same way instead of two different ad-hoc renderings of the same
 * status fields.
 *
 * Backed one-to-one by real state, nothing inferred:
 *   BulkPool.status:    OPEN -> MATCHED -> FULFILLED
 *   PoolPayment.status: PENDING (+ providerReference once submitted) -> CLEARED
 */
export const ORDER_STAGES = [
  'Collecting',
  'MOQ reached',
  'Payment submitted',
  'Payment confirmed',
  'Ready for delivery',
]

// poolStatus: 'OPEN' | 'MATCHED' | 'FULFILLED'
// payment: { status: 'PENDING' | 'CLEARED' | 'REFUNDED', hasReference: boolean } | null
export function resolveOrderStage(poolStatus, payment) {
  if (poolStatus === 'FULFILLED') return 4
  if (payment?.status === 'CLEARED') return 3
  if (payment?.hasReference) return 2
  if (poolStatus === 'MATCHED') return 1
  return 0
}
