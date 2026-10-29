// A strip of isiXhosa beadwork (white ground with black, red, turquoise and
// gold beads), used as a quiet signature accent under page titles, along the
// bottom edge of hero images and across the top of the navigation bar.
// Purely decorative, so it is hidden from screen readers.
export default function BeadBand({ className = '', thin = false, fade = false }) {
  return (
    <div
      aria-hidden="true"
      className={`${thin ? 'bead-band-thin' : 'bead-band'} ${fade ? 'bead-fade' : ''} ${className}`}
    />
  )
}
