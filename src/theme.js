// src/theme.js
export const FONTS = {
  body:    "'Manrope', 'Segoe UI', system-ui, sans-serif",
  display: "'Newsreader', Georgia, serif",
}

export const TYPE = {
  logo:         { fontFamily: FONTS.display, fontSize: '24px', fontWeight: 700, color: '#243642', letterSpacing: '-0.03em' },
  pageTitle:    { fontFamily: FONTS.display, fontSize: '32px', fontWeight: 700, color: '#243642' },
  sectionTitle: { fontFamily: FONTS.display, fontSize: '24px', fontWeight: 700, color: '#243642' },
  body:         { fontFamily: FONTS.body, fontSize: '15px', fontWeight: 400, color: '#243642', lineHeight: 1.6 },
  author:       { fontFamily: FONTS.body, fontSize: '14px', fontWeight: 600, color: '#546E7A' },
  metadata:     { fontFamily: FONTS.body, fontSize: '12px', fontWeight: 400, color: '#9E9E9E' },
  formLabel:    { fontFamily: FONTS.body, fontSize: '11px', fontWeight: 700, color: '#546E7A', textTransform: 'uppercase', letterSpacing: '0.1em' },
  quoteText:    { fontFamily: FONTS.display, fontSize: '18px', fontStyle: 'italic', color: '#243642' },
  quoteAttrib:  { fontFamily: FONTS.body, fontSize: '12px', fontWeight: 600, color: '#546E7A' },
  navActive:    { fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700, color: '#944A00' },
  navInactive:  { fontFamily: FONTS.body, fontSize: '10px', fontWeight: 700, color: '#8C9DA6' },
  button:       { fontFamily: FONTS.body, fontSize: '14px', fontWeight: 700, color: '#FFFFFF' },
  readMore:     { fontFamily: FONTS.body, fontSize: '13px', fontWeight: 700, color: '#944A00' },
}