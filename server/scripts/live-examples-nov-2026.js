// Live examples (founder, 23 Nov 2026): "an example must be the full system
// of that section: a stokvel with everything in it, ledgers, penalties...,
// a ceremony with everything in it, and everything clickable, so it feels like
// an actual journey". So these are real records, built with the app's own
// steps (the same handlers a member's taps call), replaying a year: a grocery
// stokvel, an umgidi drinks pool and an ulwaluko-to-umgidi plan.
//
// - The people are example people (email @examples.i-camagu.invalid): they
//   cannot sign in, and every screen marks the record as an example.
// - Every member can open them and click every tab, seen as the treasurer or
//   the host; nothing in them can be changed (services/exampleAccess.js).
// - Money moves through the real ledger, so the books balance and the hash
//   chain verifies; each entry carries the day it belongs to.
// Built once, in the background after start-up. A half-built example (the
// server stopped part-way) is set aside and built again.
import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { runAt } from '../utils/clock.js';
import { ensureLedgerTables, lockStokvelLedger, postEntryTx } from '../services/ledgerService.js';
import { generateReferenceCode } from '../utils/memberReference.js';
import { EXAMPLE_EMAIL_DOMAIN, loadExamples } from '../services/exampleAccess.js';
import { createStokvel } from '../controllers/stokvelController.js';
import { setOfficial } from '../controllers/stokvelOfficialsController.js';
import { recordInterest } from '../controllers/contributionController.js';
import { postAnnouncement } from '../controllers/announcementController.js';
import { createMinutes, issueFine, payFine, saveConstitution } from '../controllers/stokvelRecordsController.js';
import { requestLoan, voteLoan, repayLoan, createTradeCredit } from '../controllers/stokvelFinanceController.js';
import { setLendingTarget, recordLendingRound } from '../controllers/stokvelLendingController.js';
import { requestExpense } from '../controllers/stokvelApprovalsController.js';
import { createAutoCeremony, addPledge } from '../controllers/ceremonyController.js';
import { addHireItems, setCostActual } from '../controllers/ceremonyCostController.js';
import { generateDefaultGroups, updateGroup, setGroupAllocation } from '../controllers/hierarchyController.js';
import { EXAMPLE_PHOTO, EXAMPLE_SIGNATURE } from './live-examples-images.js';
import { dueDateFor } from '../../shared/ceremonyTiming.js';

export const FIX_NAME = 'live-examples-2026-11-23';
const at = (s) => new Date(`${s}T09:00:00+02:00`);

// ---------- calling the app's own handlers ----------

async function call(handler, { userId, params = {}, body = {}, query = {} }, when) {
  let status = 200;
  let data;
  const res = {
    status(c) { status = c; return res; },
    json(d) { data = d; return res; },
    set() { return res; },
    send(d) { data = d; return res; },
  };
  const req = { userId, user: { id: userId }, params, body, query, headers: {}, ip: '127.0.0.1' };
  await runAt(when, () => handler(req, res));
  if (status >= 400) throw new Error(`${handler.name || 'handler'} refused (${status}): ${data?.error || ''}`);
  return data;
}

// Rows the handlers stamp with the database clock are given the day they
// belong to (the ledger itself is dated through runAt).
const DATED = [
  ['StokvelAuditLog', ['createdAt']], ['StokvelMinutes', ['createdAt']], ['StokvelFine', ['createdAt', 'paidAt']],
  ['StokvelLoan', ['createdAt', 'agreedAt', 'decidedAt', 'updatedAt']], ['StokvelLoanVote', ['createdAt']], ['StokvelLoanRepayment', ['createdAt']],
  ['StokvelLendingEntry', ['createdAt']], ['StokvelLendingTarget', ['createdAt', 'updatedAt']], ['StokvelAnnouncement', ['createdAt']],
  ['StokvelTradeCredit', ['createdAt', 'updatedAt']], ['StokvelExpenseRequest', ['createdAt']], ['Contribution', ['createdAt']], ['Payout', ['createdAt']],
];
async function redate(stokvelId, since, when) {
  for (const [table, cols] of DATED) {
    for (const col of cols) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${col}" = $1 WHERE "stokvelId" = $2 AND "${col}" >= $3`, when, stokvelId, since);
      } catch { /* that table or column does not exist: nothing to date */ }
    }
  }
}
async function step(stokvelId, handler, args, when) {
  const since = new Date(Date.now() - 1500);
  const data = await call(handler, args, when);
  await redate(stokvelId, since, when);
  return data;
}

// A confirmed payment, written exactly as confirmContribution writes it (the
// official's PIN check is the only step left out: example people have none).
async function confirmedContribution({ stokvelId, member, amount, when, approverId, note }) {
  const cents = Math.round(amount * 100);
  await runAt(when, () => prisma.$transaction(async (tx) => {
    await lockStokvelLedger(tx, stokvelId);
    const c = await tx.contribution.create({ data: { stokvelId, memberId: member.membershipId, amount, status: 'CONFIRMED', note, createdAt: when } });
    await tx.stokvelGroupLedger.update({ where: { stokvelId }, data: { totalBalance: { increment: amount } } });
    await postEntryTx(tx, {
      stokvelId, kind: 'CONTRIBUTION', memo: `Contribution: ${note}`,
      lines: [{ account: 'BANK', amountCents: cents }, { account: 'CONTRIBUTIONS', amountCents: -cents }],
      idempotencyKey: `contribution:${c.id}`, createdById: member.userId, approvedById: approverId,
    });
  }, { timeout: 20000 }));
}

// ---------- example people ----------

const FIRST = ['Nomvula', 'Thandeka', 'Lindiwe', 'Sipho', 'Zolile', 'Nomsa', 'Bongani', 'Ayanda', 'Siphokazi', 'Lwazi', 'Nobuhle', 'Zukisa', 'Asanda', 'Thembeka', 'Mzwandile',
  'Andile', 'Unathi', 'Xolani', 'Nandipha', 'Luvuyo', 'Ntombi', 'Vuyo', 'Sinazo', 'Mandla', 'Akhona'];
const LAST = ['Dyantyi', 'Nkwinti', 'Sobekwa', 'Mangcu', 'Ntsebeza', 'Mafani', 'Booi', 'Jaxa', 'Somdaka', 'Tshangela', 'Mapekula', 'Gqirana', 'Bikitsha', 'Ngcukana', 'Mbiza'];

async function examplePerson(n) {
  const firstName = FIRST[n % FIRST.length];
  const lastName = LAST[(n * 7 + Math.floor(n / FIRST.length)) % LAST.length];
  const email = `person${n}@${EXAMPLE_EMAIL_DOMAIN}`;
  return prisma.user.upsert({ where: { email }, update: {}, create: { email, firstName, lastName, location: 'Gqeberha' } });
}

async function addMembers(stokvelId, people, when) {
  const members = [];
  for (const [i, p] of people.entries()) {
    let m = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: p.id } });
    if (!m) m = await prisma.stokvelMember.create({ data: { stokvelId, userId: p.id, referenceCode: await generateReferenceCode(p.firstName, i + 1), joinedAt: when } });
    members.push({ userId: p.id, membershipId: m.id, firstName: p.firstName, name: `${p.firstName} ${p.lastName}` });
  }
  return members;
}

// A half-built example is set aside (renamed; the ledger keeps its rows, as it
// must) so a fresh one is built and only complete ones are ever shown.
async function setAsideIncomplete(organiserId, name) {
  await prisma.stokvel.updateMany({ where: { organiserId, name }, data: { name: `${name} (incomplete)` } });
}

const day = (m, d) => at(`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'];

// ---------- 1. A grocery stokvel, every part of it used ----------

export async function buildGroceryStokvel() {
  const key = `${FIX_NAME}-grocery`;
  if (await prisma.dataFix.findUnique({ where: { name: key } })) return null;
  const NAME = 'Masibambane Grocery Stokvel';
  const people = [];
  for (let n = 0; n < 15; n += 1) people.push(await examplePerson(n));
  const [chair, treasurer, secretary] = people;
  await setAsideIncomplete(chair.id, NAME);

  const created = await call(createStokvel, { userId: chair.id, body: { name: NAME, type: 'GROCERY_STOKVEL', contributionAmount: '350', contributionFrequency: 'Monthly, by the 5th', targetDate: '2026-11-28' } }, day(1, 10));
  const stokvelId = created.stokvel.id;
  await prisma.stokvel.update({ where: { id: stokvelId }, data: { createdAt: day(1, 10) } });
  const members = await addMembers(stokvelId, people, day(1, 10));
  const S = (handler, args, when) => step(stokvelId, handler, { ...args, params: { stokvelId, ...(args.params || {}) } }, when);

  await S(setOfficial, { userId: chair.id, body: { memberUserId: treasurer.id, role: 'TREASURER' } }, day(1, 10));
  await S(setOfficial, { userId: chair.id, body: { memberUserId: secretary.id, role: 'SECRETARY' } }, day(1, 10));
  await S(saveConstitution, { userId: chair.id, body: {
    purpose: 'To save together every month and buy our year-end groceries in bulk, at group prices.',
    meetingFrequency: 'Every second month, and a year-end meeting', meetingDay: 'Third Saturday', meetingLocation: 'NU 7 community hall, Motherwell',
    contributionAmount: '350', contributionDueDay: '5', lateFineAmount: '50', lateFineDays: '5', absenceFineAmount: '30', maxAbsences: '3',
    payoutOrder: 'No rotation: at year end the groceries are bought together and shared equally.',
    payoutSchedule: 'Shopping day in the last week of November. What is left after groceries goes to each member for school uniform and stationery, with receipts.',
    membershipRequirements: 'A member pays R350 a month (R250 fridge, R100 dry goods) from January to November.',
    terminationRules: 'Three missed payments in a row, or three meetings missed without apology, ends membership; what you paid in is returned less fines.',
    bankName: 'African Bank (group savings account)', bankAccountHolder: 'Masibambane Grocery Stokvel', signatories: 'Chairperson and Treasurer, two signatures on every withdrawal',
    additionalRules: 'Each member may lend out what they have paid in, less a R100 retainer, at 30% interest. The interest comes back to the stokvel. Each member has a R1,000 interest target and pays any shortfall herself. Interest is shared equally.',
  } }, day(1, 10));
  await S(postAnnouncement, { userId: chair.id, body: { stokvelId, message: 'Welcome to Masibambane! R350 by the 5th of every month: R250 for the fridge, R100 for dry goods. First meeting Saturday 17 January.' } }, day(1, 11));
  await S(createMinutes, { userId: secretary.id, body: {
    date: '2026-01-17', location: 'NU 7 community hall, Motherwell', chairperson: chair.firstName, secretary: secretary.firstName,
    attendees: members.slice(0, 14).map((m) => m.name), apologies: [members[14].name],
    agendaItems: [
      { title: 'Opening and welcome', notes: 'Opened at 10:00 by the chairperson.' },
      { title: 'The year plan', notes: 'R350 a month, January to November. Shopping day in the last week of November.' },
      { title: 'Lending and interest', notes: 'Members may lend out what they paid in, less R100, at 30%. Interest target R1,000 each.' },
      { title: 'Fines', notes: 'R50 for paying after the 10th; R30 for missing a meeting without apology.' },
    ],
    actionItems: [{ task: 'Open the group bank account', owner: treasurer.firstName, due: '2026-01-31' }, { task: 'Share the constitution in the group', owner: secretary.firstName, due: '2026-01-24' }],
    nextMeetingDate: '2026-03-21', nextMeetingLocation: 'NU 7 community hall',
  } }, day(1, 17));
  await S(setLendingTarget, { userId: treasurer.id, body: { target: '1000' } }, day(1, 17));

  // Contributions, January to October: everyone pays between the 1st and the
  // 5th, except three late payments that earn the R50 fine.
  const late = { '3-6': 12, '6-10': 14, '8-3': 13 };
  const fines = [];
  for (let m = 1; m <= 10; m += 1) {
    for (const [i, member] of members.entries()) {
      const lateDay = late[`${m}-${i}`];
      const approverId = member.userId === treasurer.id ? chair.id : treasurer.id;
      await confirmedContribution({ stokvelId, member, amount: 350, when: day(m, lateDay || 1 + (i % 5)), approverId, note: MONTHS[m - 1] });
      if (lateDay) {
        const fine = await S(issueFine, { userId: treasurer.id, body: { memberId: member.userId, fineType: 'LATE_CONTRIBUTION', amount: '50', note: `${MONTHS[m - 1]} paid on the ${lateDay}th`, date: `2026-${String(m).padStart(2, '0')}-${lateDay}` } }, day(m, lateDay));
        fines.push(fine?.id || fine?.fine?.id);
      }
    }
  }
  // November: eleven paid and confirmed, four still waiting for the treasurer.
  for (const [i, member] of members.entries()) {
    if (i >= 11) {
      await prisma.contribution.create({ data: { stokvelId, memberId: member.membershipId, amount: 350, status: 'PENDING', note: 'November', createdAt: day(11, 3 + (i % 3)) } });
    } else {
      await confirmedContribution({ stokvelId, member, amount: 350, when: day(11, 1 + (i % 5)), approverId: member.userId === treasurer.id ? chair.id : treasurer.id, note: 'November' });
    }
  }
  // Two of the three fines paid; one still open.
  for (const id of fines.filter(Boolean).slice(0, 2)) await S(payFine, { userId: treasurer.id, params: { fineId: id } }, day(9, 20));

  // Lending: members lend out their share at 30% and bring it back with
  // interest, which the treasurer records as income.
  for (const [m, d] of [[4, 25], [7, 25], [10, 24]]) {
    let interest = 0;
    for (const [i, member] of members.entries()) {
      if ((i + m) % 3 === 0) continue;
      const lent = 600 + ((i * 37 + m * 11) % 5) * 100;
      const returned = Math.round(lent * 1.3);
      interest += returned - lent;
      await S(recordLendingRound, { userId: treasurer.id, body: { memberId: member.userId, lent: String(lent), returned: String(returned), note: `${MONTHS[m - 1]} round` } }, day(m, d));
    }
    await S(recordInterest, { userId: treasurer.id, body: { stokvelId, amount: String(interest), note: `Interest from the ${MONTHS[m - 1]} lending round (30%)` } }, day(m, d + 1));
  }

  // Loans from the group, with the signed agreement and two officials' votes.
  const loanTerms = { interestPercent: '30', rateBasis: 'ONE_TIME_FLAT', agreed: true, borrowerPhoto: EXAMPLE_PHOTO, signature: EXAMPLE_SIGNATURE };
  const loan1 = await S(requestLoan, { userId: members[8].userId, body: { ...loanTerms, amount: '1500', repayMonths: 3, reason: 'School transport for the second term' } }, day(5, 12));
  await S(voteLoan, { userId: chair.id, params: { loanId: loan1.id }, body: { approve: true } }, day(5, 13));
  await S(voteLoan, { userId: treasurer.id, params: { loanId: loan1.id }, body: { approve: true } }, day(5, 14));
  for (const [m, amt] of [[6, '650'], [7, '650'], [8, '650']]) await S(repayLoan, { userId: treasurer.id, params: { loanId: loan1.id }, body: { amount: amt } }, day(m, 28));
  const loan2 = await S(requestLoan, { userId: members[11].userId, body: { ...loanTerms, amount: '2000', repayMonths: 3, reason: 'Stock for my spaza shop' } }, day(10, 6));
  await S(voteLoan, { userId: chair.id, params: { loanId: loan2.id }, body: { approve: true } }, day(10, 7));
  await S(voteLoan, { userId: secretary.id, params: { loanId: loan2.id }, body: { approve: true } }, day(10, 8));
  await S(repayLoan, { userId: treasurer.id, params: { loanId: loan2.id }, body: { amount: '870' } }, day(11, 6));
  const loan3 = await S(requestLoan, { userId: members[4].userId, body: { ...loanTerms, amount: '1000', repayMonths: 2, reason: 'Funeral costs for my uncle' } }, day(11, 18));
  await S(voteLoan, { userId: chair.id, params: { loanId: loan3.id }, body: { approve: true } }, day(11, 19));

  // Trade credit: a supplier deal for the shopping day.
  await S(createTradeCredit, { userId: treasurer.id, body: { retailer: 'Makro Gqeberha (stokvel desk)', amount: '45000', discountPercent: '5', months: 1, purpose: 'Year-end bulk grocery order on shopping day' } }, day(10, 20));

  await S(postAnnouncement, { userId: chair.id, body: { stokvelId, message: 'Mid-year: every member is paid up to date. The interest so far is on the Statement tab.' } }, day(6, 21));
  await S(createMinutes, { userId: secretary.id, body: {
    date: '2026-06-20', location: 'NU 7 community hall', chairperson: chair.firstName, secretary: secretary.firstName,
    attendees: members.filter((_, i) => i !== 9 && i !== 12).map((m) => m.name), apologies: [members[9].name, members[12].name],
    agendaItems: [{ title: 'Treasurer’s report', notes: 'All contributions in for January to June. Two late payments fined.' }, { title: 'Loans', notes: `${members[8].firstName}’s loan approved in May; repayments start in June.` }],
    actionItems: [{ task: 'Ask Makro’s stokvel desk for the November quote', owner: treasurer.firstName, due: '2026-09-30' }],
    nextMeetingDate: '2026-10-17', nextMeetingLocation: 'NU 7 community hall',
  } }, day(6, 20));
  await S(createMinutes, { userId: secretary.id, body: {
    date: '2026-10-17', location: 'NU 7 community hall', chairperson: chair.firstName, secretary: secretary.firstName,
    attendees: members.map((m) => m.name), apologies: [],
    agendaItems: [{ title: 'Shopping day', notes: 'Saturday 28 November at Makro. R250 a month buys the fridge goods, R100 the dry goods.' }, { title: 'Uniform and stationery', notes: 'What is left after groceries is shared equally for school uniform and stationery, with receipts.' }],
    actionItems: [{ task: 'Confirm the order and the deposit', owner: treasurer.firstName, due: '2026-11-20' }, { task: 'Book the bakkie for shopping day', owner: chair.firstName, due: '2026-11-21' }],
    nextMeetingDate: '2026-11-28', nextMeetingLocation: 'Makro Gqeberha',
  } }, day(10, 17));
  await S(postAnnouncement, { userId: treasurer.id, body: { stokvelId, message: 'Shopping day is Saturday 28 November. Four of us still need to pay November: please do it this week.' } }, day(11, 16));
  // The deposit for the order waits for a second official's approval.
  await S(requestExpense, { userId: treasurer.id, body: { stokvelId, amount: '5000', note: 'Deposit for the year-end grocery order (Makro stokvel desk)' } }, day(11, 20));

  await prisma.dataFix.create({ data: { name: key } });
  return stokvelId;
}

// ---------- 2. An umgidi drinks pool: 50 members ----------

export async function buildDrinksPool() {
  const key = `${FIX_NAME}-drinks`;
  if (await prisma.dataFix.findUnique({ where: { name: key } })) return null;
  const NAME = 'Umgidi Drinks Pool';
  const people = [];
  for (let n = 15; n < 65; n += 1) people.push(await examplePerson(n));
  const [chair, treasurer, secretary] = people;
  await setAsideIncomplete(chair.id, NAME);

  const created = await call(createStokvel, { userId: chair.id, body: { name: NAME, type: 'ALCOHOL_BULK_POOL', contributionAmount: '1500', contributionFrequency: 'Monthly, February to November', targetAmount: '750000', targetDate: '2026-12-01' } }, day(1, 24));
  const stokvelId = created.stokvel.id;
  await prisma.stokvel.update({ where: { id: stokvelId }, data: { createdAt: day(1, 24) } });
  const members = await addMembers(stokvelId, people, day(1, 24));
  const S = (handler, args, when) => step(stokvelId, handler, { ...args, params: { stokvelId, ...(args.params || {}) } }, when);
  await S(setOfficial, { userId: chair.id, body: { memberUserId: treasurer.id, role: 'TREASURER' } }, day(1, 24));
  await S(setOfficial, { userId: chair.id, body: { memberUserId: secretary.id, role: 'SECRETARY' } }, day(1, 24));
  await S(saveConstitution, { userId: chair.id, body: {
    purpose: 'Fifty families with an umgidi this summer save together and buy the drinks as one big order at SmartMatch group prices.',
    meetingFrequency: 'Every second month', meetingDay: 'Last Sunday', meetingLocation: 'KwaDwesi community hall',
    contributionAmount: '1500', contributionDueDay: '7', lateFineAmount: '100', lateFineDays: '7',
    payoutOrder: 'No rotation: one combined order in December, shared per member.',
    payoutSchedule: 'Each member takes home 3 cases of brandy, 3 of gin, 10 of beer and 10 of cider. The interest the members raise closes the gap.',
    membershipRequirements: 'R1,500 a month from February to November (R15,000 each).',
    bankName: 'GoTyme (group account)', bankAccountHolder: 'Umgidi Drinks Pool', signatories: 'Chairperson and Treasurer',
  } }, day(1, 24));
  for (let m = 2; m <= 11; m += 1) {
    for (const [i, member] of members.entries()) {
      const pending = m === 11 && i >= 44;
      const when = day(m, 1 + (i % 7));
      if (pending) {
        await prisma.contribution.create({ data: { stokvelId, memberId: member.membershipId, amount: 1500, status: 'PENDING', note: 'November', createdAt: when } });
        continue;
      }
      await confirmedContribution({ stokvelId, member, amount: 1500, when, approverId: member.userId === treasurer.id ? chair.id : treasurer.id, note: MONTHS[m - 1] });
    }
    if (m % 3 === 1) await S(recordInterest, { userId: treasurer.id, body: { stokvelId, amount: String(4200 + m * 310), note: `Interest raised by members, ${MONTHS[m - 1]}` } }, day(m, 27));
  }
  await S(issueFine, { userId: treasurer.id, body: { memberId: members[17].userId, fineType: 'LATE_CONTRIBUTION', amount: '100', note: 'July paid on the 15th', date: '2026-07-15' } }, day(7, 15));
  await S(createMinutes, { userId: secretary.id, body: {
    date: '2026-02-22', location: 'KwaDwesi community hall', chairperson: chair.firstName, secretary: secretary.firstName,
    attendees: members.slice(0, 46).map((m) => m.name), apologies: members.slice(46).map((m) => m.name),
    agendaItems: [{ title: 'The order', notes: '3 brandy, 3 gin, 10 beer, 10 cider per member: 150 + 150 + 500 + 500 cases.' }, { title: 'The gap', notes: 'Saving alone falls short at today’s prices; each member raises interest to close it.' }],
    actionItems: [{ task: 'Get SmartMatch prices for the full order', owner: treasurer.firstName, due: '2026-03-31' }],
    nextMeetingDate: '2026-04-26', nextMeetingLocation: 'KwaDwesi community hall',
  } }, day(2, 22));
  await S(postAnnouncement, { userId: chair.id, body: { stokvelId, message: 'The order goes in on 1 December so the drinks arrive before the first imigidi. Six of us still owe November.' } }, day(11, 18));
  await prisma.dataFix.create({ data: { name: key } });
  return stokvelId;
}

// ---------- 3. Ulwaluko to umgidi: the whole plan ----------

export async function buildCeremony(savingStokvelId) {
  const key = `${FIX_NAME}-ceremony`;
  if (await prisma.dataFix.findUnique({ where: { name: key } })) return null;
  const host = await examplePerson(70);
  const TITLE = 'Ulwaluko lukaLwazi';
  // A half-built example ceremony is removed and built again (ceremonies have
  // no ledger, so nothing has to be kept).
  for (const c of await prisma.ceremony.findMany({ where: { hostId: host.id, title: TITLE }, select: { id: true } })) {
    await prisma.ceremony.delete({ where: { id: c.id } }).catch(() => {});
  }
  // The journey is always under way when the example is built: going to the
  // mountain in twelve days, umgidi six weeks after that.
  const goesIn = new Date(Date.now() + 12 * 86400000);
  const umgidi = new Date(Date.now() + 54 * 86400000);
  const made = await call(createAutoCeremony, { userId: host.id, body: {
    title: TITLE, type: 'ULWALUKO', eventDate: goesIn.toISOString().slice(0, 10), homecomingDate: umgidi.toISOString().slice(0, 10), guestCount: 150, budgetZAR: 65000, visibility: 'PRIVATE', createPlan: true,
    notes: 'Lwazi goes to the mountain in twelve days; umgidi about six weeks later.',
  } }, day(9, 6));
  const ceremony = made.ceremony || made;
  const planId = made.preparationPlan?.id;
  await prisma.ceremony.update({ where: { id: ceremony.id }, data: { savingStokvelId: savingStokvelId || null } });

  // Everything due by now is done (bought, with what was paid, or ticked);
  // everything later is still to come, as in a real journey.
  const full = await prisma.ceremony.findUnique({ where: { id: ceremony.id } });
  // A family that prepares well is also ahead on the next ten days.
  const doneBy = new Date(Date.now() + 10 * 86400000);
  const isDue = (phase) => { const due = dueDateFor(phase, full); return due && due < doneBy; };
  const costs = await prisma.ceremonyCostItem.findMany({ where: { ceremonyId: ceremony.id }, orderBy: { createdAt: 'asc' } });
  for (const item of costs) {
    if (!isDue(item.phase)) continue;
    const planned = Number(item.unitCost || 0) * Number(item.quantity || 1);
    if (planned > 0) await call(setCostActual, { userId: host.id, params: { id: item.id }, body: { actualCostZAR: Math.round(planned * 0.94) } }, day(10, 10));
    else await prisma.ceremonyCostItem.update({ where: { id: item.id }, data: { isPurchased: true } });
  }
  const tasks = await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: ceremony.id } });
  for (const t of tasks) if (isDue(t.phase)) await prisma.ceremonyChecklistItem.update({ where: { id: t.id }, data: { isCompleted: true } });
  if (planId) {
    const items = await prisma.checklistItem.findMany({ where: { planId } });
    for (const t of items) if (isDue(t.phase)) await prisma.checklistItem.update({ where: { id: t.id }, data: { isChecked: true } }).catch(() => {});
  }
  await call(addHireItems, { userId: host.id, params: { id: ceremony.id }, body: { items: ['tent_bundle', 'kitchen_gazebo', 'mobile_fridge', 'benches', 'lights', 'gas_stove', 'big_pots', 'urn'] } }, day(10, 20));

  // Seating: every group in its place, with its numbers and its share.
  await call(generateDefaultGroups, { userId: host.id, body: { ceremonyId: ceremony.id } }, day(10, 25));
  const sizes = { Ootata: 30, 'Isekela lika Tata': 6, OoMama: 30, 'Isekela lika Mama': 6, Abayeni: 8, Abafazi: 12, 'Abafana belali': 20, 'Iintombi zelali': 15, 'Abafana bekhaya': 6, 'Iintombi zekhaya': 6, 'Indlu yeSbane': 10, 'Young boys and girls': 15, 'Personal friends': 10, 'VIP guests': 6 };
  const groups = await prisma.ceremonyGroup.findMany({ where: { ceremonyId: ceremony.id } });
  for (const g of groups) {
    if (sizes[g.groupLabel]) await call(updateGroup, { userId: host.id, params: { groupId: g.id }, body: { estimatedSize: sizes[g.groupLabel] } }, day(10, 25));
  }
  const shares = { Ootata: [['Brandy (750 ml)', 12, 'bottles'], ['Beer (quarts)', 4, 'cases']], OoMama: [['Gin (750 ml)', 8, 'bottles'], ['Cider (dumpies)', 4, 'cases']], 'Abafana belali': [['Beer (quarts)', 3, 'cases']], 'Indlu yeSbane': [['Brandy (750 ml)', 4, 'bottles']] };
  for (const g of groups) {
    for (const [itemDescription, quantity, unitType] of shares[g.groupLabel] || []) {
      await call(setGroupAllocation, { userId: host.id, body: { ceremonyGroupId: g.id, itemDescription, quantity, unitType } }, day(10, 26)).catch(() => {});
    }
  }
  // What the family has promised to bring.
  if (planId) {
    for (const [pledgerName, relationship, pledgedItem, pledgedAmountZAR] of [
      ['Malume Zolile', 'Mother’s brother', 'The sheep for umgidi', 2800], ['Makazi Nomsa', 'Mother’s sister', 'Two 10 kg bags of samp', 400],
      ['Tatomkhulu Sipho', 'Grandfather', 'Cash towards the drinks', 3000], ['Sisi Lindiwe', 'Elder sister', 'The new clothes for the homecoming', 2500],
      ['Bhuti Bongani', 'Cousin', 'The gas and the bakkie for the hire', 900], ['Umakhelwane Ayanda', 'Neighbour', 'Help in the kitchen and two big pots', 0],
    ]) {
      await call(addPledge, { userId: host.id, body: { planId, pledgerName, relationship, pledgedItem, pledgedAmountZAR } }, day(10, 30)).catch(() => {});
    }
  }
  // Who is coming: thirty of the clan, with their guests.
  for (let n = 15; n < 45; n += 1) {
    const p = await examplePerson(n);
    await prisma.ceremonyAttendance.upsert({ where: { ceremonyId_userId: { ceremonyId: ceremony.id, userId: p.id } }, update: {}, create: { ceremonyId: ceremony.id, userId: p.id, coming: n % 9 !== 0, guests: 1 + (n % 3) } });
  }
  await prisma.dataFix.create({ data: { name: key } });
  return ceremony.id;
}

let running = null;
export function buildLiveExamples() {
  if (running) return running;
  running = (async () => {
    if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) { await loadExamples(); return { skipped: true }; }
    await ensureLedgerTables();
    await buildGroceryStokvel();
    const drinksId = await buildDrinksPool();
    const pool = drinksId || (await prisma.stokvel.findFirst({ where: { name: 'Umgidi Drinks Pool', organiser: { email: { endsWith: `@${EXAMPLE_EMAIL_DOMAIN}` } } }, select: { id: true } }))?.id;
    await buildCeremony(pool);
    await prisma.dataFix.create({ data: { name: FIX_NAME } });
    const list = await loadExamples();
    console.log(`Live examples ready: ${list.stokvels.length} stokvel(s), ${list.ceremonies.length} ceremony(ies).`);
    return { skipped: false };
  })().finally(() => { running = null; });
  return running;
}
