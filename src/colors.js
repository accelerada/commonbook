// export const COLORS = {
//   bg: '#fbf9f4',
//   surface: '#f1eee9',
//   surfaceStrong: '#FFFFFF',
//   naviBg: '#f5f3ee',
//   cardBg: '#e1e0dc',
//   coverBg: '#EEE9E0',
//   border: '#d1cfc9',
//   olive: '#80836f',
//   oliveSoft: '#B0ACA6',
//   text: '#2C2A25',
//   commonbookLogo: '#243642',
//   textSoft: '#9C9890',
//   textHighlight: '#c0622a',
//   gold: '#C8C0B4',
//   secondaryBtn: '#EAE6E0',
//   tagBg: '#E4E0D8',
//   shadow: '0 8px 20px rgba(60, 50, 40, 0.06)'
// }

// BookDetail.jsx local COLORS has olive: '#7D836D' and gold: '#C8B27D' which are different values from your colors.js accent (#944A00) 

export const COLORS = {
  // ── Surfaces & backgrounds ────────────────────────────
  bg:              '#F9F7F2',
  cardBg:          '#E1E0DC',
  surface:         '#F5F3EE',
  border:          '#D1CFC9',
  naviBg:          '#F5F3EE',
  messageBg:       '#F6F2EA',   // info/message card background

  // ── Text ─────────────────────────────────────────────
  text:            '#2F2F2F',
  textSoft:        '#546E7A',
  textFaint:       '#9E9E9E',
  white:           '#FFFFFF',   // text on coloured backgrounds
  commonbookLogo:  '#243642',
  textHighlight:   '#C0622A',   // link/highlight text

  // ── Brand accent ──────────────────────────────────────
  accent:          '#944A00',   // mahogany — all interactive elements
  accentHighlight: '#F5F3EE',   // hover/selection bg
  destructive:     '#A0522D',   // sienna — delete / destructive actions

  // ── Tab bar ───────────────────────────────────────────
  tabActive:       '#944A00',
  tabInactive:     '#8C9DA6',

  // ── Progress & ratings ────────────────────────────────
  quoteBar:        '#944A00',
  progressFill:    '#944A00',
  progressTrack:   '#D1CFC9',
  heartFill:       '#DD2121',
  heartBase:       '#D2CEC5',   // unfilled heart outline
  starInactive:    '#D0CAC1',   // empty star in book cards

  // ── Tags & pills ──────────────────────────────────────
  tagBg:           '#E6E2D7',
  pillBg:          '#8C8880',   // genre pill in library grid

  // ── Toast notification ────────────────────────────────
  toastBg:         '#2C2A25',
  toastText:       '#FAF7F0',
  toastIcon:       '#6A8F6A',   // green checkmark circle

  // ── Scanner overlay ───────────────────────────────────
  scanCorner:      'rgba(255, 255, 255, 0.5)',
  scanBtnBg:       'rgba(255, 255, 255, 0.92)',

  // ── Shadows ───────────────────────────────────────────
  shadow:          '0 10px 26px rgba(36, 54, 66, 0.07)',
  shadowDropdown:  '0 14px 28px rgba(80, 68, 52, 0.12)',
  shadowToast:     '0 8px 32px rgba(0, 0, 0, 0.22)',
  shadowCover:     '0 6px 16px rgba(0, 0, 0, 0.28), -3px 3px 8px rgba(0, 0, 0, 0.12)',
  shadowModal:     '0 12px 40px rgba(0, 0, 0, 0.18)',
  shadowResultCard:'0 2px 8px rgba(0, 0, 0, 0.06)',
  overlayBg:       'rgba(0, 0, 0, 0.35)',

  // ── Feedback ──────────────────────────────────────────
  error:           '#C0392B',
  success:         '#437A22',
}
