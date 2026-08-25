const LAST_UPDATED = '25 August 2026'

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="font-display font-bold text-base text-ink mb-2">{title}</h3>
      <div className="text-sm text-ink-muted leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-1">Privacy Policy</h2>
      <p className="text-xs text-ink-muted mb-6">Last updated {LAST_UPDATED} · Written to comply with South Africa's Protection of Personal Information Act (POPIA)</p>

      <Section title="Who this policy covers">
        <p>
          This policy explains how iCamagu ("we", "us", the "Platform") collects, uses, stores,
          and protects your personal information when you use the app. iCamagu is the
          Responsible Party for this processing under POPIA. If you need to reach us about
          your data, email <a href="mailto:info@i-camagu.co.za" className="text-sage-600 underline">info@i-camagu.co.za</a>.
        </p>
      </Section>

      <Section title="What we collect, and why">
        <p><strong className="text-ink">Account information</strong> — name, email, phone number, address, age, and your Iziduko (clan names). Used to run your account, match you with family and clan connections, and personalise ceremony planning.</p>
        <p><strong className="text-ink">Location</strong> — only if you choose to share it, to help place you within Umgidi Hierarchy structures and clan matching. You can decline or remove this at any time.</p>
        <p><strong className="text-ink">Financial and stokvel records</strong> — contributions, payouts, and pool orders, so stokvel officials can reconcile real money against the app and so you have a record of your own participation.</p>
        <p><strong className="text-ink">ID number and ID document photo</strong> — collected only if you choose to verify your identity. This unlocks trust-sensitive features such as stokvel official roles, and lays the groundwork for an eventual biometric verification step. We treat this as sensitive information (see below).</p>
        <p><strong className="text-ink">Profile photo</strong> — optional, shown to other members and, if you verify your identity, used as a face reference alongside your ID document.</p>
      </Section>

      <Section title="Your ID number and ID photo, specifically">
        <p>
          Because a leaked ID number or ID photo can enable identity theft, we handle these
          differently from the rest of your profile:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your ID number is encrypted before it is stored. iCamagu staff cannot read it directly from the database — only the last 4 digits are kept in plain text, so you and reviewers can reference "the ID ending in 1234."</li>
          <li>Only an admin actively reviewing your submission can decrypt and view your full ID number and document photo, and only for as long as your review is pending.</li>
          <li>We do not currently perform automated facial recognition or biometric matching. If we introduce that in future, it will be through a dedicated, vetted identity-verification provider — never something we build or fake ourselves — and we will update this policy and ask for your consent again before switching it on.</li>
          <li>You choose when to submit this information. It is never required to create an account or use most of the app — only for the specific features that need verified trust (e.g. holding a stokvel official role).</li>
          <li>You can ask us to delete your submitted ID number and document at any time by contacting us, unless we're required to keep a record for legal or audit reasons.</li>
        </ul>
      </Section>

      <Section title="Your consent">
        <p>
          Where we ask for your ID number and document photo, we ask for your explicit consent
          first, and explain what it will be used for at that point. You can withdraw consent
          for future processing at any time, though this may mean losing access to features
          that require a verified identity.
        </p>
      </Section>

      <Section title="Who we share information with">
        <p>
          We do not sell your personal information. We share it only where necessary to run the
          Platform:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Our hosting and database providers (Render and Supabase), who store data on our behalf under their own security commitments.</li>
          <li>Our email provider (Resend), to send account and notification emails.</li>
          <li>Other iCamagu members, but only the profile details you choose to make visible (e.g. your name, Iziduko, and profile photo in Iziduko Network) — never your ID number, financial history, or contact details unless you share them yourself.</li>
          <li>Stokvel officials of a stokvel you belong to, limited to the contribution and payout records needed to run that stokvel.</li>
        </ul>
        <p>
          Some of these providers may process data on servers outside South Africa. Where that
          happens, we rely on providers that maintain appropriate security safeguards for that
          transfer.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your information for as long as your account is active. If you delete your
          account, we remove your personal information; financial records connected to stokvels
          are anonymised rather than deleted outright, so that other members' shared financial
          history stays accurate and auditable.
        </p>
      </Section>

      <Section title="Your rights under POPIA">
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Know what personal information we hold about you, and get a copy of it — use "Download My Data" under Account & Privacy.</li>
          <li>Ask us to correct information that is wrong or out of date.</li>
          <li>Ask us to delete your account and personal information — use "Delete My Account" under Account & Privacy.</li>
          <li>Object to certain processing, or withdraw consent you previously gave.</li>
          <li>Lodge a complaint with South Africa's Information Regulator if you believe we've mishandled your information (<span className="text-ink">inforeg.org.za</span>).</li>
        </ul>
      </Section>

      <Section title="Keeping your data secure">
        <p>
          We use industry-standard measures to protect your information: encrypted storage for
          sensitive fields like your ID number, PIN confirmation for financial actions, and
          access tokens that are never stored in a way that's exposed to other sites in your
          browser. No system is perfectly secure, but we take reasonable steps appropriate to
          the sensitivity of what we hold.
        </p>
      </Section>

      <Section title="Children">
        <p>
          iCamagu is not intended for children. If you believe a child has created an account,
          please contact us so we can remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make material changes — especially to how we handle ID numbers, photos, or any
          future biometric feature — we'll update this page and, where the change affects
          consent you've already given, ask for it again.
        </p>
      </Section>
    </div>
  )
}

export default PrivacyPolicy
