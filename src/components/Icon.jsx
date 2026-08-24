const PATHS = {
  home: <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  cart: <><path d="M4 8h16l-1.5 11a2 2 0 01-2 1.8H7.5a2 2 0 01-2-1.8z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c2.6.3 4.5 2.6 4.5 5.4" /></>,
  check: <path d="M4 12l6 6L20 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  bell: <><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>,
  template: <><path d="M6 4h9l3 3v13H6z" /><path d="M9 4v6h6V4" /></>,
  coins: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" /><path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cocktail: <><path d="M5 4h14L12 13z" /><path d="M12 13v6M8 20h8" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>,
  trash: <><path d="M6 7h12l-1 13H7z" /><path d="M9 7V5a3 3 0 016 0v2" /></>,
  flame: <path d="M12 21c-4 0-6.5-2.7-6.5-6 0-3 2-4.8 2.5-7.5C9 9 10 10 10.5 9c.5-2 1-4 2-6 1 3 3.5 4.5 4.5 8 .6 2 .5 3.7-.3 5C15.8 18 14 21 12 21z" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
}

function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, className = '' }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  )
}

export default Icon
