// One clan, many forms. The founder (23 Nov 2026): Tshawe is the ancestor;
// AmaTshawe is the plural (the clan's people); MamTshawe is what a woman of
// the clan calls herself. All three are the same clan, and this holds for
// every clan, so the app must recognise any form straight away.
//
// The forms handled here:
//   plural        AmaTshawe, Ama-Tshawe, Ama Tshawe, AbaThembu, OoNcibane
//   female        MamTshawe, Mam-Tshawe, MaTshawe, Ma-Tshawe, MaMpinga
//   one person    Mzangwa (of AmaZangwa), Mkhwemte (of AmaKhwemte)
//   how people say it   uTshawe, ngu Tshawe, ndingu Tshawe, Tshawe clan
//
// A clan's own registered name always wins: "Madiba" is the clan Madiba, never
// Ma + diba, and "Mpinga" is Mpinga, never M + pinga. The other readings are
// only tried when the text as typed matches no registered name exactly, and
// only an exact match on one of them counts, never a guess.

const PLURAL = /^(?:abakwa|akwa|ama|aba|abe|oo|o)\s*/i

export function normaliseIsiduko(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()
    .replace(PLURAL, '')
    .replace(/[^a-z0-9]/g, '')
}

// Words around the clan name: "ngu Tshawe", "Ndingu MamTshawe", "nguTshawe",
// "Tshawe clan", "isiduko sam ngu Tshawe". "ngu" only counts before a space,
// a hyphen or a capital, so Ngubengcuka keeps its name.
function bareName(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:isiduko\s+(?:sam|sami|sethu)\s+)/i, '')
    .replace(/^(?:[Nn]dingu|[Nn]gu|[Nn]dim)(?:[-\s]+|(?=[A-Z]))/, '')
    .replace(/\s+(?:clan|family|isiduko)$/i, '')
    .trim()
}

// Female forms of a clan name: a woman of AmaCirha is MamCirha, of
// AmaTshawe Mam-Tshawe. Only "Mam" (with or without a hyphen or space) or
// "Ma-" / "Ma " is read as the female prefix here, so a clan name that simply
// starts with "Ma" (Madiba, Majola) is never cut in search. Returns the
// possible clan roots, or [] when the text is not a female form. "MaMadiba"
// could be Ma + Madiba or Mam + adiba, so both are tried. (isidukoReadings
// below also tries "MaTshawe" written together, for exact matches only.)
export function femaleRoots(value) {
  const text = bareName(value)
  const mam = text.match(/^mam[-\s]?(.{2,})$/i)
  if (mam) return /^m[aeiou]/i.test(text.slice(2)) ? [mam[1], text.slice(2)] : [mam[1]]
  const ma = text.match(/^ma[-\s](.{2,})$/i)
  return ma ? [ma[1]] : []
}

// The female form shown beside a clan: Mam before most roots (MamCirha,
// MamTshawe), Ma before a root that starts with M (MaMadiba).
export function femaleForm(head) {
  const root = String(head || '').replace(/^(?:Abakwa|Akwa|Ama|Aba|Abe|Oo)(?=[A-Z])/, '')
  if (!root) return null
  return /^M/.test(root) ? `Ma${root}` : `Mam${root}`
}

// Every reading of what someone typed, best first, as normalised keys. The
// first is the text as typed; the rest are only for when that finds nothing.
export function isidukoReadings(value) {
  const typed = normaliseIsiduko(value)
  const bare = bareName(value)
  const keys = [typed, normaliseIsiduko(bare)]
  // uTshawe: "u" before a name. Only before a capital or a space, so a clan
  // spelt with a U is never cut.
  const u = bare.match(/^[uU](?:[-\s]+|(?=[A-Z]))(.{2,})$/)
  if (u) keys.push(normaliseIsiduko(u[1]))
  for (const root of femaleRoots(bare)) keys.push(normaliseIsiduko(root))
  // MaTshawe, Mamthunzi (Ma + Mthunzi), Mankomo (Ma + Nkomo), written together.
  const ma = bare.match(/^ma(.{2,})$/i)
  if (ma) keys.push(normaliseIsiduko(ma[1]))
  // One person of the clan: Mzangwa of AmaZangwa. And the other way: someone
  // who types Qwathi when the clan is registered as AmaMqwathi.
  for (const key of [...keys]) {
    if (/^m[^aeiou]/.test(key) && key.length > 3) keys.push(key.slice(1))
    else if (/^[^aeioum]/.test(key)) keys.push('m' + key)
  }
  return [...new Set(keys.filter((k) => k.length >= 2))]
}

// The keys two members' clan names are compared by, without the register
// (for example a ceremony host and a guest). Stricter than isidukoReadings,
// because there is no list of real clans to check against: the plural (Ama-),
// the female form (Mam-, or Ma before a capital: MaTshawe), "u"/"ngu" and the
// one-person M (Mzangwa, Mkhwemte) are taken off, but a name that only starts
// with Ma (Madiba, Majola) is kept whole.
export function isidukoKeys(value) {
  let bare = bareName(value)
  const u = bare.match(/^[uU](?:[-\s]+|(?=[A-Z]))(.{2,})$/)
  if (u) bare = u[1]
  const keys = [normaliseIsiduko(bare)]
  for (const root of femaleRoots(bare)) keys.push(normaliseIsiduko(root))
  const ma = bare.match(/^Ma(?=[A-Z])(.{2,})$/)
  if (ma) keys.push(normaliseIsiduko(ma[1]))
  for (const key of [...keys]) {
    if (/^m[^aeiou]/.test(key) && key.length > 3) keys.push(key.slice(1))
  }
  return [...new Set(keys.filter((k) => k.length >= 2))]
}

// True when two pieces of text name the same clan by these rules alone:
// AmaTshawe, MamTshawe, MaTshawe and Tshawe; Mzangwa and AmaZangwa.
export function sameIsiduko(a, b) {
  const theirs = new Set(isidukoKeys(b))
  return isidukoKeys(a).some((k) => theirs.has(k))
}

// One key for a clan, the barest root: AmaTshawe, MamTshawe and Tshawe all
// give "tshawe"; Mzangwa and AmaZangwa give "zangwa". Used to group a family
// (clan and surname) so every form lands in the same family.
export function isidukoRootKey(value) {
  const keys = isidukoKeys(value)
  return keys[keys.length - 1] || ''
}
