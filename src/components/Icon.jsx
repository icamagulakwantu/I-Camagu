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

  clipboard: <><rect x="6" y="5" width="12" height="15" rx="1.5" /><path d="M9 5V4a1 1 0 011-1h4a1 1 0 011 1v1" /><path d="M9 11h6M9 15h6" /></>,
  heart: <path d="M12 20s-7-4.4-9.3-9C1.3 7.7 3 4.5 6.5 4.5c2 0 3.4 1.2 4.5 2.6C12.1 5.7 13.5 4.5 15.5 4.5 19 4.5 20.7 7.7 21.3 11c-2.3 4.6-9.3 9-9.3 9z" />,
  landmark: <><path d="M4 21h16M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6" /></>,
  gift: <><rect x="4" y="9" width="16" height="12" rx="1" /><path d="M4 9h16v4H4z" /><path d="M12 9v12M12 9c-1.8 0-3.2-1.3-3.2-3S10.2 3 12 4.5C13.8 3 15.2 3.7 15.2 5.5S13.8 9 12 9z" /></>,
  beer: <><path d="M6 8h9v11a1 1 0 01-1 1H7a1 1 0 01-1-1z" /><path d="M15 10h2.5a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5H15" /><path d="M6 8c0-2.2 2-4 4.5-4S15 5.8 15 8" /></>,
  link: <><circle cx="8" cy="8" r="4" /><circle cx="16" cy="16" r="4" /><path d="M10.8 10.8l2.4 2.4" /></>,
  send: <><rect x="5" y="4" width="14" height="12" rx="1.5" /><path d="M12 16v4l3-3" /></>,
  package: <><path d="M4 8l8-4 8 4-8 4-8-4z" /><path d="M4 8v9l8 4 8-4V8" /><path d="M12 12v9" /></>,
  store: <><path d="M4 9l1-5h14l1 5" /><path d="M4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M4.2 7l1.7 1M18.1 16l1.7 1M4.2 17l1.7-1M18.1 8l1.7-1M3 12h2M19 12h2" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.6" /><path d="M20 16l-5-5-4 4-2-2-5 5" /></>,
  book: <><path d="M5 5.5A2.5 2.5 0 017.5 4H19v15H7.5A2.5 2.5 0 005 16.5z" /><path d="M19 19H7.5A2.5 2.5 0 015 16.5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>,
  activity: <path d="M4 12h4l2-7 4 14 2-7h4" />,
  key: <><circle cx="8" cy="15" r="3.5" /><path d="M10.5 12.5L19 4M15.5 8L18 10.5M12.5 11L15 13.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.3a2.5 2.5 0 114 2c-.8.6-1.5 1.1-1.5 2.2" /><path d="M12 17.2v.1" /></>,
  logout: <><path d="M9 4H6a1 1 0 00-1 1v14a1 1 0 001 1h3" /><path d="M14 8l5 4-5 4M19 12H9" /></>,

  close: <path d="M6 6l12 12M18 6L6 18" />,
  mapPin: <><path d="M12 21s-7-6.1-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.3" /></>,
  phone: <path d="M6 3h3l1.5 5-2 1.5a11 11 0 005 5l1.5-2 5 1.5v3a1.5 1.5 0 01-1.6 1.5A16 16 0 014.5 4.6 1.5 1.5 0 016 3z" />,
  copy: <><rect x="9" y="9" width="11" height="12" rx="1.5" /><path d="M6 15H5a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 015 3h9A1.5 1.5 0 0115.5 4.5V6" /></>,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.3" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="1.5" /><path d="M15 10l6-3v10l-6-3z" /></>,
  file: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><path d="M12 8v.1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
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
