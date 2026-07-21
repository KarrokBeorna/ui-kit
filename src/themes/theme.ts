export type ThemeName = 'dark' | 'light' | 'vibrant' | 'ocean';

export interface Theme {
  name: ThemeName;
  label: string;

  // Основные
  bg: string; // фон страниц
  bgSurface: string; // фон блоков 1-го уровня - авторизация, заголовок, фильтры, пагинация, Theme Switcher
  bgSubmit: string; // фон кнопки авторизации после попытки входа во время загрузки
  text: string; // цвет текста
  textMuted: string; // цвет неактивного текста
  accent: string;
  accentText: string;
  accentGlow: string;
  border: string;
  borderSubtle: string;

  // Для старых компонентов (добавлены)
  borderFocus: string;
  placeholder: string;
  labelFloat: string;
  labelBg: string;
  dropdownBg: string;
  dropdownHover: string;
  dropdownSelected: string;
  dropdownSelectedText: string;
  scrollbarThumb: string;
  tagBg: string;
  tagText: string;
  iconColor: string;
  shadow: string;
  shadowLg: string;

  // Для переключателей
  toggleBg: string;
  toggleActive: string;

  // Для навигации
  navHoverBg: string;

  danger: string;
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: 'Тёмная',
    bg: '#0d0f14',
    bgSurface: '#13161f',
    text: '#e8eaf0',
    textMuted: '#8b8fa8',
    bgSubmit: '#4a4e63',
    accent: '#6c8aff',
    accentText: '#ffffff',
    accentGlow: 'rgba(108,138,255,0.25)',
    border: '#252838',
    borderSubtle: '#1c1f2e',
    borderFocus: '#6c8aff',
    placeholder: '#5a6182',
    labelFloat: '#6c8aff',
    labelBg: '#1a1d27',
    dropdownBg: '#1e2130',
    dropdownHover: '#252a3d',
    dropdownSelected: '#6c8aff22',
    dropdownSelectedText: '#6c8aff',
    scrollbarThumb: '#2e3347',
    tagBg: '#6c8aff22',
    tagText: '#6c8aff',
    iconColor: '#5a6182',
    shadow: '0 4px 24px rgba(0,0,0,0.6)',
    shadowLg: '0 8px 40px rgba(0,0,0,0.8)',
    toggleBg: '#2e3347',
    toggleActive: '#6c8aff',
    navHoverBg: 'rgba(108,138,255,0.1)',
    danger: '#ff6b6b',
  },
  light: {
    name: 'light',
    label: 'Светлая',
    bg: '#f4f5f7',
    bgSurface: '#ffffff',
    text: '#1a1c24',
    textMuted: '#6b6f80',
    bgSubmit: '#b0b3c1',
    accent: '#4361ee',
    accentText: '#ffffff',
    accentGlow: 'rgba(67,97,238,0.2)',
    border: '#e2e4ec',
    borderSubtle: '#edeef3',
    borderFocus: '#4361ee',
    placeholder: '#9098b5',
    labelFloat: '#4361ee',
    labelBg: '#ffffff',
    dropdownBg: '#ffffff',
    dropdownHover: '#f0f2ff',
    dropdownSelected: '#4361ee15',
    dropdownSelectedText: '#4361ee',
    scrollbarThumb: '#d0d5e8',
    tagBg: '#4361ee15',
    tagText: '#4361ee',
    iconColor: '#9098b5',
    shadow: '0 4px 24px rgba(0,0,0,0.08)',
    shadowLg: '0 8px 40px rgba(0,0,0,0.12)',
    toggleBg: '#d0d5e8',
    toggleActive: '#4361ee',
    navHoverBg: 'rgba(67,97,238,0.08)',
    danger: '#ef4444',
  },
  vibrant: {
    name: 'vibrant',
    label: 'Яркая',
    bg: '#0a0010',
    bgSurface: '#120018',
    text: '#f0e8ff',
    textMuted: '#a882cc',
    bgSubmit: '#5a3a72',
    accent: '#c84bff',
    accentText: '#ffffff',
    accentGlow: 'rgba(200,75,255,0.3)',
    border: '#2d0045',
    borderSubtle: '#1f0030',
    borderFocus: '#e040fb',
    placeholder: '#9e6abf',
    labelFloat: '#e040fb',
    labelBg: '#231040',
    dropdownBg: '#2a1550',
    dropdownHover: '#351a60',
    dropdownSelected: '#e040fb25',
    dropdownSelectedText: '#e040fb',
    scrollbarThumb: '#4a2070',
    tagBg: '#e040fb25',
    tagText: '#e040fb',
    iconColor: '#9e6abf',
    shadow: '0 4px 24px rgba(200,75,255,0.2)',
    shadowLg: '0 8px 40px rgba(200,75,255,0.3)',
    toggleBg: '#4a2070',
    toggleActive: '#e040fb',
    navHoverBg: 'rgba(200,75,255,0.12)',
    danger: '#ff6b9d',
  },
  ocean: {
    name: 'ocean',
    label: 'Океан',
    bg: '#020b18',
    bgSurface: '#05152a',
    text: '#d6eeff',
    textMuted: '#6a9bcc',
    bgSubmit: '#2a4a66',
    accent: '#00c8ff',
    accentText: '#001a2e',
    accentGlow: 'rgba(0,200,255,0.25)',
    border: '#0f2e4a',
    borderSubtle: '#081e38',
    borderFocus: '#00d4aa',
    placeholder: '#4a8fa8',
    labelFloat: '#00d4aa',
    labelBg: '#0d2b52',
    dropdownBg: '#0f3060',
    dropdownHover: '#153870',
    dropdownSelected: '#00d4aa20',
    dropdownSelectedText: '#00d4aa',
    scrollbarThumb: '#1a4a7a',
    tagBg: '#00d4aa20',
    tagText: '#00d4aa',
    iconColor: '#4a8fa8',
    shadow: '0 4px 24px rgba(0,200,255,0.15)',
    shadowLg: '0 8px 40px rgba(0,200,255,0.25)',
    toggleBg: '#1a4a7a',
    toggleActive: '#00d4aa',
    navHoverBg: 'rgba(0,200,255,0.1)',
    danger: '#ff6b6b',
  },
};