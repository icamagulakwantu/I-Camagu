import resend from '../config/email.js';
import { ADMIN_EMAILS } from '../config/admin.js';
import { PALLET_CASES } from '../utils/smartMatchTiers.js';

const EKOYINI_BUSINESS_EMAIL = 'ekoyinimobilebar@gmail.com';

function row(label, value) {
      return value ? `<p><strong>${label}:</strong> ${value}</p>` : '';
}

export async function notifyEkoyiniOfQuoteRequest(q) {
      try {
              await resend.emails.send({
                        from: 'onboarding@resend.dev',
                              to: EKOYINI_BUSINESS_EMAIL,
                                    subject: `New Quote Request — ${q.fullName} ${q.surname} — ${q.packageSelected}`,
                                          html: `
                                                  <h2>New Ekoyini Mobile Bar Quote Request</h2>

                                                          <h3>Client Information</h3>
                                                                  ${row('Name', `${q.fullName} ${q.surname}`)}
                                                                          ${row('Email', q.clientEmail)}
                                                                                  ${row('Cell', q.cellPhone)}
                                                                                          ${row('WhatsApp', q.whatsappNumber)}
                                                                                                  ${row('Alt Contact', q.altContactName ? `${q.altContactName} (${q.altContactNumber || 'no number'})` : '')}
                                                                                                          ${row('How they heard about us', q.hearAboutUs)}
                                                                                                                  ${row('Referral', q.referralName)}

                                                                                                                          <h3>Event Details</h3>
                                                                                                                                  ${row('Type', q.otherEventType || q.eventType.replace(/_/g, ' '))}
                                                                                                                                          ${row('Date', new Date(q.eventDate).toLocaleDateString())}
                                                                                                                                                  ${row('Event Time', q.eventStartTime && q.eventEndTime ? `${q.eventStartTime} - ${q.eventEndTime}` : '')}
                                                                                                                                                          ${row('Bar Service Window', q.barServiceStart && q.barServiceEnd ? `${q.barServiceStart} - ${q.barServiceEnd}` : '')}
                                                                                                                                                                  ${row('Setup Access', q.setupAccessTime)}
                                                                                                                                                                          ${row('Breakdown Complete By', q.breakdownCompleteBy)}

                                                                                                                                                                                  <h3>Venue & Location</h3>
                                                                                                                                                                                          ${row('Venue', q.venueName)}
                                                                                                                                                                                                  ${row('Address', q.physicalAddress)}
                                                                                                                                                                                                          ${row('Area', q.venueArea)}
                                                                                                                                                                                                                  ${row('City', q.city)}
                                                                                                                                                                                                                          ${row('Venue Type', q.venueType)}
                                                                                                                                                                                                                                  ${row('Parking', q.parkingAvailable + (q.parkingNote ? ` — ${q.parkingNote}` : ''))}
                                                                                                                                                                                                                                          ${row('Power Access', q.powerAccess)}
                                                                                                                                                                                                                                                  ${row('Water Access', q.waterAccess)}

                                                                                                                                                                                                                                                          <h3>Guests</h3>
                                                                                                                                                                                                                                                                  ${row('Guest Count', q.guestCount)}
                                                                                                                                                                                                                                                                          ${row('Age Ranges', q.ageRanges)}
                                                                                                                                                                                                                                                                                  ${row('Minors Present', q.minorsPresent ? 'Yes' : 'No')}
                                                                                                                                                                                                                                                                                          ${row('Non-Alcoholic Options Needed', q.nonAlcoholicNeeded ? 'Yes' : 'No')}

                                                                                                                                                                                                                                                                                                  <h3>Package & Add-Ons</h3>
                                                                                                                                                                                                                                                                                                          ${row('Package', q.packageSelected)}
                                                                                                                                                                                                                                                                                                                  ${q.packageSelected === 'CUSTOM' ? row('Custom Estimate', `${q.customGuestCount || '?'} guests, budget ${q.customBudget || 'not specified'}`) : ''}
                                                                                                                                                                                                                                                                                                                          ${row('Add-Ons', q.addOns)}
                                                                                                                                                                                                                                                                                                                                  ${row('Extra Hookah Pipes', q.additionalHookahPipes)}
                                                                                                                                                                                                                                                                                                                                          ${row('Other Requests', q.otherRequests)}

                                                                                                                                                                                                                                                                                                                                                  <h3>Bar & Drink Preferences</h3>
                                                                                                                                                                                                                                                                                                                                                          ${row('Menu Style', q.drinkMenuStyle)}
                                                                                                                                                                                                                                                                                                                                                                  ${row('Specific Brands', q.specificBrands)}
                                                                                                                                                                                                                                                                                                                                                                          ${row('Alcohol Supplier', q.alcoholSupplier)}
                                                                                                                                                                                                                                                                                                                                                                                  ${row('Budget Per Person', q.budgetPerPerson)}
                                                                                                                                                                                                                                                                                                                                                                                          ${row('Allergies / Dietary', q.allergiesInfo)}

                                                                                                                                                                                                                                                                                                                                                                                                  <h3>Logistics</h3>
                                                                                                                                                                                                                                                                                                                                                                                                          ${row('VIP Area', q.vipAreaNeeded ? `Yes — ${q.vipGuestCount || '?'} guests` : 'No')}
                                                                                                                                                                                                                                                                                                                                                                                                                  ${row('Toast/Speech Moment', q.toastSpeechMoment ? 'Yes' : 'No')}
                                                                                                                                                                                                                                                                                                                                                                                                                          ${row('Dress Code / Theme', q.dressCodeTheme)}
                                                                                                                                                                                                                                                                                                                                                                                                                                  ${row('Cultural Protocols', q.culturalProtocols)}
                                                                                                                                                                                                                                                                                                                                                                                                                                          ${row('Setup Restrictions', q.setupRestrictions)}
                                                                                                                                                                                                                                                                                                                                                                                                                                                  ${row('Preferred Payment', q.preferredPaymentMethod)}

                                                                                                                                                                                                                                                                                                                                                                                                                                                          <p style="color:#888;font-size:12px;">Submitted via iCamagu — Quote ID: ${q.id}</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                `,
              });
      } catch (error) {
              console.error('Ekoyini quote notification failed:', error.message);
      }
}

export async function notifyEkoyiniOfBooking(booking, ceremony, host) {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: EKOYINI_BUSINESS_EMAIL,
      subject: `New Bar Service Booking — ${host?.firstName || ''} ${host?.lastName || ''}`.trim(),
      html: `
        <h2>New Ekoyini Mobile Bar Booking Request</h2>
        ${row('Host', `${host?.firstName || ''} ${host?.lastName || ''}`.trim())}
        ${row('Host Email', host?.email)}
        ${row('Host Phone', host?.phoneNumber)}
        ${row('Ceremony', ceremony?.type)}
        ${row('Booking ID', booking?.id)}
        ${row('Status', booking?.status)}
      `,
    });
  } catch (error) {
    console.error('Ekoyini booking notification failed:', error.message);
  }
}

export async function confirmQuoteToClient(q) {
      try {
              await resend.emails.send({
                        from: 'onboarding@resend.dev',
                              to: q.clientEmail,
                                    subject: 'We received your Ekoyini Mobile Bar quote request',
                                          html: `
                                                  <p>Camagu ${q.fullName},</p>
                                                          <p>Thank you for your interest in Ekoyini Mobile Bar — "Where Heritage Meets Luxury."</p>
                                                                  <p>We've received your full request for the <strong>${q.packageSelected}</strong> package for your
                                                                          ${q.eventType.replace(/_/g, ' ').toLowerCase()} on ${new Date(q.eventDate).toLocaleDateString()},
                                                                                  and have all the details we need to prepare your quote — no follow-up questions needed on our end.</p>
                                                                                          <p>We'll be in touch shortly with your quote and next steps.</p>
                                                                                                  <p>We handle the bar. You enjoy the moment.<br/>— Ekoyini Mobile Bar</p>
                                                                                                        `,
              });
      } catch (error) {
              console.error('Client quote confirmation email failed:', error.message);
      }
}

// Internal-only alert: tells the founder a real SmartMatch pool crossed a
// real pallet-volume tier, so they know it's time to go negotiate with a
// wholesaler/distributor. Never sent to any external company — that pitch
// stays a manual, founder-reviewed step until real committed volume and a
// real trade relationship exist.
export async function notifyAdminOfSmartMatchTier(pool, tier, currentCases) {
  try {
    const pallets = (currentCases / PALLET_CASES).toFixed(2);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ADMIN_EMAILS,
      subject: `SmartMatch: ${pool.partner?.name || 'A pool'} hit ${tier.name} (${pallets} pallets)`,
      html: `
        <h2>SmartMatch pool crossed a tier</h2>
        <p><strong>${tier.name}</strong> unlocked (Tier ${tier.id}).</p>
        ${row('Partner', pool.partner?.name)}
        ${row('Area', pool.area)}
        ${row('Total cases', currentCases)}
        ${row('Pallets', pallets)}
        ${row('MOQ target', pool.moqTarget)}
        ${row('Pool ID', pool.id)}
        <p style="color:#888;font-size:12px;">This is an internal alert only — no email has been sent to any supplier or manufacturer. Review the real numbers before reaching out to anyone.</p>
      `,
    });
  } catch (error) {
    console.error('SmartMatch tier admin notification failed:', error.message);
  }
}

export async function notifyPayoutCleared(recipientEmail, recipientName, amount, stokvelName, contributionAmount) {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `Your payout of R${amount.toFixed(2)} has cleared`,
      html: `
        <p>Camagu ${recipientName},</p>
        <p>Your payout from <strong>${stokvelName}</strong> has been approved and cleared.</p>
        <p><strong>Amount: R${amount.toFixed(2)}</strong></p>
        ${contributionAmount ? `<p style="color:#888;font-size:13px;">Includes a R${contributionAmount.toFixed(2)} voluntary Ubuhlanti bakwa Xhosa contribution, as you chose when requesting this payout — itemised transparently as always.</p>` : ''}
        <p>Log in to iCamagu to see your full ledger.</p>
        <p>Culture before capital.<br/>— iCamagu</p>
      `,
    });
  } catch (error) {
    console.error('Payout cleared notification failed:', error.message);
  }
}

// Public donation pledge to Ubuhlanti bakwa Xhosa — admin-only alert (never
// sent to any external party). There's no live payment gateway or bank
// details on file yet, so this is the founder's cue to follow up personally
// and confirm the real transfer.
export async function notifyAdminOfShrineDonationPledge(donation, donor) {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ADMIN_EMAILS,
      subject: `Ubuhlanti bakwa Xhosa: new donation pledge — R${parseFloat(donation.amount).toFixed(2)}`,
      html: `
        <h2>New Ubuhlanti bakwa Xhosa donation pledge</h2>
        ${row('Amount', `R${parseFloat(donation.amount).toFixed(2)}`)}
        ${row('Donor name (given)', donation.donorName)}
        ${row('Donor email (given)', donation.donorEmail)}
        ${row('Logged-in account', donor ? `${donor.firstName || ''} ${donor.lastName || ''} (${donor.email || 'no email'})`.trim() : null)}
        ${row('Pledge ID', donation.id)}
        <p style="color:#888;font-size:12px;">Status is PENDING — follow up directly to confirm the real transfer and mark it CONFIRMED.</p>
      `,
    });
  } catch (error) {
    console.error('Shrine donation pledge admin notification failed:', error.message);
  }
}
