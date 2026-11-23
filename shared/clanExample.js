// While i-Camagu grows, each clan shows a member count that includes example
// members (founder, 23 Nov 2026), always with a note saying so. The example
// part is steady (the same every day) and comes from the clan's name.
export const EXAMPLE_MEMBERS_NOTE = 'Member counts include example members while i-Camagu grows.'

export function exampleMembers(clanName) {
  let h = 0
  for (const ch of String(clanName || '').toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return 40 + (h % 361) // 40 to 400
}
