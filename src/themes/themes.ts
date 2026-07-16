export type ThemeName = 'dark' | 'light' | 'vibrant' | 'ocean'

export interface Theme {
  name: ThemeName
  label: string
  bg: string
  surface: string
  border: string
  borderFocus: string
  text: string
  placeholder: string
  labelFloat: string
  labelBg: string
  accent: string
  accentText: string
  inputBg: string
  dropdownBg: string
  dropdownHover: string
  dropdownSelected: string
  dropdownSelectedText: string
  scrollbarThumb: string
  tagBg: string
  tagText: string
  iconColor: string
  shadow: string
  toggleBg: string
  toggleActive: string
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: 'Тёмная',
    bg: '#0f1117',
    surface: '#1a1d27',
    border: '#2e3347',
    borderFocus: '#6c8eff',
    text: '#e8eaf6',
    placeholder: '#5a6182',
    labelFloat: '#6c8eff',
    labelBg: '#1a1d27',
    accent: '#6c8eff',
    accentText: '#ffffff',
    inputBg: '#1a1d27',
    dropdownBg: '#1e2130',
    dropdownHover: '#252a3d',
    dropdownSelected: '#6c8eff22',
    dropdownSelectedText: '#6c8eff',
    scrollbarThumb: '#2e3347',
    tagBg: '#6c8eff22',
    tagText: '#6c8eff',
    iconColor: '#5a6182',
    shadow: '0 8px 32px rgba(0,0,0,0.5)',
    toggleBg: '#2e3347',
    toggleActive: '#6c8eff',
  },
  light: {
    name: 'light',
    label: 'Светлая',
    bg: '#f4f5f9',
    surface: '#ffffff',
    border: '#d0d5e8',
    borderFocus: '#4361ee',
    text: '#1a1d27',
    placeholder: '#9098b5',
    labelFloat: '#4361ee',
    labelBg: '#ffffff',
    accent: '#4361ee',
    accentText: '#ffffff',
    inputBg: '#ffffff',
    dropdownBg: '#ffffff',
    dropdownHover: '#f0f2ff',
    dropdownSelected: '#4361ee15',
    dropdownSelectedText: '#4361ee',
    scrollbarThumb: '#d0d5e8',
    tagBg: '#4361ee15',
    tagText: '#4361ee',
    iconColor: '#9098b5',
    shadow: '0 8px 32px rgba(67,97,238,0.10)',
    toggleBg: '#d0d5e8',
    toggleActive: '#4361ee',
  },
  vibrant: {
    name: 'vibrant',
    label: 'Яркая',
    bg: '#1a0a2e',
    surface: '#231040',
    border: '#4a2070',
    borderFocus: '#e040fb',
    text: '#f3e8ff',
    placeholder: '#9e6abf',
    labelFloat: '#e040fb',
    labelBg: '#231040',
    accent: '#e040fb',
    accentText: '#ffffff',
    inputBg: '#231040',
    dropdownBg: '#2a1550',
    dropdownHover: '#351a60',
    dropdownSelected: '#e040fb25',
    dropdownSelectedText: '#e040fb',
    scrollbarThumb: '#4a2070',
    tagBg: '#e040fb25',
    tagText: '#e040fb',
    iconColor: '#9e6abf',
    shadow: '0 8px 40px rgba(224,64,251,0.2)',
    toggleBg: '#4a2070',
    toggleActive: '#e040fb',
  },
  ocean: {
    name: 'ocean',
    label: 'Океан',
    bg: '#071e3d',
    surface: '#0d2b52',
    border: '#1a4a7a',
    borderFocus: '#00d4aa',
    text: '#e0f4f1',
    placeholder: '#4a8fa8',
    labelFloat: '#00d4aa',
    labelBg: '#0d2b52',
    accent: '#00d4aa',
    accentText: '#071e3d',
    inputBg: '#0d2b52',
    dropdownBg: '#0f3060',
    dropdownHover: '#153870',
    dropdownSelected: '#00d4aa20',
    dropdownSelectedText: '#00d4aa',
    scrollbarThumb: '#1a4a7a',
    tagBg: '#00d4aa20',
    tagText: '#00d4aa',
    iconColor: '#4a8fa8',
    shadow: '0 8px 32px rgba(0,0,0,0.5)',
    toggleBg: '#1a4a7a',
    toggleActive: '#00d4aa',
  },
}
