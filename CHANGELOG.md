## 1.1.0 — Mobile-ready

### Added
- `ResponsiveProvider` / `useResponsive` — контекст адаптива (breakpoints 640/1024, forceMode).
- `MobileHeader` — верхняя панель с burger-drawer для мобильных экранов.
- `MobileCardList` — карточный список (замена Table на мобиле).
- `MobilePagination` — компактная пагинация.
- Хуки `useMediaQuery`, `useBodyScrollLock`.

### Changed
- `Modal`: на экранах ≤ 640px автоматически открывается на весь экран (`fullscreen` можно переопределить пропом).
- `FilterBar`: на мобиле принудительно 1 колонка.
- `Pagination`: на мобиле автоматически заменяется на `MobilePagination`.
- `ActionsColumn`: на мобиле кнопки `size="md"` (44px touch target).
- `global.css`: media-query для iOS (font-size ≥ 16px на инпутах, тонкие скроллбары).
- `index.html`: viewport-fit=cover + theme-color.

### Compatibility
- API существующих компонентов не изменён.
- Новые пропсы опциональны.
- `ActionsColumn` теперь использует хук — вызывать её следует по тем же правилам, что и раньше (внутри компонента/`useMemo`).

## 1.2.0 — Mobile: icons, trees, charts

### Added
- `MobileDirectoryTree` — пошаговый drill-down справочник для мобильных экранов.
- `useResizeObserver` — хук для отслеживания размеров контейнера.
- `PieChart`: на мобиле автоматически подстраивается под ширину контейнера,
  легенда переносится вниз в две колонки.
- `Histogram`: то же самое — авто-размер, компактные оси на мобиле.

### Changed
- `Calendar`: уменьшены отступы ячеек и шрифты на мобиле, нижние контролы
  перестраиваются в колонку.
- `AuthPage`: уменьшены padding карточки, орбы, `ThemeSwitcher` переносится
  на компактный вариант.
- `Modal`, `Pagination`, `FilterBar`, `ActionsColumn` — см. версию 1.1.0.

### Compatibility
- Все новые компоненты — отдельные экспорты.
- Пропсы существующих компонентов не изменены.
- `MobileDirectoryTree` и `DirectoryTree` полностью совместимы по API
  (`theme`, `isAuthenticated`, `api`, `directoryTypes`, `typeLabels`).
  Можно переключать через `isMobile ? MobileDirectoryTree : DirectoryTree`.

## 1.2.1 — fix: ActionsColumn violates Rules of Hooks

### Fixed
- `ActionsColumn` больше не вызывает хуки внутри себя. Раньше она
  использовала `useResponsive()`, что ломалось при вызове внутри
  `useMemo`/`useCallback` (React: «change in the order of Hooks»).
  Теперь принимает `isMobile?: boolean` пропом; при отсутствии —
  синхронно читает `window.matchMedia` без подписки.

## 1.2.2 — Mobile: dropdownPosition, ThemeSwitcher and MobilePagination
- Плашка темы съезжает	Убран transform: scale(0.9) в AuthPage
- Пагинация уезжает вверх	position: sticky; bottom + safe-area
- Тема с надписями в drawer	ThemeSwitcher compact — только кружки
- Dropdown уходит за экран	Flip-up логика в useDropdownPosition

## 1.2.3 - Mobile:
- ThemeSwitcher.tsx	Добавлен проп stretch + minButtonHeight; пересчёт пилюли через ResizeObserver
- MobileHeader.tsx	ThemeSwitcher с stretch + minButtonHeight={44}; go() больше не закрывает drawer