import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function MyOrders({ onBack }) {
      const { accessToken } = useAuth()
        const [documents, setDocuments] = useState([])

          const fetchDocs = () => {
                  fetch('/api/basket/order-documents/my', { headers: { Authorization: `Bearer ${accessToken}` } })
                        .then(res => res.json())
                              .then(setDocuments)
          }

            useEffect(() => { fetchDocs() }, [])

              const confirmLine = async (lineItemId) => {
                      await fetch('/api/basket/order-documents/confirm-line', {
                                method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                                            body: JSON.stringify({ lineItemId }),
                      })
                          fetchDocs()
              }

                return (
                        <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
                              <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">← Back</button>
                                    <h2 className="text-2xl font-extrabold text-brand-black mb-4">My Orders</h2>

                                          {documents.length === 0 ? (
                                                      <p className="text-brand-black/50 text-sm">No matched bulk orders yet — submit a basket to a pool from the Store.</p>
                                          ) : (
                                                      <div className="space-y-3">
                                                                {documents.map((doc) => (
                                                                                <div key={doc.id} className="bg-white border-2 border-brand-black rounded-soft p-4">
                                                                                              <div className="flex justify-between items-start mb-2">
                                                                                                              <p className="font-mono text-xs font-bold text-brand-blue">{doc.groupCode}</p>
                                                                                                                              <span className="text-xs font-black uppercase text-brand-ochre">{doc.status.replace(/_/g, ' ')}</span>
                                                                                                                                            </div>
                                                                                                                                                          <p className="text-xs text-brand-black/50 mb-2">📍 {doc.deliveryLocation}</p>
                                                                                                                                                                        {doc.lineItems.map((li) => (
                                                                                                                                                                                            <div key={li.id} className="flex justify-between items-center py-1">
                                                                                                                                                                                                              <p className="text-sm text-brand-black/70">{li.quantity} {li.unitType.toLowerCase()}(s) — {li.itemDescription}</p>
                                                                                                                                                                                                                                {li.confirmedAt ? (
                                                                                                                                                                                                                                                        <span className="text-xs text-brand-blue font-bold">✅ Confirmed</span>
                                                                                                                                                                                                                                ) : (
                                                                                                                                                                                                                                                        <button onClick={() => confirmLine(li.id)} className="text-xs bg-brand-blue text-brand-cream font-bold px-3 py-1 rounded-pill">
                                                                                                                                                                                                                                                                              Confirm this is correct
                                                                                                                                                                                                                                                                                                  </button>
                                                                                                                                                                                                                                )}
                                                                                                                                                                                                                                                </div>
                                                                                                                                                                        ))}
                                                                                                                                                                                      <p className="text-sm font-bold text-brand-black mt-2">Group total: R{parseFloat(doc.totalAmountZAR).toFixed(2)}</p>
                                                                                                                                                                                                  </div>
                                                                ))}
                                                                        </div>
                                          )}
                                              </div>
                )
}

export default MyOrders
                                    