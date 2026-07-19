import React from 'react'

// Iconos SVG inline (trazo estilo lucide), sin dependencias externas.
const I = ({ children, size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const IconPlanet = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M3.5 9c4-2.5 13-2.5 17 0M3.5 15c4 2.5 13 2.5 17 0" />
  </I>
)

export const IconWallet = (p) => (
  <I {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </I>
)

export const IconChart = (p) => (
  <I {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </I>
)

export const IconUser = (p) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </I>
)

export const IconSettings = (p) => (
  <I {...p}>
    <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
    <circle cx="16" cy="8" r="2.2" />
    <circle cx="8" cy="16" r="2.2" />
  </I>
)

export const IconLeaf = (p) => (
  <I {...p}>
    <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" />
    <path d="M5 19c3-5 7-8 11-10" />
  </I>
)

export const IconRadar = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" opacity="0.5" />
  </I>
)

export const IconGhost = (p) => (
  <I {...p}>
    <path d="M5 11a7 7 0 0 1 14 0v9l-2.4-2-2.3 2-2.3-2-2.3 2-2.4-2Z" />
    <circle cx="9.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
  </I>
)

export const IconEye = (p) => (
  <I {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </I>
)

export const IconSync = (p) => (
  <I {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4h-4" />
  </I>
)

export const IconAlert = (p) => (
  <I {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </I>
)

export const IconTrash = (p) => (
  <I {...p}>
    <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />
  </I>
)

export const IconSave = (p) => (
  <I {...p}>
    <path d="M5 4h11l3 3v13H5Z" />
    <path d="M8 4v5h7V4M8 14h8v6H8Z" />
  </I>
)

export const IconFolder = (p) => (
  <I {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </I>
)

export const IconKey = (p) => (
  <I {...p}>
    <circle cx="8" cy="14" r="4" />
    <path d="M11 11 20 2M16 6l3 3" />
  </I>
)

export const IconMinus = (p) => (
  <I {...p}>
    <path d="M5 12h14" />
  </I>
)

export const IconX = (p) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </I>
)

export const IconCheck = (p) => (
  <I {...p}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </I>
)

export const IconWalk = (p) => (
  <I {...p}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M13 7.5 9.5 10l1 4.5L8 20M13 7.5l2.5 3 3 1M10.5 14.5l3 2 1 4" />
  </I>
)

export const IconGalaxy = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <path d="M12 12c0-4.5 3.5-7.5 8-7.5M12 12c0 4.5-3.5 7.5-8 7.5M12 12c4.5 0 7.5 3.5 7.5 8M12 12c-4.5 0-7.5-3.5-7.5-8" />
  </I>
)

export const IconGraph = (p) => (
  <I {...p}>
    <path d="M3 4v16h18" />
    <path d="M6 15l4-5 3.5 3L19 6" />
    <circle cx="19" cy="6" r="1.4" fill="currentColor" stroke="none" />
  </I>
)

export const IconRoute = (p) => (
  <I {...p}>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" strokeDasharray="3 2.5" />
  </I>
)

export const IconExternal = (p) => (
  <I {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
  </I>
)
