// Small stroke icons (24 px grid) so the interface does not depend on emoji fonts.
const P = {
  back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  walk: '<circle cx="13" cy="4.2" r="1.7"/><path d="m9 21 2.6-5.6L10 12l1-5 3.6 2.6L18 11"/><path d="M11 7 7.6 9v3"/><path d="m13.4 15.4 2.4 5.6"/>',
  orbit: '<circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-24 12 12)"/>',
  sunrise: '<path d="M12 3v3"/><path d="m5.2 8.2 2 2"/><path d="m18.8 8.2-2 2"/><path d="M2 16h3"/><path d="M19 16h3"/><path d="M7.5 16a4.5 4.5 0 0 1 9 0"/><path d="M3 20h18"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.500 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.2"/>',
  path: '<path d="M9 3 6 21"/><path d="m15 3 3 18"/><path d="M12 4v3"/><path d="M12 10.500v3"/><path d="M12 17v3"/>',
  stairs: '<path d="M4 20h4v-4h4v-4h4V8h4V4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  coffee: '<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 10h1.500a2.500 2.500 0 0 1 0 5H16"/><path d="M8 3v2.500"/><path d="M12 3v2.500"/><path d="M4 21h13"/>',
  building: '<path d="M4 21V6l8-3v18"/><path d="m12 9 8 2v10"/><path d="M2 21h20"/><path d="M8 9v.01"/><path d="M8 13v.01"/><path d="M8 17v.01"/><path d="M16 14v.01"/><path d="M16 17.500v.01"/>',
  wall: '<rect x="3" y="4" width="18" height="16" rx="1.500"/><path d="M3 9.300h18"/><path d="M3 14.700h18"/><path d="M9 4v5.300"/><path d="M15 9.300v5.400"/><path d="M9 14.700V20"/>',
  sparkle: '<path d="m12 3 1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900L12 3Z"/><path d="M19 16v4"/><path d="M17 18h4"/>',
  expand: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
  eyeoff: '<path d="m3 3 18 18"/><path d="M10.600 6.100A9.800 9.800 0 0 1 12 6c5.200 0 9 6 9 6a15.600 15.600 0 0 1-2.700 3.200"/><path d="M6.500 7.600C4.300 9.200 3 12 3 12s3.800 6 9 6c1.300 0 2.500-.300 3.600-.900"/><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
}

export function icon(name) {
  if (name === 'arrow') return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2.500 19 20l-7-3.600L5 20 12 2.500Z" fill="#f5b942" stroke="#1a1408" stroke-width="1.600" stroke-linejoin="round"/></svg>'
  return `<svg class="i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`
}
