// index.ts — публичный API UI Kit.
// Базовые стили инжектятся в рантайме провайдерами (styles/global.ts).

/* Поля */
export { default as CustomInput } from './components/CustomInput';
export type { CustomInputProps, CustomInputType } from './components/CustomInput';
export { default as CustomSelect } from './components/CustomSelect';
export type { CustomSelectProps, SelectOption } from './components/CustomSelect';
export { default as CustomSuggest } from './components/CustomSuggest';
export type { CustomSuggestProps } from './components/CustomSuggest';
export { default as Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';
export { default as RadioGroup } from './components/RadioGroup';
export type { RadioGroupProps, RadioOption } from './components/RadioGroup';
export { default as RangeSlider } from './components/RangeSlider';
export type { RangeSliderProps } from './components/RangeSlider';
export { default as FileSelector } from './components/FileSelector';
export type { FileSelectorProps } from './components/FileSelector';
export { default as Button } from './components/Button';
export type { ButtonProps } from './components/Button';
export { default as Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

/* Данные */
export { default as Table, MobileCardList, ActionsColumn, useSort } from './components/Table';
export type { Column, TableProps, MobileCardListProps, MobileCardField, ActionsColumnOptions, ActionKind, SortState, SortDirection } from './components/Table';
export { default as DataTable, usePagedData } from './components/DataTable';
export type { DataTableProps } from './components/DataTable';
export { Pagination } from './components/Pagination';
export type { PaginationProps } from './components/Pagination';
export { default as DirectoryTree } from './components/DirectoryTree';
export type { DirectoryTreeProps, DirectoryApi, DirectoryItem } from './components/DirectoryTree';
export { default as Calendar } from './components/Calendar';
export type { CalendarProps, TemplateOption, ShiftOption, CalendarAssignment } from './components/Calendar';
export { FilterBar } from './components/FilterBar';
export type { FilterBarProps, FilterItem } from './components/FilterBar';

/* Каркас */
export { Header, ThemeSwitcher, LayoutToggle } from './components/Header';
export type { HeaderProps, HeaderNavTab, HeaderNavTabChild, ThemeSwitcherProps, LayoutToggleProps, LayoutMode } from './components/Header';
export { PageLayout } from './components/PageLayout';
export type { PageLayoutProps, FooterConfig } from './components/PageLayout';
export * from './components/Nav';
export { Menu } from './components/Menu';
export type { MenuProps, MenuTab } from './components/Menu';
export { default as Modal } from './components/Modal';
export type { ModalProps, ModalField } from './components/Modal';
export { AuthPage } from './components/AuthPage';
export type { AuthPageProps } from './components/AuthPage';
export { default as StatCard } from './components/StatCard';
export type { StatCardProps } from './components/StatCard';
export { default as LoadingOverlay } from './components/LoadingOverlay';
export type { LoadingOverlayProps } from './components/LoadingOverlay';
export { FeedbackProvider, useToast, useConfirm } from './components/Feedback';
export type { ToastApi, ToastOptions, ConfirmOptions } from './components/Feedback';
export { default as PhotoViewerModal } from './components/PhotoViewerModal';
export type { PhotoViewerModalProps, ViewerPhoto } from './components/PhotoViewerModal';

/* Диаграммы */
export { PieChart } from './components/charts/PieChart';
export type { PieChartProps, PieDataItem, PieChartMargin } from './components/charts/PieChart';
export { Histogram } from './components/charts/Histogram';
export type { HistogramProps, HistogramDataItem } from './components/charts/Histogram';

/* Ролевая модель */
export { AclProvider, useAcl, useAclResources, useAclResource, registerResource, canView, canEdit, Acl } from './acl';
export type { AclKind, AclResource, AclGrants, AclUser, AclProviderProps, AclProps } from './acl';

/* Контекст приложения */
export {
  AppProvider, useResponsive, useMediaQuery, usePersistentState,
  createAppModule, setting, oneOf,
} from './context/AppContext';
export type {
  AppProviderProps, ResponsiveConfig, ResponsiveValue,
  BaseUser, AuthEndpoints, AuthContextType, BaseUIState,
  AppContextType, AppModuleOptions, ModuleProviderProps, ProfileModalProps,
  SettingDef, SettingsSchema, SettingValues, SettingSetters,
  UsePersistentStateOptions, BoundPageLayoutProps,
} from './context/AppContext';

/* Хуки */
export {
  useFetch, useModalForm, useAutoRefresh, isOverlayOpen, useAutofocus,
  useDebouncedValue, useResizeObserver, useBodyScrollLock, useStyleTag, useIsoLayoutEffect, watchLayout,
} from './hooks';
export type { UseFetchOptions, UseFetchResult, UseAutoRefreshOptions, UseAutofocusOptions } from './hooks';

/* Утилиты, поиск, базовые стили */
export * from './utils';
export * from './highlight';
export { useGlobalStyles, GLOBAL_CSS, GLOBAL_STYLE_ID } from './styles/global';

/* Иконки и темы */
export * from './components/icons';
export * from './components/iconsExtra';
export { themes, colorScheme, readableOn } from './themes/theme';
export type { Theme, ThemeName } from './themes/theme';