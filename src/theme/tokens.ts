/**
 * Design tokens transcribed from the Claude Design prototype
 * (`project/Feasibility Studio.dc.html`). Values are literal — do not "round"
 * them; the prototype is the source of truth for the visual output.
 */

export const color = {
  /* surfaces */
  appBg: '#F5F5F1',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFAF6',
  surfaceSoft: '#FBFBF8',
  surfaceGrid: '#FAFAF7',
  sidebarDark: '#22251E',
  sidebarLight: '#EFEFE8',
  segmentTrack: '#EDEDE6',

  /* text */
  ink: '#1B1D18',
  inkSoft: '#4A4E45',
  muted: '#6E7268',
  faint: '#8A8F82',
  ghost: '#A0A398',
  onDark: '#E8E9E2',
  onDarkMuted: '#9AA093',
  onDarkFaint: '#8F958A',

  /* lines */
  border: '#E4E4DE',
  borderSoft: '#EFEFE9',
  rowLine: '#F4F4EE',
  borderStrong: '#C9C9C0',
  borderDashed: '#D6D6CC',

  /* brand green */
  green: '#5F6F3C',
  greenDeep: '#4A5730',
  greenLeaf: '#8AA04A',
  greenSage: '#A9B872',
  greenPale: '#C4CFA3',
  greenMist: '#D6DCBE',
  greenLine: '#C9D0AE',
  greenTint: '#F2F4EA',
  greenTintDeep: '#E9EDDB',
  greenRow: '#F5F7EE',
  greenText: '#4B6626',
  greenOk: '#4B7A3F',
  chipGreenBg: '#EAF0DE',

  /* amber */
  amber: '#A8811C',
  amberText: '#8A6A12',
  amberChipBg: '#FBF3DC',
  amberPanelBg: '#FBF6E7',
  amberPanelText: '#6B5A24',
  amberBannerBg: '#F6F3E8',
  amberBannerBorder: '#E4DCC0',
  amberRow: '#FEFCF6',
  amberRowHover: '#FDF8EA',
  gold: '#D9B84A',

  /* red */
  red: '#B5432F',
  redText: '#93341F',
  redChipBg: '#F8E3DD',
  redPanelBg: '#FDF4F1',
  redPanelBorder: '#EFC8BC',
  redPanelText: '#7A4436',
  redRow: '#FDF6F4',
  redRowHover: '#FBEFEB',

  /* discipline layers */
  layerArs: '#9A9A8C',
  layerStr: '#3F6BA8',
  layerMep: '#C97A2B',
  layerInt: '#8B5FA8',

  /* neutral chart greys */
  grey: '#9A9A8C',
  greyLight: '#C6C6BA',
  avatarBg: '#DDE3CB',
} as const

export const font = {
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const

/** `font` shorthand builders — keeps the literal prototype values readable. */
export const sans = (spec: string) => `${spec} ${font.sans}`
export const mono = (spec: string) => `${spec} ${font.mono}`

export const layout = {
  sidebarWidth: 236,
  headerHeight: 56,
  contentMaxWidth: 1180,
  drawerWidth: 430,
} as const
