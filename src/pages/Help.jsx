function Help({ onBack }) {
  const faqs = [
    { q: 'How do I contribute to a stokvel?', a: 'Open the stokvel from the Stokvels tab, tap "Submit a contribution," enter the amount, and wait for an official to confirm it against the real bank payment.' },
    { q: 'Why do I need a PIN?', a: 'Your security PIN is required before approving payouts or confirming contributions — an extra layer of protection for real money, separate from your login.' },
    { q: 'What is Ubuhlanti bakwa Xhosa?', a: "A community shrine and development fund, rooted in Xhosa tradition and open to every family in our communities. It is built entirely from voluntary contributions, never a forced deduction. You can opt in to add a suggested share when you request a stokvel payout, or donate directly from R1 upward. See the Ubuhlanti page under More for the full total and how it's governed." },
    { q: 'Can I delete my ceremony plan or stokvel?', a: 'Yes. Stokvels can only be deleted once their balance is zero, to protect real funds. Ceremony plans can be deleted from the plan detail screen.' },
    { q: 'How does bulk buying work?', a: 'Add items to your cart and submit it. iCamagu groups your order with other members near you buying the same kind of thing. Merchants then send offers on the whole group order, and once the order reaches its minimum the best offer is confirmed. You don\'t need to choose a shop — you\'ll see who is supplying your order, and how to pay your share, in My Orders.' },
    { q: 'Is my data safe?', a: 'iCamagu keeps access tokens out of browser storage, financial actions can require PIN confirmation, and you can export or delete your account from Account & Privacy.' },
  ]

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="cursor-pointer text-sm text-ink-muted mb-4">← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-1">Help & Support</h2>
      <p className="text-xs text-ink-muted mb-6">Camagu. We're here if you need us.</p>

      <div className="bg-sage-500 text-white rounded-soft p-4 mb-6">
        <p className="font-bold text-sm mb-1">Need to reach us directly?</p>
        <a href="mailto:info@i-camagu.co.za" className="text-sm underline block">info@i-camagu.co.za</a>
      </div>

      <p className="text-xs font-black uppercase text-ink-muted mb-2">Frequently Asked Questions</p>
      <div className="space-y-2">
        {faqs.map((faq, idx) => (
          <details key={idx} className="bg-white border-2 border-terracotta/15 rounded-soft p-3">
            <summary className="font-bold text-sm text-ink cursor-pointer">{faq.q}</summary>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

export default Help
