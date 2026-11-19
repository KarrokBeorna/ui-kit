// App.tsx — положите рядом с папкой src/ библиотеки (импорт './src').
// Если библиотека опубликована как пакет — замените './src' на '@kbs/ui-kit'.
//
// Запуск (Vite + React + TS):
//   npm create vite@latest ui-kit-demo -- --template react-ts
//   cd ui-kit-demo && npm i react-router-dom axios
//   src/ библиотеки → ./src, этот файл → ./App.tsx, main.tsx → ./main.tsx
//   npm run dev
//
// Демо-аккаунты: admin / admin123 (web-админ) · operator / operator123 (ограниченные права).
// Все данные — в памяти (мок-адаптер axios), сессия переживает перезагрузку (sessionStorage).

import React, {
  useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore,
  type ReactNode, type RefObject,
} from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import axios, { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';

import {
  /* поля */ CustomInput, CustomSelect, Checkbox, RadioGroup, RangeSlider, FileSelector, Button, Badge,
  /* данные */ Table, MobileCardList, ActionsColumn, useSort, Pagination, DirectoryTree, Calendar, FilterBar,
  /* каркас */ ThemeSwitcher, LayoutToggle, Menu, Modal, AuthPage, StatCard, LoadingOverlay, AppProvider,
  /* диаграммы */ PieChart, Histogram,
  /* контекст */ createAppModule, setting, oneOf, usePersistentState, useResponsive, useMediaQuery,
  /* хуки */ useFetch, useModalForm, useAutoRefresh, isOverlayOpen, useAutofocus, useDebouncedValue,
  useResizeObserver, useBodyScrollLock, useStyleTag, useIsoLayoutEffect,
  /* навигация */ filterNavTabs, matchActiveTab,
  /* иконки */ IcoChevronLeft, IcoChevronRight, IcoChevronDown, IcoChevronUp, IcoLogIn, IcoLogOut,
  IcoFilter, IcoSearch, IcoX, IcoEye, ExportIcon, IcoCheck, IcoArrowUp, IcoArrowDown,
  CalendarIcon, ClockIcon, DateTimeIcon, IcoFile, IcoHorHeader, IcoVerHeader,
  /* темы */ themes, colorScheme, readableOn,
  type Theme, ThemeName, LayoutMode, BaseUser, NavTab, Column, SortState, ModalField, MenuTab,
  SelectOption, CustomInputType, DirectoryApi, DirectoryItem, CalendarAssignment, TemplateOption,
  HistogramDataItem, PieDataItem, ProfileModalProps, FooterConfig,
} from './src';

/* ═══════════════════════════ 1. МОК-БЭКЕНД ═══════════════════════════ */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const safeJson = (s: string): any => { try { return JSON.parse(s); } catch { return {}; } };
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoUser extends BaseUser { department: string }
interface DbUser extends DemoUser { password: string }

const USERS: DbUser[] = [
  { userId: 1, username: 'admin', password: 'admin123', name: 'Дмитрий', surname: 'Савельев', isAdmin: true, webAdmin: true, allowedTabs: null, department: 'ИТ / Платформа' },
  { userId: 2, username: 'operator', password: 'operator123', name: 'Анна', surname: 'Крылова', isAdmin: false, webAdmin: false, department: 'Производство',
    allowedTabs: ['/', '/data', '/orders', '/directory', '/calendar', '/showcase', '/inputs', '/ui', '/charts', '/hooks'] },
];
const publicUser = (u: DbUser): DemoUser => { const { password: _p, ...rest } = u; return rest; };

let session: number | null = (() => {
  try { const s = sessionStorage.getItem('demo-session'); return s === null ? 1 : s === '' ? null : Number(s); } catch { return 1; }
})();
const setSession = (id: number | null) => {
  session = id;
  try { sessionStorage.setItem('demo-session', id === null ? '' : String(id)); } catch { /* ignore */ }
};

type OrderStatus = 'new' | 'progress' | 'done' | 'blocked';
interface Order {
  id: number; orderNo: string; product: string; line: string; status: OrderStatus;
  qty: number; priority: number; createdAt: string; author: string; note: string; is_deleted: boolean;
}
const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  new: { label: 'Новый', color: '#3b82f6' }, progress: { label: 'В работе', color: '#f59e0b' },
  done: { label: 'Выполнен', color: '#22c55e' }, blocked: { label: 'Блокирован', color: '#ef4444' },
};
const LINES = ['Линия A', 'Линия B', 'Линия C', 'Линия D'];
const PRODUCTS = ['Кронштейн подвески', 'Вал приводной', 'Корпус редуктора', 'Фланец ступицы', 'Рычаг нижний', 'Опора амортизатора', 'Шкив коленвала', 'Картер сцепления'];
const AUTHORS = ['Д. Савельев', 'А. Крылова', 'И. Мельников', 'О. Титова', 'С. Гусев', 'М. Лапина'];

let ORDERS: Order[] = [];
let nextOrderId = 1;
function seedOrders() {
  const rnd = mulberry32(42);
  const statuses: OrderStatus[] = ['new', 'progress', 'progress', 'done', 'done', 'done', 'blocked'];
  ORDERS = Array.from({ length: 56 }, (_, i) => {
    const d = new Date(Date.now() - Math.floor(rnd() * 30) * 864e5 - Math.floor(rnd() * 864e5));
    return {
      id: i + 1, orderNo: `ORD-2026-${String(1001 + i)}`,
      product: PRODUCTS[Math.floor(rnd() * PRODUCTS.length)], line: LINES[Math.floor(rnd() * LINES.length)],
      status: statuses[Math.floor(rnd() * statuses.length)], qty: 4 + Math.floor(rnd() * 236),
      priority: 1 + Math.floor(rnd() * 5), createdAt: d.toISOString().slice(0, 10),
      author: AUTHORS[Math.floor(rnd() * AUTHORS.length)],
      note: rnd() > 0.7 ? 'Контроль ОТК после сборки' : '', is_deleted: rnd() > 0.92,
    };
  });
  nextOrderId = ORDERS.length + 1;
}
seedOrders();

function sortRecords<T extends Record<string, any>>(list: T[], sort: SortState): T[] {
  if (!sort.length) return list;
  const numeric = new Set(['qty', 'priority', 'id']);
  return [...list].sort((a, b) => {
    for (const { key, direction } of sort) {
      const av = a[key], bv = b[key];
      const ae = av == null || av === '', be = bv == null || bv === '';
      if (ae && be) continue; if (ae) return 1; if (be) return -1;
      const cmp = numeric.has(key) && typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv), 'ru', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function computeStats() {
  const active = ORDERS.filter((o) => !o.is_deleted);
  const byStatus = (Object.keys(STATUS_META) as OrderStatus[]).map((s) => ({ status: s, count: active.filter((o) => o.status === s).length }));
  const byLine = LINES.map((line) => ({
    line, total: active.filter((o) => o.line === line).length,
    byStatus: (Object.keys(STATUS_META) as OrderStatus[]).map((s) => ({ status: s, count: active.filter((o) => o.line === line && o.status === s).length })),
  }));
  return {
    total: active.length, deleted: ORDERS.length - active.length,
    done: byStatus.find((s) => s.status === 'done')!.count, blocked: byStatus.find((s) => s.status === 'blocked')!.count,
    progress: byStatus.find((s) => s.status === 'progress')!.count,
    avgQty: active.length ? Math.round(active.reduce((s, o) => s + o.qty, 0) / active.length) : 0,
    byStatus, byLine, recent: [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  };
}
type Stats = ReturnType<typeof computeStats>;

function makeLog(id: number) {
  const rnd = mulberry32(id * 7 + 13);
  const actions = ['Создан', 'Назначен на линию', 'Смена статуса', 'Проверка ОТК', 'Комментарий добавлен', 'Приоритет изменён'];
  const order = ORDERS.find((o) => o.id === id);
  const base = order ? new Date(order.createdAt).getTime() : Date.now();
  return Array.from({ length: 4 }, (_, i) => ({
    at: new Date(base + i * 36e5 * (2 + rnd() * 6)).toLocaleString('ru'),
    user: AUTHORS[Math.floor(rnd() * AUTHORS.length)], action: actions[Math.floor(rnd() * actions.length)],
  })).reverse();
}

/** Кастомный axios-адаптер: полноценный REST в памяти, без новых зависимостей. */
const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0];
  const p: any = config.params ?? {};
  const body: any = typeof config.data === 'string' ? safeJson(config.data) : config.data ?? {};
  await sleep(url === '/api/auth/me' ? 70 : 140 + Math.random() * 180);
  if (config.signal?.aborted) throw new AxiosError('canceled', 'ERR_CANCELED', config);
  const res = (status: number, data: any): AxiosResponse => ({ data, status, statusText: String(status), headers: {} as any, config });
  const ok = (data: any) => res(200, data);
  const fail = (status: number, error: string): never => { throw new AxiosError(error, String(status), config, undefined, res(status, { error })); };
  const me = () => USERS.find((u) => u.userId === session) ?? null;

  if (url === '/api/auth/me') { const u = me(); return u ? ok({ user: publicUser(u) }) : fail(401, 'Не авторизован'); }
  if (url === '/api/auth/login' && method === 'post') {
    const u = USERS.find((x) => x.username === body.username && x.password === body.password);
    if (!u) return fail(401, 'Неверный логин или пароль');
    setSession(u.userId); return ok({ user: publicUser(u) });
  }
  if (url === '/api/auth/logout') { setSession(null); return ok({ ok: true }); }
  if (url === '/api/usage/session/end') return ok({ ok: true });
  if (url === '/api/auth/change-password') {
    const u = me(); if (!u) return fail(401, 'Не авторизован');
    if (u.password !== body.oldPassword) return fail(400, 'Старый пароль неверен');
    if (String(body.newPassword ?? '').length < 6) return fail(400, 'Минимум 6 символов');
    u.password = body.newPassword; return ok({ ok: true });
  }
  if (url === '/api/stats') return ok(computeStats());
  if (url === '/api/users') { if (!me()?.isAdmin) return fail(403, 'Недостаточно прав'); return ok({ items: USERS.map(publicUser) }); }
  if (url === '/api/demo/reset-orders' && method === 'post') { seedOrders(); return ok({ ok: true }); }

  const logM = url.match(/^\/api\/orders\/(\d+)\/log$/);
  if (logM) return ok({ items: makeLog(Number(logM[1])) });
  const restoreM = url.match(/^\/api\/orders\/(\d+)\/restore$/);
  if (restoreM && method === 'post') {
    const o = ORDERS.find((x) => x.id === Number(restoreM[1])); if (!o) return fail(404, 'Не найдено');
    o.is_deleted = false; return ok({ item: o });
  }
  const idM = url.match(/^\/api\/orders\/(\d+)$/);
  if (idM && method === 'put') {
    const o = ORDERS.find((x) => x.id === Number(idM[1])); if (!o) return fail(404, 'Не найдено');
    Object.assign(o, body, { id: o.id }); return ok({ item: o });
  }
  if (idM && method === 'delete') {
    const o = ORDERS.find((x) => x.id === Number(idM[1])); if (!o) return fail(404, 'Не найдено');
    o.is_deleted = true; return ok({ ok: true });
  }
  if (url === '/api/orders' && method === 'post') {
    if (!body.orderNo || !body.product) return fail(400, 'Заполните номер и изделие');
    const o: Order = { id: nextOrderId++, is_deleted: false, note: '', author: 'Д. Савельев', priority: 3, qty: 1, createdAt: new Date().toISOString().slice(0, 10), ...body };
    ORDERS.unshift(o); return ok({ item: o });
  }
  if (url === '/api/orders' && method === 'get') {
    if (p.fail) return fail(500, 'Демо-сбой сервера (params.fail=1)');
    let list = ORDERS.filter((o) => (p.includeDeleted ? true : !o.is_deleted));
    if (p.q) { const q = String(p.q).toLowerCase(); list = list.filter((o) => [o.orderNo, o.product, o.author, o.line].some((s) => s.toLowerCase().includes(q))); }
    if (Array.isArray(p.statuses) && p.statuses.length) list = list.filter((o) => p.statuses.includes(o.status));
    if (Array.isArray(p.lines) && p.lines.length) list = list.filter((o) => p.lines.includes(o.line));
    const [mn, mx] = Array.isArray(p.qty) ? p.qty : [null, null];
    if (mn != null) list = list.filter((o) => o.qty >= mn);
    if (mx != null) list = list.filter((o) => o.qty <= mx);
    if (p.from) list = list.filter((o) => o.createdAt >= p.from);
    if (p.to) list = list.filter((o) => o.createdAt <= p.to);
    list = sortRecords(list, p.sort ? safeJson(p.sort) : []);
    const total = list.length, per = Math.max(1, Number(p.perPage) || 10), pg = Math.max(1, Number(p.page) || 1);
    return ok({ items: list.slice((pg - 1) * per, pg * per), total });
  }
  return fail(404, `Нет мок-маршрута: ${method.toUpperCase()} ${url}`);
};

const api = axios.create();
api.defaults.adapter = mockAdapter;

/* Справочник: плоское хранилище + реализация DirectoryApi */
const DIR_SEED: DirectoryItem[] = [
  { id: 1, name: 'Производство', type: 'root', parent_id: null, sort_order: 0 },
  { id: 2, name: 'Склад', type: 'root', parent_id: null, sort_order: 1 },
  { id: 3, name: 'Кадры', type: 'root', parent_id: null, sort_order: 2 },
  { id: 10, name: 'Цех сборки', type: 'section', parent_id: 1, sort_order: 0 },
  { id: 11, name: 'Цех сварки', type: 'section', parent_id: 1, sort_order: 1 },
  { id: 12, name: 'Контроль качества', type: 'section', parent_id: 1, sort_order: 2 },
  { id: 20, name: 'Линия A', type: 'group', parent_id: 10, sort_order: 0 },
  { id: 21, name: 'Линия B', type: 'group', parent_id: 10, sort_order: 1 },
  { id: 30, name: 'Пост 1', type: 'item', parent_id: 20, sort_order: 0 },
  { id: 31, name: 'Пост 2', type: 'item', parent_id: 20, sort_order: 1 },
  { id: 32, name: 'Пост 3', type: 'item', parent_id: 20, sort_order: 2 },
  { id: 40, name: 'Зона приёмки', type: 'section', parent_id: 2, sort_order: 0 },
  { id: 41, name: 'Зона хранения', type: 'section', parent_id: 2, sort_order: 1 },
  { id: 50, name: 'Стеллаж 1', type: 'group', parent_id: 41, sort_order: 0 },
  { id: 60, name: 'Ячейка A1', type: 'item', parent_id: 50, sort_order: 0 },
  { id: 61, name: 'Ячейка A2', type: 'item', parent_id: 50, sort_order: 1 },
  { id: 70, name: 'Отдел подбора', type: 'section', parent_id: 3, sort_order: 0 },
  { id: 80, name: 'Рекрутер', type: 'item', parent_id: 70, sort_order: 0 },
];
let DIR: DirectoryItem[] = DIR_SEED.map((d) => ({ ...d }));
let dirNextId = 100;
const dirSort = (a: DirectoryItem, b: DirectoryItem) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const directoryApi: DirectoryApi & { reset(): void } = {
  async getRoots() { await sleep(150); return DIR.filter((d) => d.parent_id === null).sort(dirSort).map((d) => ({ ...d })); },
  async getChildren(parentId) { await sleep(130); return DIR.filter((d) => d.parent_id === parentId).sort(dirSort).map((d) => ({ ...d })); },
  async createItem(data) {
    await sleep(180);
    const siblings = DIR.filter((d) => d.parent_id === data.parent_id);
    const item: DirectoryItem = { id: ++dirNextId, name: data.name, type: data.type, parent_id: data.parent_id, sort_order: siblings.length };
    DIR.push(item); return { ...item };
  },
  async updateItem(id, data) { await sleep(160); const d = DIR.find((x) => x.id === id); if (d) { if (data.name != null) d.name = data.name; if (data.type != null) d.type = data.type; } },
  async deleteItem(id) {
    await sleep(180);
    const doomed = new Set<number>([id]);
    for (let grew = true; grew;) { grew = false; for (const d of DIR) if (d.parent_id != null && doomed.has(d.parent_id) && !doomed.has(d.id)) { doomed.add(d.id); grew = true; } }
    DIR = DIR.filter((d) => !doomed.has(d.id));
  },
  async moveItem(id, direction) {
    await sleep(140);
    const item = DIR.find((d) => d.id === id); if (!item) return;
    const siblings = DIR.filter((d) => d.parent_id === item.parent_id).sort(dirSort);
    const i = siblings.findIndex((d) => d.id === id), j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    const a = siblings[i], b = siblings[j];
    const tmp = a.sort_order ?? i; a.sort_order = b.sort_order ?? j; b.sort_order = tmp;
  },
  reset() { DIR = DIR_SEED.map((d) => ({ ...d })); dirNextId = 100; },
};

/* ═══════════════════════════ 2. ТОСТЫ (внешний стор) ═══════════════════════════ */

type ToastKind = 'success' | 'danger' | 'info' | 'warning';
interface Toast { id: number; kind: ToastKind; text: string; action?: { label: string; run: () => void } }
let toastSeq = 0;
let toastList: Toast[] = [];
const toastSubs = new Set<() => void>();
const emitToasts = () => toastSubs.forEach((f) => f());
const dismissToast = (id: number) => { toastList = toastList.filter((t) => t.id !== id); emitToasts(); };
function pushToast(kind: ToastKind, text: string, action?: Toast['action']) {
  const id = ++toastSeq;
  toastList = [...toastList, { id, kind, text, action }];
  emitToasts();
  window.setTimeout(() => dismissToast(id), action ? 9000 : 4200);
}
const toast = {
  success: (m: string, a?: Toast['action']) => pushToast('success', m, a),
  danger: (m: string, a?: Toast['action']) => pushToast('danger', m, a),
  info: (m: string, a?: Toast['action']) => pushToast('info', m, a),
  warning: (m: string, a?: Toast['action']) => pushToast('warning', m, a),
};
const useToasts = () => useSyncExternalStore(
  (cb) => { toastSubs.add(cb); return () => { toastSubs.delete(cb); }; },
  () => toastList,
);

/* ═══════════════════════════ 3. МОДУЛЬ ПРИЛОЖЕНИЯ ═══════════════════════════ */

const TABS: NavTab<DemoUser>[] = [
  { id: '/', label: 'Обзор', icon: <IcoVerHeader s={16} /> },
  { id: '/data', label: 'Данные', icon: <IcoFile s={16} />, children: [
    { id: '/orders', label: 'Заказы', icon: <IcoSearch s={15} /> },
    { id: '/directory', label: 'Справочник', icon: <IcoChevronRight s={15} /> },
    { id: '/calendar', label: 'Календарь', icon: <CalendarIcon s={15} /> },
  ] },
  { id: '/showcase', label: 'Витрина', icon: <IcoEye s={16} />, displayMode: 'replace', children: [
    { id: '/inputs', label: 'Поля', icon: <IcoArrowUp s={15} /> },
    { id: '/ui', label: 'Компоненты', icon: <IcoCheck s={15} /> },
    { id: '/charts', label: 'Диаграммы', icon: <IcoFilter s={15} /> },
    { id: '/hooks', label: 'Хуки', icon: <ClockIcon s={15} /> },
  ] },
  { id: '/admin', label: 'Админ', icon: <IcoLogIn s={16} />, adminOnly: true },
];

const appModule = createAppModule<DemoUser>()({
  siteName: 'KBS UI Kit',
  logo: '◈',
  tabs: TABS,
  axiosInstance: api,
  refreshOn: ['focus', 'visibility'],
  storagePrefix: 'kbs-demo',
  defaultTheme: 'dark',
  defaultLayout: 'horizontal',
  defaultPerPage: 10,
  settings: {
    density: setting<'comfortable' | 'compact'>('comfortable', oneOf('comfortable', 'compact')),
    showHints: setting(true),
  },
  footer: { subject: 'Демо UI Kit — баг/предложение' } satisfies FooterConfig,
  headerProps: {
    showMoscowTime: true,
    onPasswordChange: async (oldPassword, newPassword) => {
      await api.post('/api/auth/change-password', { oldPassword, newPassword });
      toast.success('Пароль изменён');
    },
  },
  profile: {
    canSee: (u) => !!u,
    Modal: ({ theme, isOpen, onClose, user }: ProfileModalProps<DemoUser>) => (
      <Modal theme={theme} isOpen={isOpen} onClose={onClose} onOk={onClose} title="Профиль"
        columns={2} rows={2} okText="Закрыть" showCancel={false} width={460}
        fields={[
          { row: 0, col: 0, content: <ProfileCell label="Имя" value={`${user?.name ?? ''} ${user?.surname ?? ''}`} t={theme} /> },
          { row: 0, col: 1, content: <ProfileCell label="Логин" value={user?.username ?? '—'} t={theme} /> },
          { row: 1, col: 0, content: <ProfileCell label="Подразделение" value={user?.department ?? '—'} t={theme} /> },
          { row: 1, col: 1, content: (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 50 }}>
              {user?.webAdmin && <Badge theme={theme} variant="filled" bgColor={theme.accent}>web-админ</Badge>}
              {user?.isAdmin && <Badge theme={theme} variant="soft" bgColor={theme.success}>админ</Badge>}
              {!user?.isAdmin && <Badge theme={theme} variant="soft" bgColor={theme.pending}>оператор</Badge>}
            </div>
          ) },
        ]} />
    ),
  },
});
const { useApp, useAuth, useUI, ProtectedRoute, AdminRoute, WebAdminRoute, TabGuard, PageLayout: AppPageLayout } = appModule;

function ProfileCell({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div style={{ minHeight: 50, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════ 4. ХРОМ ВИТРИНЫ ═══════════════════════════ */

const DEMO_CSS = `
* { scrollbar-width: thin; scrollbar-color: var(--demo-thumb) var(--demo-track); }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: var(--demo-track); }
*::-webkit-scrollbar-thumb { background: var(--demo-thumb); border-radius: 8px; border: 2px solid var(--demo-track); }
*::-webkit-scrollbar-thumb:hover { background: var(--demo-accent); }
*::-webkit-scrollbar-corner { background: var(--demo-track); }
.demo-reveal { opacity: 0; transform: translateY(16px); transition: opacity .55s ease, transform .55s cubic-bezier(.4,0,.2,1); }
.demo-reveal.in { opacity: 1; transform: none; }
@keyframes demoDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(5%,-7%) scale(1.12); } }
@keyframes demoToastIn { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes demoBlink { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
.demo-orb { animation: demoDrift 18s ease-in-out infinite; }
.demo-toast { animation: demoToastIn .25s cubic-bezier(.4,0,.2,1); }
.demo-live { animation: demoBlink 1.6s ease-in-out infinite; }
.demo-chip { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.demo-focus:focus-visible { outline: 2px solid var(--demo-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .demo-reveal { opacity: 1; transform: none; transition: none; }
  .demo-orb, .demo-toast, .demo-live { animation: none; }
}
`;

/** CSS-переменные витрины на :root — порталы (модалки/дропдауны) наследуют палитру. */
function Chrome() {
  const { theme } = useApp();
  const t = themes[theme];
  useStyleTag('demo-vitrine-css', DEMO_CSS);
  useIsoLayoutEffect(() => {
    const r = document.documentElement;
    const vars: Record<string, string> = {
      '--demo-accent': t.accent, '--demo-glow': t.accentGlow, '--demo-bg': t.bg, '--demo-surface': t.bgSurface,
      '--demo-border': t.border, '--demo-text': t.text, '--demo-muted': t.textMuted,
      '--demo-danger': t.danger, '--demo-success': t.success, '--demo-pending': t.pending,
      '--demo-thumb': t.border, '--demo-track': t.bgSurface, 'color-scheme': colorScheme(t.bg),
    };
    for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, v);
  }, [t]);
  return null;
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useResponsive();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') { el.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);
  return <div ref={ref} className="demo-reveal" style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const { prefersReducedMotion } = useResponsive();
  const [n, setN] = useState(prefersReducedMotion ? value : 0);
  useEffect(() => {
    if (prefersReducedMotion) { setN(value); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, prefersReducedMotion]);
  return <>{n.toLocaleString('ru')}</>;
}

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="demo-chip" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6,
      fontSize: 11, color: color ?? 'var(--demo-muted)', background: 'var(--demo-bg)',
      border: '1px solid var(--demo-border)', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Section({ title, subtitle, right, children, delay = 0 }: {
  title: string; subtitle?: string; right?: ReactNode; children: ReactNode; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span aria-hidden style={{ width: 4, height: 24, borderRadius: 2, background: 'linear-gradient(180deg, var(--demo-accent), var(--demo-pending) 55%, var(--demo-danger))' }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--demo-text)' }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--demo-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {right}
        </div>
        {children}
      </section>
    </Reveal>
  );
}

function Cell({ title, props, children, footer }: { title: string; props?: string[]; children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{
      background: 'var(--demo-surface)', border: '1px solid var(--demo-border)', borderRadius: 14,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--demo-text)' }}>{title}</span>
        {props?.map((p) => <Chip key={p}>{p}</Chip>)}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
      {footer && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{footer}</div>}
    </div>
  );
}

const grid = (min = 280): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 14 });

function Toaster() {
  const list = useToasts();
  const { theme } = useApp();
  const t = themes[theme];
  const { isMobile } = useResponsive();
  const colors: Record<ToastKind, string> = { success: t.success, danger: t.danger, info: t.accent, warning: t.pending };
  const icons: Record<ToastKind, ReactNode> = { success: <IcoCheck s={13} />, danger: <IcoX s={12} />, info: <IcoSearch s={13} />, warning: <IcoFilter s={13} /> };
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', zIndex: 1200, right: 16, left: isMobile ? 16 : 'auto',
      bottom: `calc(${isMobile ? 76 : 16}px + env(safe-area-inset-bottom, 0px))`,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, pointerEvents: 'none',
    }}>
      {list.map((tt) => (
        <div key={tt.id} className="demo-toast" style={{
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
          background: t.bgSurface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${colors[tt.kind]}`,
          borderRadius: 12, padding: '10px 12px', boxShadow: t.shadowLg, color: t.text, fontSize: 13,
        }}>
          <span style={{ color: colors[tt.kind], display: 'flex', flexShrink: 0 }}>{icons[tt.kind]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>{tt.text}</span>
          {tt.action && (
            <Button theme={t} size="sm" outline variant="primary" onClick={() => { tt.action!.run(); dismissToast(tt.id); }}>
              {tt.action.label}
            </Button>
          )}
          <button type="button" className="demo-focus" aria-label="Закрыть уведомление" onClick={() => dismissToast(tt.id)}
            style={{ background: 'none', border: 'none', color: t.iconColor, cursor: 'pointer', display: 'flex', padding: 4 }}>
            <IcoX s={10} />
          </button>
        </div>
      ))}
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvEscape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function ordersCsv(items: Order[]): string {
  const head = ['Номер', 'Изделие', 'Линия', 'Статус', 'Кол-во', 'Приоритет', 'Дата', 'Автор'];
  return [head.join(';'), ...items.map((o) => [o.orderNo, o.product, o.line, STATUS_META[o.status].label, o.qty, o.priority, o.createdAt, o.author].map(csvEscape).join(';'))].join('\n');
}
function exportSvg(ref: RefObject<HTMLElement | null>, name: string, bg: string) {
  const svg = ref.current?.querySelector('svg');
  if (!svg) { toast.warning('SVG не найден'); return; }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%'); rect.setAttribute('fill', bg);
  clone.insertBefore(rect, clone.firstChild);
  downloadBlob(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }), name);
  toast.success(`Экспортировано: ${name}`);
}

/* ═══════════════════════════ 5. ОБЗОР (DASHBOARD) ═══════════════════════════ */

const COVERAGE: { name: string; to: string }[] = [
  { name: 'CustomInput ×9 типов', to: '/inputs' }, { name: 'CustomSelect single/multi', to: '/inputs' },
  { name: 'Checkbox · RadioGroup', to: '/inputs' }, { name: 'RangeSlider single/range', to: '/inputs' },
  { name: 'FileSelector', to: '/inputs' }, { name: 'Button · Badge', to: '/ui' },
  { name: 'Table + ActionsColumn', to: '/orders' }, { name: 'MobileCardList', to: '/' },
  { name: 'Pagination (адаптивная)', to: '/orders' }, { name: 'FilterBar', to: '/orders' },
  { name: 'Modal ×4 сценария', to: '/ui' }, { name: 'DirectoryTree CRUD', to: '/directory' },
  { name: 'Calendar + смены', to: '/calendar' }, { name: 'Histogram · PieChart', to: '/charts' },
  { name: 'Header / drawer / LayoutToggle', to: '/' }, { name: 'ThemeSwitcher · 4 темы', to: '/ui' },
  { name: 'Menu · StatCard · LoadingOverlay', to: '/ui' }, { name: 'AuthPage + guards', to: '/admin' },
  { name: 'Все 14 хуков', to: '/hooks' }, { name: 'Все 20 иконок', to: '/ui' },
  { name: 'AppProvider forceMode', to: '/ui' }, { name: 'createAppModule + settings', to: '/ui' },
];

function Dashboard() {
  const t = themes[useApp().theme];
  const navigate = useNavigate();
  const { data, loading, refetch } = useFetch<Stats>('/api/stats', undefined, { initialData: null });
  useAutoRefresh(refetch, { intervalMs: 20_000 });
  const s = data;

  const histData: HistogramDataItem[] = useMemo(() => (s?.byLine ?? []).flatMap((l) =>
    l.byStatus.map((x) => ({ id: `${l.line}-${x.status}`, label: l.line, series: STATUS_META[x.status].label, value: x.count, color: STATUS_META[x.status].color }))), [s]);
  const pieData: PieDataItem[] = useMemo(() => (s?.byStatus ?? []).map((x) =>
    ({ id: x.status, label: STATUS_META[x.status].label, value: x.count, level: 0, color: STATUS_META[x.status].color })), [s]);

  return (
    <div>
      {/* Герой */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18, marginBottom: 20,
        border: `1px solid ${t.border}`, background: t.bgSurface, padding: 'clamp(20px, 4vw, 36px)',
      }}>
        <div className="demo-orb" aria-hidden style={{ position: 'absolute', top: '-40%', right: '-12%', width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${t.accent}33, transparent 70%)`, filter: 'blur(10px)', pointerEvents: 'none' }} />
        <div className="demo-orb" aria-hidden style={{ position: 'absolute', bottom: '-55%', left: '18%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${t.pending}26, transparent 70%)`, filter: 'blur(12px)', animationDelay: '-7s', pointerEvents: 'none' }} />
        <div className="demo-orb" aria-hidden style={{ position: 'absolute', top: '10%', left: '-10%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${t.danger}1f, transparent 70%)`, filter: 'blur(14px)', animationDelay: '-12s', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <Chip color={t.accent}>◈ ЖИВАЯ ВИТРИНА</Chip>
            <Chip>все компоненты</Chip><Chip>все хуки</Chip><Chip>все иконки</Chip><Chip>4 темы</Chip>
            <Chip color={t.success}><span className="demo-live">●</span> мок-API онлайн</Chip>
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', color: t.text, lineHeight: 1.1 }}>
            UI Kit, который можно<br />потрогать целиком
          </h1>
          <p style={{ margin: '0 0 18px', maxWidth: 620, color: t.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            Каждый компонент ниже — рабочий: заказы создаются, фильтруются, сортируются и удаляются с отменой;
            справочник живёт своим CRUD; диаграммы управляются вживую; темы, раскладка и настройки переживают перезагрузку.
          </p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 20 }}>
            {[['Заказов в базе', s?.total ?? 0], ['Выполнено', s?.done ?? 0], ['Блокировано', s?.blocked ?? 0], ['Средняя партия', s?.avgQty ?? 0]].map(([label, v]) => (
              <div key={label as string}>
                <div style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: t.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {loading && !s ? '…' : <CountUp value={v as number} />}
                </div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textMuted }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button theme={t} variant="primary" icon={<IcoSearch s={14} />} onClick={() => navigate('/orders')}>К заказам</Button>
            <Button theme={t} variant="primary" outline icon={<IcoArrowUp s={14} />} onClick={() => navigate('/inputs')}>Галерея полей</Button>
            <Button theme={t} variant="success" outline icon={<IcoFilter s={14} />} onClick={() => navigate('/charts')}>Диаграммы</Button>
            <Button theme={t} variant="danger" outline icon={<ClockIcon s={14} />} onClick={() => navigate('/hooks')}>Полигон хуков</Button>
          </div>
        </div>
      </div>

      <Section title="StatCard" subtitle="Живые метрики из /api/stats · автообновление useAutoRefresh каждые 20 с">
        <div style={grid(200)}>
          <StatCard theme={t} label="Всего заказов" value={String(s?.total ?? '—')} hint={`удалено: ${s?.deleted ?? 0}`} />
          <StatCard theme={t} label="В работе" value={String(s?.progress ?? '—')} hint="статус «В работе»" />
          <StatCard theme={t} label="Выполнено" value={String(s?.done ?? '—')} hint={s ? `${Math.round((s.done / Math.max(1, s.total)) * 100)}% от всех` : ''} />
          <StatCard theme={t} label="Средняя партия" value={String(s?.avgQty ?? '—')} hint="шт. на заказ" />
        </div>
      </Section>

      <div style={grid(380)}>
        <Section title="Histogram — реальные данные" subtitle="Заказы по линиям × статусам · stacked">
          <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
            <Histogram data={histData} theme={t} barMode="stacked" height={320} showValues yAxisLabel="Заказы" />
          </div>
        </Section>
        <Section title="PieChart — реальные данные" subtitle="Распределение статусов · донат">
          <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
            <PieChart data={pieData} theme={t} height={320} innerRadius={46} ringThickness={34} showLegendValues legendValueSeparator=" · " />
          </div>
        </Section>
      </div>

      <Section title="MobileCardList" subtitle="Последние 5 заказов · standalone-компонент (в Table включается автоматически на узком экране)">
        <MobileCardList<Order>
          t={t} data={s?.recent ?? []} rowKey="id" loading={loading && !s}
          titleRender={(o) => `${o.orderNo} — ${o.product}`}
          fields={[
            { label: 'Линия', render: (o) => <Badge theme={t} size="sm">{o.line}</Badge> },
            { label: 'Статус', render: (o) => <Badge theme={t} size="sm" bgColor={STATUS_META[o.status].color} variant="soft">{STATUS_META[o.status].label}</Badge> },
            { label: 'Количество', render: (o) => `${o.qty} шт.` },
            { label: 'Дата', render: (o) => new Date(o.createdAt).toLocaleDateString('ru') },
          ]}
          actions={(o) => <Button theme={t} size="sm" outline variant="primary" icon={<IcoChevronRight s={12} />} onClick={() => navigate('/orders')}>Открыть в таблице</Button>}
          onRowClick={() => navigate('/orders')}
        />
      </Section>

      <Section title="Карта витрины" subtitle="Где живёт каждый компонент — нажмите, чтобы перейти">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COVERAGE.map((c) => (
            <button key={c.name} type="button" className="demo-focus" onClick={() => navigate(c.to)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.bgSurface, color: t.text, fontSize: 12.5,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s, transform .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ color: t.accent, display: 'flex' }}><IcoChevronRight s={12} /></span>{c.name}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════════════ 6. ЗАКАЗЫ (полный CRUD) ═══════════════════════════ */

interface Filters { q: string; statuses: string[]; lines: string[]; qty: [number | null, number | null]; from: string; to: string; deleted: boolean }
const DEFAULT_FILTERS: Filters = { q: '', statuses: [], lines: [], qty: [null, null], from: '', to: '', deleted: false };
const VIEWS: Record<string, Partial<Filters>> = {
  all: {}, active: { statuses: ['new', 'progress'] }, trouble: { statuses: ['blocked'] }, archive: { deleted: true },
};
const VIEW_OPTIONS: SelectOption[] = [
  { value: 'custom', label: 'Свой фильтр' }, { value: 'all', label: 'Все заказы' },
  { value: 'active', label: 'В работе' }, { value: 'trouble', label: 'Проблемные' }, { value: 'archive', label: 'Архив (удалённые)' },
];
const STATUS_OPTIONS: SelectOption[] = (Object.keys(STATUS_META) as OrderStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }));
const LINE_OPTIONS: SelectOption[] = LINES.map((l) => ({ value: l, label: l }));

interface OrderForm { orderNo: string; product: string; line: string; status: string; qty: string; priority: string; createdAt: string; author: string; note: string }
const ORDER_DEFAULTS: OrderForm = { orderNo: '', product: '', line: LINES[0], status: 'new', qty: '12', priority: '3', createdAt: new Date().toISOString().slice(0, 10), author: '', note: '' };

function OrdersPage() {
  const { theme, perPage, setPerPage, density } = useApp();
  const t = themes[theme];
  const { isMobile } = useResponsive();

  const [filters, setFilters] = usePersistentState<Filters>('demo-orders-filters', DEFAULT_FILTERS);
  const [view, setView] = useState('custom');
  const [filterOpen, setFilterOpen] = usePersistentState('demo-orders-filter-open', true);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>([{ key: 'createdAt', direction: 'desc' }]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [detail, setDetail] = useState<Order | null>(null);
  const [logRow, setLogRow] = useState<Order | null>(null);
  const [confirm, setConfirm] = useState<Order[] | null>(null);
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => ({
    q: filters.q || undefined, statuses: filters.statuses.length ? filters.statuses : undefined,
    lines: filters.lines.length ? filters.lines : undefined,
    qty: filters.qty[0] != null || filters.qty[1] != null ? filters.qty : undefined,
    from: filters.from || undefined, to: filters.to || undefined,
    includeDeleted: filters.deleted || undefined,
    page, perPage, sort: JSON.stringify(sortState),
  }), [filters, page, perPage, sortState]);

  const { data, loading, error, refetch } = useFetch<{ items: Order[]; total: number }>('/api/orders', params,
    { debounceMs: 300, initialData: { items: [], total: 0 } });
  const items = data?.items ?? [], total = data?.total ?? 0;

  const filtersKey = JSON.stringify([filters, sortState]);
  useEffect(() => { setPage(1); }, [filtersKey]);

  const activeCount = [filters.q, filters.statuses.length, filters.lines.length, filters.qty[0] != null || filters.qty[1] != null, filters.from, filters.to, filters.deleted].filter(Boolean).length;
  const chips = [
    filters.q && `поиск: ${filters.q}`,
    filters.statuses.length && `статусы: ${filters.statuses.map((s) => STATUS_META[s as OrderStatus].label).join(', ')}`,
    filters.lines.length && `линии: ${filters.lines.join(', ')}`,
    (filters.qty[0] != null || filters.qty[1] != null) && `партия: ${filters.qty[0] ?? '…'}–${filters.qty[1] ?? '…'}`,
    filters.from && `с ${filters.from}`, filters.to && `по ${filters.to}`, filters.deleted && 'с удалёнными',
  ].filter(Boolean) as string[];

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setView('custom'); toast.info('Фильтры сброшены'); };
  const applyView = (v: string) => {
    setView(v);
    if (v !== 'custom') { setFilters({ ...DEFAULT_FILTERS, ...VIEWS[v] }); toast.info(`Вид: ${VIEW_OPTIONS.find((o) => o.value === v)?.label}`); }
  };

  /* мутации */
  const doDelete = async (rows: Order[]) => {
    const ids = rows.map((r) => r.id);
    await Promise.all(ids.map((id) => api.delete(`/api/orders/${id}`)));
    setSelected(new Set()); setConfirm(null); setDetail(null);
    await refetch();
    toast.success(ids.length > 1 ? `Удалено заказов: ${ids.length}` : `Удалён ${rows[0].orderNo}`, {
      label: 'Отменить',
      run: async () => { await Promise.all(ids.map((id) => api.post(`/api/orders/${id}/restore`))); await refetch(); toast.info('Удаление отменено'); },
    });
  };
  const doRestore = async (row: Order) => { await api.post(`/api/orders/${row.id}/restore`); await refetch(); toast.success(`Восстановлен ${row.orderNo}`); };
  const doDownload = (row: Order) => { downloadBlob(new Blob(['\ufeff' + ordersCsv([row])], { type: 'text/csv;charset=utf-8' }), `${row.orderNo}.csv`); toast.success(`Скачан ${row.orderNo}.csv`); };
  const doExport = async () => {
    const res = await api.get<{ items: Order[] }>('/api/orders', { params: { ...params, page: 1, perPage: 10000 } });
    downloadBlob(new Blob(['\ufeff' + ordersCsv(res.data.items)], { type: 'text/csv;charset=utf-8' }), 'orders.csv');
    toast.success(`Экспортировано строк: ${res.data.items.length}`);
  };

  /* колонки */
  const allOnPageSelected = items.length > 0 && items.every((o) => selected.has(o.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPageSelected) items.forEach((o) => next.delete(o.id)); else items.forEach((o) => next.add(o.id));
    return next;
  });
  const toggleOne = (id: number) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const columns = useMemo<Column<Order>[]>(() => [
    { key: 'select', header: <span onClick={(e) => e.stopPropagation()}><Checkbox theme={t} size="sm" label="" checked={allOnPageSelected} onChange={toggleAll} /></span>, sortable: false, style: { width: 40 },
      render: (_v, row) => <span onClick={(e) => e.stopPropagation()}><Checkbox theme={t} size="sm" label="" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} /></span> },
    { key: 'orderNo', header: 'Номер', render: (v) => <span className="demo-chip" style={{ color: t.accent }}>{v}</span> },
    { key: 'product', header: 'Изделие' },
    { key: 'line', header: 'Линия', render: (v) => <Badge theme={t} size="sm" variant="soft">{v}</Badge> },
    { key: 'status', header: 'Статус', render: (v: OrderStatus) => <Badge theme={t} size="sm" bgColor={STATUS_META[v].color} variant="soft">{STATUS_META[v].label}</Badge> },
    { key: 'qty', header: 'Кол-во', style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } },
    { key: 'priority', header: 'Приоритет', render: (v: number) => <span style={{ color: t.pending, letterSpacing: 2 }} title={`Приоритет ${v}`}>{'★'.repeat(v)}<span style={{ color: t.border }}>{'★'.repeat(5 - v)}</span></span> },
    { key: 'createdAt', header: 'Дата', render: (v: string) => new Date(v).toLocaleDateString('ru') },
    { key: 'author', header: 'Автор' },
    ActionsColumn<Order>({
      theme: t, isMobile,
      onEdit: (row) => { setDetail(null); setEditing(row); },
      onDownload: doDownload, onLog: (row) => setLogRow(row),
      onDelete: (row) => setConfirm([row]), onRestore: doRestore,
      editIcon: <IcoArrowUp s={12} style={{ transform: 'rotate(45deg)' }} />, downloadIcon: <ExportIcon s={12} />,
      logIcon: <ClockIcon s={12} />, deleteIcon: <IcoX s={11} />, restoreIcon: <IcoChevronUp s={12} />,
    }) as Column<Order>,
  ], [t, isMobile, selected, allOnPageSelected, items]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowPad = density === 'compact' ? '5px 12px' : '10px 14px';
  const anyModal = createOpen || !!editing || !!detail || !!logRow || !!confirm;

  /* форма создания/редактирования — useModalForm */
  const formInitial: Partial<OrderForm> | null = editing
    ? { ...editing, qty: String(editing.qty), priority: String(editing.priority) } : null;
  const { form, setField, isDirty } = useModalForm<OrderForm>(createOpen || !!editing, formInitial, ORDER_DEFAULTS);
  const formValid = !!form.orderNo.trim() && !!form.product.trim() && !!form.author.trim() && Number(form.qty) > 0 && Number(form.priority) >= 1 && Number(form.priority) <= 5;

  const saveOrder = async () => {
    if (!formValid || saving) return;
    setSaving(true);
    const payload = { orderNo: form.orderNo.trim(), product: form.product.trim(), line: form.line, status: form.status, qty: Number(form.qty), priority: Number(form.priority), createdAt: form.createdAt, author: form.author.trim(), note: form.note };
    try {
      if (editing) { await api.put(`/api/orders/${editing.id}`, payload); toast.success(`Сохранён ${payload.orderNo}`); }
      else { await api.post('/api/orders', payload); toast.success(`Создан ${payload.orderNo}`); }
      setCreateOpen(false); setEditing(null); await refetch();
    } catch (e) { toast.danger(e instanceof Error ? e.message : 'Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const orderFields: ModalField[] = [
    { row: 0, col: 0, required: true, content: <CustomInput label="Номер заказа" theme={t} value={form.orderNo} onChange={(v) => setField('orderNo', v)} autoFocus /> },
    { row: 0, col: 1, required: true, content: <CustomInput label="Изделие" theme={t} value={form.product} onChange={(v) => setField('product', v)} /> },
    { row: 1, col: 0, content: <CustomSelect label="Линия" theme={t} options={LINE_OPTIONS} value={form.line} onChange={(v) => setField('line', v)} /> },
    { row: 1, col: 1, content: <CustomSelect label="Статус" theme={t} options={STATUS_OPTIONS} value={form.status} onChange={(v) => setField('status', v)} /> },
    { row: 2, col: 0, required: true, content: <CustomInput type="number" label="Количество" theme={t} value={form.qty} onChange={(v) => setField('qty', v)} allowDecimal={false} min={1} max={10000} step={1} /> },
    { row: 2, col: 1, content: <CustomInput type="number" label="Приоритет (1–5)" theme={t} value={form.priority} onChange={(v) => setField('priority', v)} allowDecimal={false} min={1} max={5} /> },
    { row: 3, col: 0, content: <CustomInput type="date" label="Дата" theme={t} value={form.createdAt} onChange={(v) => setField('createdAt', v)} /> },
    { row: 3, col: 1, required: true, content: <CustomInput label="Автор" theme={t} value={form.author} onChange={(v) => setField('author', v)} /> },
    { row: 4, col: 0, colspan: 2, content: <CustomInput type="textarea" label="Примечание" theme={t} value={form.note} onChange={(v) => setField('note', v)} rows={3} maxLength={200} /> },
    { row: 5, col: 0, colspan: 2, content: (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip>useModalForm</Chip>
        {isDirty ? <Badge theme={t} size="sm" bgColor={t.pending} variant="soft">есть изменения</Badge> : <Badge theme={t} size="sm" variant="outlined">без изменений</Badge>}
        {!formValid && <span style={{ fontSize: 12, color: t.danger }}>Заполните обязательные поля</span>}
      </div>
    ) },
  ];

  return (
    <div>
      {/* Панель инструментов */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 220, maxWidth: '100%' }}>
          <CustomSelect label="Сохранённый вид" theme={t} options={VIEW_OPTIONS} value={view} onChange={applyView} />
        </div>
        <Button theme={t} variant="primary" icon={<IcoCheck s={13} />} onClick={() => { setEditing(null); setCreateOpen(true); }}>Новый заказ</Button>
        <Button theme={t} variant="primary" outline icon={<ExportIcon s={13} />} onClick={doExport}>Экспорт CSV</Button>
        <div style={{ flex: 1 }} />
        <Chip>сортировка: серверная</Chip>
        <Chip>debounceMs: 300</Chip>
        {loading && <Chip color={t.accent}><span className="demo-live">●</span> загрузка</Chip>}
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${t.danger}`, color: t.danger, fontSize: 13, background: `${t.danger}12` }}>
          {error} <Button theme={t} size="sm" variant="danger" outline onClick={() => refetch()}>Повторить</Button>
        </div>
      )}

      <FilterBar theme={t} open={filterOpen} onOpenChange={setFilterOpen} activeCount={activeCount} chips={chips}
        onReset={resetFilters} onExport={doExport} gridCols={3} mobileBackdrop mobileMaxHeight={'200px'}
        filters={[
          { row: 0, cols: 2, component: <CustomInput label="Поиск: номер, изделие, автор" theme={t} value={filters.q} onChange={(v) => { setFilters({ ...filters, q: v }); setView('custom'); }} /> },
          { row: 0, component: <CustomSelect type="multiple" label="Статусы" theme={t} options={STATUS_OPTIONS} value={filters.statuses} onChange={(v) => { setFilters({ ...filters, statuses: v }); setView('custom'); }} /> },
          { row: 1, component: <CustomSelect type="multiple" label="Линии" theme={t} options={LINE_OPTIONS} value={filters.lines} onChange={(v) => { setFilters({ ...filters, lines: v }); setView('custom'); }} /> },
          { row: 1, component: <CustomInput type="date" label="Дата с" theme={t} value={filters.from} onChange={(v) => { setFilters({ ...filters, from: v }); setView('custom'); }} /> },
          { row: 1, component: <CustomInput type="date" label="Дата по" theme={t} value={filters.to} onChange={(v) => { setFilters({ ...filters, to: v }); setView('custom'); }} /> },
          { row: 2, cols: 2, component: <RangeSlider range label="Партия, шт." theme={t} min={0} max={240} step={4} value={filters.qty} onChange={(v) => { setFilters({ ...filters, qty: v }); setView('custom'); }} /> },
          { row: 2, component: <Checkbox label="Показывать удалённые" description="Архив с кнопкой восстановления" theme={t} checked={filters.deleted} onChange={(v) => { setFilters({ ...filters, deleted: v }); setView('custom'); }} /> },
        ]} />

      {/* Bulk-панель */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', borderRadius: 12, border: `1px solid ${t.accent}`, background: t.selectedBg }}>
          <Badge theme={t} variant="filled" bgColor={t.accent}>{selected.size}</Badge>
          <span style={{ fontSize: 13, color: t.text }}>выбрано</span>
          <Button theme={t} size="sm" variant="danger" outline icon={<IcoX s={11} />}
            onClick={() => setConfirm(ORDERS.filter((o) => selected.has(o.id)))}>Удалить выбранные</Button>
          <Button theme={t} size="sm" variant="success" outline icon={<IcoChevronUp s={12} />}
            onClick={async () => { const ids = [...selected]; await Promise.all(ids.map((id) => api.post(`/api/orders/${id}/restore`))); setSelected(new Set()); await refetch(); toast.success(`Восстановлено: ${ids.length}`); }}>
            Восстановить
          </Button>
          <Button theme={t} size="sm" variant="primary" outline onClick={() => setSelected(new Set())}>Снять выделение</Button>
        </div>
      )}

      {/* Таблица + оверлей */}
      <div style={{ position: 'relative' }}>
        <Table<Order>
          theme={t} columns={columns} data={items} rowKey="id"
          sortState={sortState} onSortChange={setSortState} sortable={false}
          fixedHeader height={480} stickyRight={['actions']} persistKey="demo-orders"
          onRowClick={(row) => setDetail(row)} selectedRowKey={detail?.id}
          rowStyle={() => ({ padding: rowPad })}
          loading={loading && items.length === 0}
          autoRefreshInterval={20_000} autoRefreshPaused={anyModal} refetch={refetch}
          mobileTitleRender={(o) => `${o.orderNo} — ${o.product}`}
        />
        <LoadingOverlay visible={loading && items.length > 0} theme={t} label="Обновляем…" delayMs={250} />
      </div>

      <div style={{ marginTop: 12 }}>
        <Pagination t={t} total={total} page={page} defaultPerPage={perPage}
          onPageChange={(p, pp) => { setPage(p); if (pp !== perPage) setPerPage(pp); }} />
      </div>

      {/* Создание / редактирование */}
      <Modal theme={t} isOpen={createOpen || !!editing} onClose={() => { setCreateOpen(false); setEditing(null); }}
        onOk={saveOrder} title={editing ? `Редактирование ${editing.orderNo}` : 'Новый заказ'}
        columns={2} rows={6} fields={orderFields} okText={saving ? 'Сохранение…' : editing ? 'Сохранить' : 'Создать'}
        canSubmit={formValid && isDirty && !saving} width={680} rowAlign={['end', 'end', 'end', 'end', 'start', 'start']} />

      {/* Детали */}
      <Modal theme={t} isOpen={!!detail} onClose={() => setDetail(null)} onOk={() => { const r = detail!; setDetail(null); setEditing(r); }}
        title={detail ? `Заказ ${detail.orderNo}` : ''} columns={2} rows={4} width={620} okText="Редактировать" cancelText="Закрыть"
        fields={detail ? [
          { row: 0, col: 0, content: <ProfileCell label="Изделие" value={detail.product} t={t} /> },
          { row: 0, col: 1, content: <ProfileCell label="Линия" value={detail.line} t={t} /> },
          { row: 1, col: 0, content: <div style={{ minHeight: 50, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}><span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.placeholder }}>Статус</span><Badge theme={t} bgColor={STATUS_META[detail.status].color} variant="soft">{STATUS_META[detail.status].label}</Badge></div> },
          { row: 1, col: 1, content: <ProfileCell label="Количество" value={`${detail.qty} шт.`} t={t} /> },
          { row: 2, col: 0, content: <ProfileCell label="Дата" value={new Date(detail.createdAt).toLocaleDateString('ru')} t={t} /> },
          { row: 2, col: 1, content: <ProfileCell label="Автор" value={detail.author} t={t} /> },
          { row: 3, col: 0, colspan: 2, content: (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button theme={t} size="sm" outline variant="primary" icon={<ClockIcon s={12} />} onClick={() => { setLogRow(detail); setDetail(null); }}>Журнал</Button>
              <Button theme={t} size="sm" outline variant="primary" icon={<ExportIcon s={12} />} onClick={() => doDownload(detail)}>CSV</Button>
              {detail.is_deleted
                ? <Button theme={t} size="sm" outline variant="success" icon={<IcoChevronUp s={12} />} onClick={() => doRestore(detail)}>Восстановить</Button>
                : <Button theme={t} size="sm" outline variant="danger" icon={<IcoX s={11} />} onClick={() => setConfirm([detail])}>Удалить</Button>}
              {detail.note && <Chip>{detail.note}</Chip>}
            </div>
          ) },
        ] : []} />

      {/* Журнал */}
      <LogModal t={t} row={logRow} onClose={() => setLogRow(null)} />

      {/* Подтверждение удаления */}
      <Modal theme={t} isOpen={!!confirm} onClose={() => setConfirm(null)} onOk={() => confirm && doDelete(confirm)}
        title="Удалить?" columns={1} rows={1} width={440} okText="Удалить" cancelText="Отмена"
        fields={[{ row: 0, col: 0, content: (
          <div style={{ color: t.text, fontSize: 14, lineHeight: 1.6 }}>
            {confirm?.length === 1 ? <>Удалить заказ <strong>{confirm[0].orderNo}</strong>?</> : <>Удалить заказов: <strong>{confirm?.length}</strong>?</>}
            <div style={{ color: t.textMuted, fontSize: 12, marginTop: 6 }}>Мягкое удаление — можно отменить из тоста или восстановить из архива.</div>
          </div>
        ) }]} />
    </div>
  );
}

function LogModal({ t, row, onClose }: { t: Theme; row: Order | null; onClose: () => void }) {
  const { data, loading } = useFetch<{ items: { at: string; user: string; action: string }[] }>(
    row ? `/api/orders/${row.id}/log` : null, undefined, { resetOnNull: true });
  return (
    <Modal theme={t} isOpen={!!row} onClose={onClose} onOk={onClose} title={row ? `Журнал ${row.orderNo}` : ''}
      columns={1} rows={1} width={520} okText="Закрыть" showCancel={false}
      fields={[{ row: 0, col: 0, content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
          {loading && <span style={{ color: t.placeholder, fontSize: 13 }}>Загрузка журнала…</span>}
          {(data?.items ?? []).map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 10px', borderRadius: 8, background: t.bg, border: `1px solid ${t.borderSubtle}` }}>
              <span className="demo-chip" style={{ fontSize: 11, color: t.accent, flexShrink: 0 }}>{e.at}</span>
              <span style={{ fontSize: 13, color: t.text, flex: 1 }}>{e.action}</span>
              <span style={{ fontSize: 12, color: t.textMuted }}>{e.user}</span>
            </div>
          ))}
        </div>
      ) }]} />
  );
}

/* ═══════════════════════════ 7. ГАЛЕРЕЯ ПОЛЕЙ ═══════════════════════════ */

const INPUT_TYPES: { type: CustomInputType; label: string; hint: string }[] = [
  { type: 'text', label: 'Текст', hint: 'очистка, плавающая метка' },
  { type: 'email', label: 'Email', hint: 'валидация @ после blur' },
  { type: 'tel', label: 'Телефон', hint: 'санитизация + правила +/−' },
  { type: 'password', label: 'Пароль', hint: 'глаз + индикатор надёжности' },
  { type: 'number', label: 'Число', hint: 'степперы, min/max/step' },
  { type: 'date', label: 'Дата', hint: 'нативный picker, showPicker' },
  { type: 'time', label: 'Время', hint: 'нативный picker' },
  { type: 'datetime', label: 'Дата + время', hint: 'datetime-local' },
  { type: 'textarea', label: 'Textarea', hint: 'rows, maxLength, счётчик' },
];

function InputsPage() {
  const { theme } = useApp();
  const t = themes[theme];
  const [values, setValues] = useState<Record<string, string>>({ text: 'Кронштейн подвески', email: '', tel: '', password: '', number: '24', date: '', time: '', datetime: '', textarea: 'Партия прошла ОТК.\nУпаковка — паллет №3.' });
  const set = (k: string) => (v: string) => setValues((p) => ({ ...p, [k]: v }));
  const [allowDecimal, setAllowDecimal] = useState(true);
  const [rows, setRows] = useState('3');
  const [single, setSingle] = useState('');
  const [multi, setMulti] = useState<string[]>(['progress', 'done']);
  const [noPortal, setNoPortal] = useState('');
  const [radio, setRadio] = useState('shift-a');
  const [radioDir, setRadioDir] = useState<'vertical' | 'horizontal'>('vertical');
  const [slider, setSlider] = useState(64);
  const [range, setRange] = useState<[number | null, number | null]>([20, 140]);
  const [checks, setChecks] = useState({ a: true, b: false, c: true });

  return (
    <div>
      <Section title="CustomInput — все 9 типов" subtitle="Один компонент вместо TextInput / NumberInput / PasswordInput / DateTimePicker / Textarea">
        <div style={grid(300)}>
          {INPUT_TYPES.map((d) => (
            <Cell key={d.type} title={d.label} props={[`type="${d.type}"`]} footer={<><Chip>value: {JSON.stringify(values[d.type].slice(0, 24))}</Chip><span style={{ fontSize: 11, color: t.textMuted }}>{d.hint}</span></>}>
              <CustomInput
                type={d.type} label={d.label} theme={t} value={values[d.type]} onChange={set(d.type)}
                showStrength={d.type === 'password'}
                allowDecimal={d.type === 'number' ? allowDecimal : undefined}
                min={d.type === 'number' ? 0 : undefined} max={d.type === 'number' ? 500 : undefined} step={d.type === 'number' ? (allowDecimal ? 0.5 : 1) : undefined}
                rows={d.type === 'textarea' ? Number(rows) || 3 : undefined} maxLength={d.type === 'textarea' ? 160 : undefined}
              />
              {d.type === 'number' && <div style={{ marginTop: 10 }}><Checkbox size="sm" theme={t} label="allowDecimal" checked={allowDecimal} onChange={setAllowDecimal} /></div>}
              {d.type === 'textarea' && (
                <div style={{ marginTop: 10, width: 140 }}>
                  <CustomInput type="number" label="rows" theme={t} value={rows} onChange={setRows} allowDecimal={false} min={2} max={8} />
                </div>
              )}
            </Cell>
          ))}
        </div>
      </Section>

      <Section title="CustomSelect — single / multiple" subtitle="Поиск, клавиатура ↑↓ Enter Esc, «Выбрать все», плюрализация, портал">
        <div style={grid(300)}>
          <Cell title="Одиночный" props={['type="single"']} footer={<Chip>value: {single || '—'}</Chip>}>
            <CustomSelect label="Статус заказа" theme={t} options={STATUS_OPTIONS} value={single} onChange={setSingle} />
          </Cell>
          <Cell title="Множественный" props={['type="multiple"']} footer={<Chip>value: [{multi.join(', ')}]</Chip>}>
            <CustomSelect type="multiple" label="Статусы" theme={t} options={STATUS_OPTIONS} value={multi} onChange={setMulti} />
          </Cell>
          <Cell title="Ошибка + disabled" props={['error', 'disabled']}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CustomSelect label="С ошибкой" theme={t} options={LINE_OPTIONS} value="" onChange={() => {}} error="Выберите линию" />
              <CustomSelect label="Заблокирован" theme={t} options={LINE_OPTIONS} value={LINES[0]} onChange={() => {}} disabled />
            </div>
          </Cell>
          <Cell title="Без портала" props={['usePortal={false}']} footer={<span style={{ fontSize: 11, color: t.textMuted }}>дропдаун обрезается overflow:hidden контейнера — так работает флаг</span>}>
            <div style={{ height: 120, overflow: 'hidden', border: `1px dashed ${t.border}`, borderRadius: 10, padding: 10 }}>
              <CustomSelect label="Линия" theme={t} options={LINE_OPTIONS} value={noPortal} onChange={setNoPortal} usePortal={false} />
            </div>
          </Cell>
        </div>
      </Section>

      <Section title="Checkbox · RadioGroup" subtitle="Нативные input внутри: клавиатура и скринридеры из коробки">
        <div style={grid(300)}>
          <Cell title="Checkbox" props={['size="md"', 'description']}>
            <Checkbox theme={t} label="Уведомлять о блокировках" description="Пуш при статусе «Блокирован»" checked={checks.a} onChange={(v) => setChecks({ ...checks, a: v })} />
            <Checkbox theme={t} label="Автозакрытие смены" checked={checks.b} onChange={(v) => setChecks({ ...checks, b: v })} />
          </Cell>
          <Cell title="Checkbox sm + truncate" props={['size="sm"', 'truncate', 'disabled']}>
            <Checkbox theme={t} size="sm" truncate label="Очень длинная метка, которая обрезается многоточием в одну строку" checked={checks.c} onChange={(v) => setChecks({ ...checks, c: v })} />
            <Checkbox theme={t} size="sm" label="Заблокированный пункт" checked disabled onChange={() => {}} />
          </Cell>
          <Cell title="RadioGroup" props={[`direction="${radioDir}"`]} footer={<Chip>value: {radio}</Chip>}>
            <RadioGroup theme={t} label="Смена" value={radio} onChange={setRadio} direction={radioDir}
              options={[
                { value: 'shift-a', label: 'Смена A', description: '06:00 – 14:00' },
                { value: 'shift-b', label: 'Смена B', description: '14:00 – 22:00' },
                { value: 'shift-c', label: 'Смена C', description: '22:00 – 06:00' },
              ]} />
            <div style={{ marginTop: 8 }}>
              <Checkbox size="sm" theme={t} label="Горизонтальная раскладка" checked={radioDir === 'horizontal'} onChange={(v) => setRadioDir(v ? 'horizontal' : 'vertical')} />
            </div>
          </Cell>
        </div>
      </Section>

      <Section title="RangeSlider · FileSelector" subtitle="Drag, клик по треку, стрелки клавиатуры, ручной ввод; drag&drop файлов с валидацией размера">
        <div style={grid(320)}>
          <Cell title="Одиночный" props={['range={false}']} footer={<Chip>value: {slider}</Chip>}>
            <RangeSlider label="Мощность, %" theme={t} min={0} max={100} step={1} value={slider} onChange={setSlider} />
          </Cell>
          <Cell title="Диапазон" props={['range', 'null = не задано']} footer={<Chip>[{String(range[0])}, {String(range[1])}]</Chip>}>
            <RangeSlider range label="Партия, шт." theme={t} min={0} max={240} step={4} value={range} onChange={setRange} />
          </Cell>
          <Cell title="FileSelector" props={['multiple', 'maxSizeMb={5}', 'accept']}>
            <FileSelector label="Вложения к заказу" theme={t} multiple accept="image/*,.pdf" maxSizeMb={5}
              onFiles={(f) => toast.info(`Выбрано файлов: ${f.length}`)} />
          </Cell>
          <Cell title="FileSelector disabled" props={['disabled']}>
            <FileSelector label="Архив закрыт" theme={t} disabled onFiles={() => {}} />
          </Cell>
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════════════ 8. КОМПОНЕНТЫ (UI-ГАЛЕРЕЯ) ═══════════════════════════ */

const ALL_ICONS: { name: string; C: React.ComponentType<any> }[] = [
  { name: 'IcoChevronLeft', C: IcoChevronLeft }, { name: 'IcoChevronRight', C: IcoChevronRight },
  { name: 'IcoChevronDown', C: IcoChevronDown }, { name: 'IcoChevronUp', C: IcoChevronUp },
  { name: 'IcoLogIn', C: IcoLogIn }, { name: 'IcoLogOut', C: IcoLogOut }, { name: 'IcoFilter', C: IcoFilter },
  { name: 'IcoSearch', C: IcoSearch }, { name: 'IcoX', C: IcoX }, { name: 'IcoEye', C: IcoEye },
  { name: 'ExportIcon', C: ExportIcon }, { name: 'IcoCheck', C: IcoCheck }, { name: 'IcoArrowUp', C: IcoArrowUp },
  { name: 'IcoArrowDown', C: IcoArrowDown }, { name: 'CalendarIcon', C: CalendarIcon }, { name: 'ClockIcon', C: ClockIcon },
  { name: 'DateTimeIcon', C: DateTimeIcon }, { name: 'IcoFile', C: IcoFile }, { name: 'IcoHorHeader', C: IcoHorHeader },
  { name: 'IcoVerHeader', C: IcoVerHeader },
];

function ForcedMobileDemo() {
  const r = useResponsive();
  const { theme } = useApp();
  const t = themes[theme];
  const [page, setPage] = useState(2);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <Chip color={t.accent}>width: {r.width}</Chip><Chip>isMobile: {String(r.isMobile)}</Chip><Chip>isTouch: {String(r.isTouch)}</Chip>
      </div>
      <div style={{ maxWidth: 380 }}>
        <Pagination t={t} total={87} page={page} defaultPerPage={10} onPageChange={setPage} sticky={false} />
      </div>
    </div>
  );
}

function UiPage() {
  const { theme, setTheme, layout, setLayout, density, setDensity, showHints, setShowHints, perPage, setPerPage } = useApp();
  const t = themes[theme];
  const navigate = useNavigate();
  const [menuTab, setMenuTab] = useState('queue');
  const [overlayOn, setOverlayOn] = useState(true);
  const [overlayDelay, setOverlayDelay] = useState(300);
  const [iconSize, setIconSize] = useState(24);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [uncontrolledPage, setUncontrolledPage] = useState(1);
  const [mGrid, setMGrid] = useState(false);
  const [mFull, setMFull] = useState(false);
  const [mNoFooter, setMNoFooter] = useState(false);
  const [mDanger, setMDanger] = useState(false);
  const [gridName, setGridName] = useState('Пост 4');
  const [gridLine, setGridLine] = useState(LINES[1]);
  const { data: recent } = useFetch<{ items: Order[], total: number }>('/api/orders', { perPage: 3, page: 1 }, { initialData: { items: [], total: 0 } });

  const menuTabs: MenuTab[] = [
    { id: 'queue', label: 'Очередь', icon: <IcoSearch s={16} /> },
    { id: 'shifts', label: 'Смены', icon: <ClockIcon s={16} /> },
    { id: 'archive', label: 'Архив', icon: <IcoFile s={16} /> },
  ];
  const menuContent: Record<string, string> = {
    queue: 'Очередь: 14 заданий, следующее — фланец ступицы на линию B.',
    shifts: 'Смены: A (06–14), B (14–22), C (22–06). Пересменка в 13:45.',
    archive: 'Архив: 5 удалённых заказов доступны для восстановления.',
  };

  return (
    <div>
      <Section title="Button" subtitle="Все роли × outline × размеры × disabled · hover не залипает на таче">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          {(['primary', 'danger', 'success'] as const).map((v) => (
            <div key={v} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip>{v}</Chip>
              <Button theme={t} variant={v} onClick={() => toast.info(`Button variant="${v}"`)}>Solid md</Button>
              <Button theme={t} variant={v} size="sm" onClick={() => toast.info(`Button size="sm"`)}>Solid sm</Button>
              <Button theme={t} variant={v} outline onClick={() => toast.info(`Button outline`)}>Outline</Button>
              <Button theme={t} variant={v} outline size="sm" icon={<IcoCheck s={12} />} onClick={() => toast.info('Button с иконкой')}>С иконкой</Button>
              <Button theme={t} variant={v} disabled onClick={() => {}}>Disabled</Button>
              <Button theme={t} variant={v} outline size="sm" icon={<IcoX s={11} />} aria-label={`Иконка ${v}`} onClick={() => toast.info('Icon-only кнопка')} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Badge" subtitle="filled / outlined / soft · три размера · произвольные цвета">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          {(['filled', 'soft', 'outlined'] as const).map((v) => (
            <React.Fragment key={v}>
              <Badge theme={t} variant={v} size="sm">{v} sm</Badge>
              <Badge theme={t} variant={v}>{v} md</Badge>
              <Badge theme={t} variant={v} size="lg" bgColor={t.pending}>{v} lg</Badge>
            </React.Fragment>
          ))}
          <Badge theme={t} variant="filled" bgColor="#d946ef">hot magenta</Badge>
          <Badge theme={t} variant="soft" bgColor="#06b6d4" opacity={0.25}>cyan soft 25%</Badge>
          <Badge theme={t} variant="outlined" borderColor={t.success} textColor={t.success}>custom</Badge>
        </div>
      </Section>

      <Section title="Modal — 4 сценария" subtitle="Сетка со span и required · fullscreen · без футера · danger-confirm · focus-trap и Enter">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button theme={t} variant="primary" onClick={() => setMGrid(true)}>Сетка 2×3 + span</Button>
          <Button theme={t} variant="primary" outline onClick={() => setMFull(true)}>Fullscreen</Button>
          <Button theme={t} variant="primary" outline onClick={() => setMNoFooter(true)}>Без футера</Button>
          <Button theme={t} variant="danger" outline onClick={() => setMDanger(true)}>Danger confirm</Button>
        </div>
        <Modal theme={t} isOpen={mGrid} onClose={() => setMGrid(false)} onOk={() => { setMGrid(false); toast.success(`Создан ${gridName} · ${gridLine}`); }}
          title="Новый пост" columns={2} rows={3} width={620} okText="Создать"
          fields={[
            { row: 0, col: 0, required: true, content: <CustomInput label="Название поста" theme={t} value={gridName} onChange={setGridName} /> },
            { row: 0, col: 1, content: <CustomSelect label="Линия" theme={t} options={LINE_OPTIONS} value={gridLine} onChange={setGridLine} /> },
            { row: 1, col: 0, colspan: 2, content: <CustomInput type="textarea" label="Описание (colspan=2)" theme={t} value="Пост финальной сборки с контролем момента затяжки." onChange={() => {}} rows={2} /> },
            { row: 2, col: 0, colspan: 2, content: <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Chip>rowspan/colspan</Chip><Chip>required → *</Chip><Chip>rowAlign</Chip><Chip>Enter = Ok</Chip><Chip>Esc = закрыть</Chip></div> },
          ]} />
        <Modal theme={t} isOpen={mFull} onClose={() => setMFull(false)} onOk={() => setMFull(false)} fullscreen
          title="Fullscreen-режим" columns={1} rows={2} okText="Готово"
          fields={[
            { row: 0, col: 0, content: <p style={{ margin: 0, color: t.text, lineHeight: 1.6 }}>На мобильном любая модалка автоматически становится полноэкранной. Здесь флаг <code>fullscreen</code> включён принудительно — попробуйте на десктопе.</p> },
            { row: 1, col: 0, content: <CustomInput type="textarea" label="Заметка" theme={t} value="" onChange={() => {}} rows={6} maxLength={500} /> },
          ]} />
        <Modal theme={t} isOpen={mNoFooter} onClose={() => setMNoFooter(false)} onOk={() => {}} showOk={false} showCancel={false}
          title="Только крестик / Esc" columns={1} rows={1} width={420}
          fields={[{ row: 0, col: 0, content: <p style={{ margin: 0, color: t.textMuted, fontSize: 14, lineHeight: 1.6 }}>Футер скрыт (<code>showOk=false showCancel=false</code>). Закрытие — крестиком или Escape; фокус заперт внутри и возвращается на кнопку после закрытия.</p> }]} />
        <Modal theme={t} isOpen={mDanger} onClose={() => setMDanger(false)} onOk={() => { setMDanger(false); toast.success('Смена закрыта', { label: 'Отменить', run: () => toast.info('Закрытие отменено') }); }}
          title="Закрыть смену?" columns={1} rows={1} width={440} okText="Закрыть смену"
          fields={[{ row: 0, col: 0, content: <div style={{ color: t.text, fontSize: 14, lineHeight: 1.6 }}>Незавершённых заданий: <strong style={{ color: t.danger }}>3</strong>.<div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>После закрытия смена уйдёт в архив — действие можно отменить из тоста.</div></div> }]} />
      </Section>

      <div style={grid(340)}>
        <Section title="Menu" subtitle="Standalone вертикальное меню">
          <div style={{ display: 'flex', gap: 14, background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', minHeight: 220 }}>
            <Menu tabs={menuTabs} activeTab={menuTab} onTabChange={setMenuTab} theme={t} style={{ width: 180, height: 'auto', position: 'static', borderRight: `1px solid ${t.border}` }} />
            <div style={{ padding: 16, flex: 1, color: t.text, fontSize: 13, lineHeight: 1.6 }}>
              <Badge theme={t} size="sm" variant="soft">{menuTabs.find((x) => x.id === menuTab)?.label}</Badge>
              <p style={{ marginTop: 10 }}>{menuContent[menuTab]}</p>
            </div>
          </div>
        </Section>
        <Section title="LoadingOverlay" subtitle="Задержка против мигания · поверх relative-контейнера">
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            <Checkbox size="sm" theme={t} label="visible" checked={overlayOn} onChange={setOverlayOn} />
            <div style={{ width: 200 }}><RangeSlider label="delayMs" theme={t} min={0} max={1500} step={50} value={overlayDelay} onChange={setOverlayDelay} /></div>
          </div>
          <div style={{ position: 'relative', height: 170, borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgSurface, padding: 14, overflow: 'hidden' }}>
            {['Фланец ступицы — 120 шт.', 'Вал приводной — 48 шт.', 'Корпус редуктора — 16 шт.'].map((s) => (
              <div key={s} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.borderSubtle}`, marginBottom: 8, color: t.text, fontSize: 13 }}>{s}</div>
            ))}
            <LoadingOverlay visible={overlayOn} theme={t} delayMs={overlayDelay} label="Синхронизация…" />
          </div>
        </Section>
      </div>

      <div style={grid(340)}>
        <Section title="MobileCardList + skeleton" subtitle="Standalone · loading-скелетон · действия в футере">
          <Checkbox size="sm" theme={t} label="loading (скелетон)" checked={cardsLoading} onChange={setCardsLoading} />
          <div style={{ marginTop: 10 }}>
            <MobileCardList<Order> t={t} data={recent?.items ?? []} rowKey="id" loading={cardsLoading}
              titleRender={(o) => `${o.orderNo} — ${o.product}`}
              fields={[{ label: 'Статус', render: (o) => <Badge theme={t} size="sm" bgColor={STATUS_META[o.status].color} variant="soft">{STATUS_META[o.status].label}</Badge> }, { label: 'Партия', render: (o) => `${o.qty} шт.` }]}
              actions={() => <Button theme={t} size="sm" outline variant="primary" onClick={() => navigate('/orders')}>В таблицу</Button>} />
          </div>
        </Section>
        <Section title="Pagination uncontrolled + AppProvider forceMode" subtitle="Слева — локальное состояние; справа — принудительно мобильный контекст на десктопе">
          <Cell title="Uncontrolled" props={['page не передан']} footer={<Chip>внутренняя страница: {uncontrolledPage}</Chip>}>
            <Pagination t={t} total={123} defaultPerPage={10} onPageChange={setUncontrolledPage} />
          </Cell>
          <div style={{ height: 14 }} />
          <Cell title="AppProvider forceMode" props={['forceMode="mobile"']}>
            <AppProvider forceMode="mobile"><ForcedMobileDemo /></AppProvider>
          </Cell>
        </Section>
      </div>

      <Section title="ThemeSwitcher · LayoutToggle" subtitle="Standalone-контролы (в Header они уже встроены)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          <ThemeSwitcher theme={theme} onChange={setTheme} t={t} />
          <ThemeSwitcher theme={theme} onChange={setTheme} t={t} compact />
          <LayoutToggle mode={layout} onChange={setLayout} theme={t} />
          <Chip>theme: {theme}</Chip><Chip>layout: {layout}</Chip>
        </div>
      </Section>

      <Section title="Настройки модуля — useApp()" subtitle="createAppModule settings: density и showHints персистятся в localStorage и синхронизируются между вкладками">
        <div style={grid(300)}>
          <Cell title="density" props={['setting(oneOf(...))']} footer={<Chip>применяется к padding строк таблицы заказов</Chip>}>
            <RadioGroup theme={t} label="Плотность таблицы" direction="horizontal" value={density} onChange={setDensity}
              options={[{ value: 'comfortable', label: 'Свободная' }, { value: 'compact', label: 'Плотная' }]} />
          </Cell>
          <Cell title="showHints" props={['setting(true)']}>
            <Checkbox theme={t} label="Показывать подсказки демо" description="Панель аккаунтов на странице входа и подсказки хуков" checked={showHints} onChange={setShowHints} />
          </Cell>
          <Cell title="perPage (базовая настройка UI)" footer={<Chip>используется Pagination на /orders</Chip>}>
            <CustomSelect label="Строк на странице" theme={t} value={String(perPage)} onChange={(v) => setPerPage(Number(v))}
              options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: `${n} строк` }))} />
          </Cell>
        </div>
      </Section>

      <Section title="Все 20 иконок" subtitle="Проп s управляет размером · цвет наследуется через currentColor">
        <div style={{ marginBottom: 12, maxWidth: 280 }}>
          <RangeSlider label="Размер s" theme={t} min={12} max={48} step={2} value={iconSize} onChange={setIconSize} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {ALL_ICONS.map(({ name, C }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 12, border: `1px solid ${t.border}`, background: t.bgSurface, color: t.accent }}>
              <C s={iconSize} />
              <span className="demo-chip" style={{ fontSize: 10, color: t.textMuted }}>{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Темы · colorScheme · readableOn" subtitle="Четыре темы из реестра — примените и посмотрите, как перекрашивается вся витрина, включая порталы">
        <div style={grid(240)}>
          {(Object.keys(themes) as ThemeName[]).map((name) => {
            const th = themes[name];
            return (
              <div key={name} style={{ border: `1px solid ${name === theme ? th.accent : t.border}`, borderRadius: 14, overflow: 'hidden', background: th.bgSurface, boxShadow: name === theme ? `0 0 0 2px ${th.accentGlow}` : 'none' }}>
                <div style={{ height: 64, background: `linear-gradient(120deg, ${th.bg}, ${th.accent}44 60%, ${th.pending}33)`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: th.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: readableOn(th.accent), fontWeight: 800, fontSize: 13 }}>◈</span>
                  <span style={{ color: th.text, fontWeight: 700 }}>{th.label}</span>
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[th.bg, th.bgSurface, th.accent, th.danger, th.success, th.pending, th.border].map((c, i) => (
                      <span key={i} title={c} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: `1px solid ${th.border}` }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="demo-chip" style={{ fontSize: 10, color: th.textMuted }}>colorScheme: {colorScheme(th.bg)}</span>
                    <span className="demo-chip" style={{ fontSize: 10, background: th.accent, color: readableOn(th.accent), padding: '2px 6px', borderRadius: 6 }}>readableOn</span>
                  </div>
                  <Button theme={th} size="sm" variant={name === theme ? 'success' : 'primary'} outline={name !== theme}
                    onClick={() => { setTheme(name); toast.success(`Тема: ${th.label}`); }}>
                    {name === theme ? 'Активна' : 'Применить'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════════════ 9. ДИАГРАММЫ (живая панель) ═══════════════════════════ */

const CHART_SERIES = [
  { key: 'done', label: 'Выполнено', color: '#22c55e' }, { key: 'progress', label: 'В работе', color: '#f59e0b' },
  { key: 'new', label: 'Новые', color: '#3b82f6' }, { key: 'blocked', label: 'Блокировано', color: '#ef4444' },
  { key: 'return', label: 'Возврат', color: '#d946ef' }, { key: 'audit', label: 'Аудит', color: '#06b6d4' },
];
const LINE_COLORS = ['#6c8aff', '#00c8ff', '#c84bff', '#f59e0b'];

function genChartData(seed: number) {
  const rnd = mulberry32(seed);
  const weeks = ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4', 'Нед 5', 'Нед 6'];
  const hist: HistogramDataItem[] = [];
  const pie: PieDataItem[] = [];
  LINES.forEach((line, li) => {
    let lineTotal = 0;
    const children: PieDataItem[] = CHART_SERIES.map((s) => {
      const value = Math.max(2, Math.round((14 + rnd() * 60) * (1 - li * 0.12)));
      lineTotal += value;
      return { id: `${line}-${s.key}`, label: s.label, value, parent: line, level: 1, color: s.color };
    });
    pie.push({ id: line, label: line, value: lineTotal, level: 0, color: LINE_COLORS[li] }, ...children);
    weeks.forEach((w, wi) => CHART_SERIES.forEach((s) => {
      hist.push({ id: `${w}-${s.key}`, label: w, series: s.label, value: Math.max(1, Math.round((10 + rnd() * 46) * (1 - wi * 0.06))), color: s.color });
    }));
  });
  return { hist, pie };
}

const CHART_DEFAULTS = {
  barMode: 'stacked' as 'stacked' | 'grouped', sort: 'none' as 'none' | 'desc' | 'asc',
  stepSize: '', groupGap: 0.2, dim: 0.25, values: true, xAxis: true, yAxis: true, legend: true,
  xLabel: 'Недели', yLabel: 'Заказы',
  inner: 40, ring: 26, orient: 'radial' as 'radial' | 'radial90' | 'horizontal',
  legendPos: 'right' as 'left' | 'right', labels: false, legendValues: true,
};

function ChartsPage() {
  const { theme } = useApp();
  const t = themes[theme];
  const { isMobile } = useResponsive();
  const [seed, setSeed] = useState(7);
  const [c, setC] = useState(CHART_DEFAULTS);
  const [histHover, setHistHover] = useState<HistogramDataItem | null>(null);
  const [pieHover, setPieHover] = useState<PieDataItem | null>(null);
  const histRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const { hist, pie } = useMemo(() => genChartData(seed), [seed]);
  const set = <K extends keyof typeof CHART_DEFAULTS>(k: K, v: (typeof CHART_DEFAULTS)[K]) => setC((p) => ({ ...p, [k]: v }));

  const controlPanel = (
    <div style={{
      background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
      ...(isMobile ? {} : { position: 'sticky', top: 12, maxHeight: 'calc(100dvh - 110px)', overflowY: 'auto' }),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: t.accent, display: 'flex' }}><IcoFilter s={15} /></span>
        <strong style={{ color: t.text, fontSize: 14 }}>Панель управления</strong>
        <Chip>live</Chip>
      </div>
      <CustomSelect label="barMode" theme={t} value={c.barMode} onChange={(v) => set('barMode', v as any)}
        options={[{ value: 'stacked', label: 'stacked' }, { value: 'grouped', label: 'grouped' }]} />
      <CustomSelect label="sortStackedSegments" theme={t} value={c.sort} onChange={(v) => set('sort', v as any)}
        options={[{ value: 'none', label: 'none' }, { value: 'desc', label: 'desc' }, { value: 'asc', label: 'asc' }]} />
      <CustomInput type="number" label="stepSize (пусто = авто)" theme={t} value={c.stepSize} onChange={(v) => set('stepSize', v)} allowDecimal={false} min={1} max={100} />
      <RangeSlider label="groupGap" theme={t} min={0} max={0.8} step={0.05} value={c.groupGap} onChange={(v) => set('groupGap', v)} formatValue={(v) => v == null ? '' : v.toFixed(2)} />
      <RangeSlider label="dimOpacity" theme={t} min={0} max={0.8} step={0.05} value={c.dim} onChange={(v) => set('dim', v)} formatValue={(v) => v == null ? '' : v.toFixed(2)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Checkbox size="sm" theme={t} label="showValues" checked={c.values} onChange={(v) => set('values', v)} />
        <Checkbox size="sm" theme={t} label="showXAxis" checked={c.xAxis} onChange={(v) => set('xAxis', v)} />
        <Checkbox size="sm" theme={t} label="showYAxis" checked={c.yAxis} onChange={(v) => set('yAxis', v)} />
        <Checkbox size="sm" theme={t} label="showLegend" checked={c.legend} onChange={(v) => set('legend', v)} />
      </div>
      <CustomInput label="xAxisLabel" theme={t} value={c.xLabel} onChange={(v) => set('xLabel', v)} />
      <CustomInput label="yAxisLabel" theme={t} value={c.yLabel} onChange={(v) => set('yLabel', v)} />
      <div style={{ borderTop: `1px solid ${t.borderSubtle}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <RangeSlider label="innerRadius" theme={t} min={0} max={80} step={2} value={c.inner} onChange={(v) => set('inner', v)} />
        <RangeSlider label="ringThickness" theme={t} min={12} max={48} step={2} value={c.ring} onChange={(v) => set('ring', v)} />
        <CustomSelect label="labelOrientation" theme={t} value={c.orient} onChange={(v) => set('orient', v as any)}
          options={[{ value: 'radial', label: 'radial' }, { value: 'radial90', label: 'radial90' }, { value: 'horizontal', label: 'horizontal' }]} />
        <CustomSelect label="legendPosition" theme={t} value={c.legendPos} onChange={(v) => set('legendPos', v as any)}
          options={[{ value: 'right', label: 'right' }, { value: 'left', label: 'left' }]} />
        <Checkbox size="sm" theme={t} label="showLabels (pie)" checked={c.labels} onChange={(v) => set('labels', v)} />
        <Checkbox size="sm" theme={t} label="showLegendValues (pie)" checked={c.legendValues} onChange={(v) => set('legendValues', v)} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${t.borderSubtle}`, paddingTop: 12 }}>
        <Button theme={t} size="sm" variant="primary" outline icon={<IcoChevronUp s={12} />} onClick={() => { setC(CHART_DEFAULTS); toast.info('Параметры сброшены'); }}>Сброс</Button>
        <Button theme={t} size="sm" variant="success" outline icon={<IcoFilter s={12} />} onClick={() => { setSeed((s) => s + 1); toast.info('Данные перегенерированы'); }}>Рандом</Button>
        <Button theme={t} size="sm" variant="primary" outline icon={<ExportIcon s={12} />} onClick={() => exportSvg(histRef, 'histogram.svg', t.bgSurface)}>SVG hist</Button>
        <Button theme={t} size="sm" variant="primary" outline icon={<ExportIcon s={12} />} onClick={() => exportSvg(pieRef, 'pie.svg', t.bgSurface)}>SVG pie</Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>
        <Section title="Histogram" subtitle="6 серий · seed-набор · наведите/тапните бар или легенду · клик по бару — тост">
          <div ref={histRef} style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
            <Histogram data={hist} theme={t} height={400}
              barMode={c.barMode} sortStackedSegments={c.sort} stepSize={c.stepSize ? Number(c.stepSize) : undefined}
              groupGap={c.groupGap} dimOpacity={c.dim} showValues={c.values} showXAxis={c.xAxis} showYAxis={c.yAxis}
              showLegend={c.legend} xAxisLabel={c.xLabel} yAxisLabel={c.yLabel}
              onBarHover={setHistHover} onBarClick={(i) => i && toast.info(`${i.label} · ${i.series}: ${i.value}`)} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip>onBarHover:</Chip>
            {histHover ? <Chip color={t.accent}>{histHover.label} · {histHover.series} = {histHover.value}</Chip> : <Chip>—</Chip>}
          </div>
        </Section>
        <Section title="PieChart — sunburst" subtitle="2 уровня: линии → статусы · донат-центр показывает активный сегмент">
          <div ref={pieRef} style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
            <PieChart data={pie} theme={t} height={420} innerRadius={c.inner} ringThickness={c.ring}
              showLabels={c.labels} labelOrientation={c.orient} legendPosition={c.legendPos}
              showLegend={c.legend} showLegendValues={c.legendValues} dimOpacity={c.dim}
              onSegmentHover={setPieHover} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip>onSegmentHover:</Chip>
            {pieHover ? <Chip color={t.accent}>{pieHover.label} = {pieHover.value} (уровень {pieHover.level})</Chip> : <Chip>—</Chip>}
          </div>
        </Section>
      </div>
      {controlPanel}
    </div>
  );
}

/* ═══════════════════════════ 10. КАЛЕНДАРЬ ═══════════════════════════ */

const TEMPLATES: TemplateOption[] = [
  { value: 'five-two', label: '5/2', color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.22)' },
  { value: 'two-two', label: '2/2', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.22)' },
  { value: 'off', label: 'Выходной', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.18)' },
];
function seedAssignments(): Record<string, CalendarAssignment> {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  const out: Record<string, CalendarAssignment> = {};
  for (let d = 1; d <= Math.min(28, new Date(y, m + 1, 0).getDate()); d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(y, m, d).getDay();
    if (dow === 0 || dow === 6) out[key] = { shift_template_id: 'off', day_shift: null, evening_shift: null, night_shift: null };
    else out[key] = { shift_template_id: d % 4 < 2 ? 'five-two' : 'two-two', day_shift: d % 3 === 0 ? 'A' : null, evening_shift: d % 3 === 1 ? 'B' : null, night_shift: d % 3 === 2 ? 'C' : null };
  }
  return out;
}

function CalendarPage() {
  const { theme } = useApp();
  const t = themes[theme];
  const [assignments, setAssignments] = usePersistentState<Record<string, CalendarAssignment>>('demo-calendar', seedAssignments());
  const count = Object.keys(assignments).length;
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <StatCard theme={t} label="Назначено дней" value={String(count)} hint="персист в localStorage" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {TEMPLATES.map((tp) => <Badge key={tp.value} theme={t} bgColor={tp.color} variant="soft">{tp.label}</Badge>)}
          <Button theme={t} size="sm" variant="danger" outline icon={<IcoX s={11} />}
            onClick={() => { setAssignments({}); toast.success('Календарь очищен', { label: 'Отменить', run: () => setAssignments(seedAssignments()) }); }}>
            Очистить всё
          </Button>
          <Button theme={t} size="sm" variant="primary" outline icon={<IcoChevronUp s={12} />}
            onClick={() => { setAssignments(seedAssignments()); toast.info('Шаблоны восстановлены'); }}>
            Восстановить seed
          </Button>
        </div>
      </div>
      <Section title="Calendar" subtitle="Кликните день → кликните второй — диапазон применит шаблон; блок смен назначает Д/В/Н independently">
        <Calendar theme={t} templateOptions={TEMPLATES} enableShifts assignments={assignments}
          onAssignmentsChange={(next) => { setAssignments(next); toast.success(`Назначений обновлено: ${Object.keys(next).length}`); }} />
      </Section>
    </div>
  );
}

/* ═══════════════════════════ 11. СПРАВОЧНИК ═══════════════════════════ */

const DIR_TYPES: SelectOption[] = [
  { value: 'section', label: 'Раздел' }, { value: 'group', label: 'Группа' }, { value: 'item', label: 'Элемент' },
];
const DIR_LABELS: Record<string, string> = { root: 'Справочник', section: 'Раздел', group: 'Группа', item: 'Элемент' };

function DirectoryPage() {
  const { theme, user } = useApp();
  const t = themes[theme];
  const [version, setVersion] = useState(0);
  const isWebAdmin = !!user?.webAdmin;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <Badge theme={t} variant={isWebAdmin ? 'filled' : 'soft'} bgColor={isWebAdmin ? t.accent : t.pending}>
          {isWebAdmin ? 'web-админ: полные права' : 'оператор: только корень «Производство»'}
        </Badge>
        {!isWebAdmin && <Chip>allowedDirectoryRoots=[1]</Chip>}
        <Chip>creatable · editable · deletable</Chip>
        <div style={{ flex: 1 }} />
        <Button theme={t} size="sm" variant="danger" outline icon={<IcoChevronUp s={12} />}
          onClick={() => { directoryApi.reset(); setVersion((v) => v + 1); toast.success('Справочник сброшен к seed'); }}>
          Сбросить данные
        </Button>
      </div>
      <Section title="DirectoryTree" subtitle="Десктоп — колонки уровней; узкий экран — drill-down с крошками. CRUD, сортировка ↑↓, удаление каскадом">
        <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, minHeight: 420 }}>
          <DirectoryTree key={version} theme={t} isAuthenticated api={directoryApi}
            directoryTypes={DIR_TYPES} typeLabels={DIR_LABELS} storageKey="demo-dir-type"
            isWebAdmin={isWebAdmin} allowedDirectoryRoots={isWebAdmin ? null : [1]}
            onError={(m) => toast.danger(m)} />
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════════════ 12. ПОЛИГОН ХУКОВ ═══════════════════════════ */

function HooksPage() {
  const { theme, showHints } = useApp();
  const t = themes[theme];
  const r = useResponsive();
  const wide = useMediaQuery('(min-width: 900px)');
  const portrait = useMediaQuery('(orientation: portrait)');
  const location = useLocation();
  const auth = useAuth();
  const ui = useUI();

  const [counter, setCounter] = usePersistentState('demo-hook-counter', 0);
  const [persistText, setPersistText] = usePersistentState('demo-hook-text', 'переживёт перезагрузку');
  const [raw, setRaw] = useState('печатайте здесь');
  const [delay, setDelay] = useState(400);
  const debounced = useDebouncedValue(raw, delay);
  const resizeRef = useRef<HTMLDivElement>(null);
  const size = useResizeObserver(resizeRef, 120);
  const [ticks, setTicks] = useState(0);
  const [tickMs, setTickMs] = useState(2000);
  const [tickPaused, setTickPaused] = useState(false);
  const [lastTick, setLastTick] = useState('—');
  useAutoRefresh(() => { setTicks((x) => x + 1); setLastTick(new Date().toLocaleTimeString('ru')); }, { intervalMs: tickMs, paused: tickPaused });
  const scanRef = useRef<HTMLInputElement>(null);
  const [afOn, setAfOn] = useState(false);
  useAutofocus(scanRef, { intervalMs: 3000, paused: !afOn });
  const [lock, setLock] = useState(false);
  useBodyScrollLock(lock);
  const [fq, setFq] = useState('вал');
  const [fail, setFail] = useState(false);
  const [skip, setSkip] = useState(false);
  const fetchDemo = useFetch<{ items: Order[]; total: number }>('/api/orders', { q: fq, perPage: 5, fail: fail || undefined }, { debounceMs: 400, skip, initialData: { items: [], total: 0 } });
  const people = useMemo(() => [
    { name: 'Крылова', age: 34 }, { name: 'Савельев', age: 41 }, { name: 'Гусев', age: 27 }, { name: 'Титова', age: 38 }, { name: 'Мельников', age: 29 },
  ], []);
  const { sortedData, sortState, setSortState } = useSort(people, [{ key: 'age', direction: 'asc' }]);
  const [overlayTick, setOverlayTick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setOverlayTick((x) => x + 1), 1000); return () => window.clearInterval(id); }, []);
  const overlayOpen = isOverlayOpen();
  const bodyOverflow = typeof document !== 'undefined' ? document.body.style.overflow || '(пусто)' : '';
  const styleTags = ['demo-vitrine-css', 'kbs-header-styles', 'kbs-theme-switcher-css'].filter((id) => typeof document !== 'undefined' && !!document.getElementById(id));
  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);
  useIsoLayoutEffect(() => { if (measureRef.current) setMeasured(Math.round(measureRef.current.getBoundingClientRect().width)); }, [theme]);
  const navVisible = filterNavTabs(TABS, auth.user);
  const activeTabId = matchActiveTab(location.pathname, navVisible);
  void overlayTick;

  const hint = (text: string) => showHints ? <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, lineHeight: 1.5 }}>{text}</div> : null;

  return (
    <div style={grid(340)}>
      <Cell title="useResponsive + useMediaQuery" props={['контекст', 'произвольные запросы']}
        footer={<><Chip>isMobile: {String(r.isMobile)}</Chip><Chip>isTablet: {String(r.isTablet)}</Chip><Chip>hasHover: {String(r.hasHover)}</Chip><Chip>isTouch: {String(r.isTouch)}</Chip><Chip>reducedMotion: {String(r.prefersReducedMotion)}</Chip><Chip color={t.accent}>≥900px: {String(wide)}</Chip><Chip>portrait: {String(portrait)}</Chip></>}>
        <div style={{ color: t.text, fontSize: 13, lineHeight: 1.6 }}>Сузьте окно или поверните устройство — значения обновятся. <code>useMediaQuery</code> кэширует MQL и работает через <code>useSyncExternalStore</code>.</div>
        {hint('Один набор подписок на всё приложение; компоненты читают контекст, а не создают свои matchMedia.')}
      </Cell>

      <Cell title="usePersistentState" props={['localStorage', 'syncTabs']}
        footer={<><Chip>counter: {counter}</Chip><Chip>text: {persistText.slice(0, 20)}</Chip></>}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <Button theme={t} size="sm" variant="primary" outline onClick={() => setCounter((c) => c - 1)}>−1</Button>
          <span style={{ fontSize: 22, fontWeight: 800, color: t.accent, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{counter}</span>
          <Button theme={t} size="sm" variant="primary" outline onClick={() => setCounter((c) => c + 1)}>+1</Button>
          <Button theme={t} size="sm" variant="danger" outline onClick={() => setCounter(0)}>Сброс</Button>
        </div>
        <CustomInput label="Персистентный текст" theme={t} value={persistText} onChange={setPersistText} />
        {hint('Перезагрузите страницу или откройте вторую вкладку — состояние синхронизируется через storage-событие.')}
      </Cell>

      <Cell title="useDebouncedValue" props={[`delayMs=${delay}`]}
        footer={<><Chip>raw: {raw.slice(0, 18)}</Chip><Chip color={t.accent}>debounced: {debounced.slice(0, 18)}</Chip>{raw !== debounced && <Badge theme={t} size="sm" bgColor={t.pending} variant="soft">печатает…</Badge>}</>}>
        <CustomInput label="Быстрое значение" theme={t} value={raw} onChange={setRaw} />
        <div style={{ marginTop: 12 }}><RangeSlider label="Задержка, мс" theme={t} min={0} max={1200} step={50} value={delay} onChange={setDelay} /></div>
      </Cell>

      <Cell title="useResizeObserver" props={['debounceMs=120']}
        footer={<Chip color={t.accent}>{Math.round(size.width)} × {Math.round(size.height)} px</Chip>}>
        <div ref={resizeRef} style={{ resize: 'both', overflow: 'auto', minWidth: 140, minHeight: 90, maxWidth: '100%', height: 120, border: `1.5px dashed ${t.accent}`, borderRadius: 10, padding: 12, color: t.textMuted, fontSize: 12, background: t.bg }}>
          Потяните за правый нижний угол ↘
        </div>
      </Cell>

      <Cell title="useAutoRefresh + isOverlayOpen" props={[`intervalMs=${tickMs}`, 'пауза на оверлеях']}
        footer={<><Chip>ticks: {ticks}</Chip><Chip>last: {lastTick}</Chip><Chip color={overlayOpen ? t.pending : t.success}>overlayOpen: {String(overlayOpen)}</Chip></>}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: 150 }}>
            <CustomSelect label="Интервал" theme={t} value={String(tickMs)} onChange={(v) => setTickMs(Number(v))}
              options={[{ value: '2000', label: '2 сек' }, { value: '5000', label: '5 сек' }, { value: '10000', label: '10 сек' }]} />
          </div>
          <Checkbox size="sm" theme={t} label="paused" checked={tickPaused} onChange={setTickPaused} />
        </div>
        {hint('Откройте любую модалку (например, «Новый заказ») — тикер замрёт, пока оверлей открыт, и overlayOpen станет true.')}
      </Cell>

      <Cell title="useAutofocus" props={['intervalMs=3000', 'skipWhenEditing']}
        footer={<Chip color={afOn ? t.success : t.textMuted}>{afOn ? 'активен' : 'выключен'}</Chip>}>
        <Checkbox size="sm" theme={t} label="Возвращать фокус на сканер-поле" checked={afOn} onChange={setAfOn} />
        <div style={{ marginTop: 10 }}>
          <CustomInput label="Поле сканера" theme={t} value="" onChange={() => {}} autoFocus={false} />
          <input ref={scanRef} aria-label="Сканер-поле (useAutofocus)" placeholder="сканер-поле"
            style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${t.borderFocus}`, background: t.bg, color: t.text, fontSize: 16, outline: 'none' }} />
        </div>
        {hint('Включите и кликните в другое поле本页ы — через 3 с фокус вернётся (если не открыт оверлей и вы не печатаете).')}
      </Cell>

      <Cell title="useBodyScrollLock" props={['overflow body']}
        footer={<Chip>body.overflow: {bodyOverflow || '(пусто)'}</Chip>}>
        <Checkbox size="sm" theme={t} label="Заблокировать прокрутку body" checked={lock} onChange={setLock} />
        {hint('Хук используется внутри Modal и мобильного drawer; здесь — напрямую, значение overflow читается вживую.')}
      </Cell>

      <Cell title="useFetch" props={['debounceMs=400', 'skip', 'refetch', 'error']}
        footer={<><Chip>total: {fetchDemo.data?.total ?? 0}</Chip><Chip color={t.accent}>loading: {String(fetchDemo.loading)}</Chip>{fetchDemo.error && <Chip color={t.danger}>{fetchDemo.error}</Chip>}</>}>
        <CustomInput label="Поиск по заказам" theme={t} value={fq} onChange={setFq} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0' }}>
          <Checkbox size="sm" theme={t} label="fail (500)" checked={fail} onChange={setFail} />
          <Checkbox size="sm" theme={t} label="skip" checked={skip} onChange={setSkip} />
          <Button theme={t} size="sm" variant="primary" outline onClick={() => fetchDemo.refetch()}>refetch()</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(fetchDemo.data?.items ?? []).slice(0, 4).map((o) => (
            <span key={o.id} className="demo-chip" style={{ fontSize: 11, color: t.text }}>{o.orderNo} · {o.product}</span>
          ))}
        </div>
      </Cell>

      <Cell title="useSort" props={['multi-key', 'пустые в конец']}
        footer={<Chip>{sortState.map((s) => `${s.key}:${s.direction}`).join(', ') || 'без сортировки'}</Chip>}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['name', 'age'] as const).map((k) => (
            <Button key={k} theme={t} size="sm" variant="primary" outline
              onClick={() => setSortState((prev) => {
                const cur = prev.find((s) => s.key === k);
                const dir = cur?.direction === 'asc' ? 'desc' : 'asc';
                return [{ key: k, direction: dir }, ...prev.filter((s) => s.key !== k)];
              })}>
              {k} {sortState.find((s) => s.key === k)?.direction === 'asc' ? '↑' : '↓'}
            </Button>
          ))}
          <Button theme={t} size="sm" variant="danger" outline onClick={() => setSortState([])}>Сброс</Button>
        </div>
        {sortedData.map((p) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: t.bg, border: `1px solid ${t.borderSubtle}`, marginBottom: 4, fontSize: 13, color: t.text }}>
            <span>{p.name}</span><span style={{ color: t.accent, fontVariantNumeric: 'tabular-nums' }}>{p.age}</span>
          </div>
        ))}
      </Cell>

      <Cell title="useModalForm" props={['isDirty', 'reset при открытии']}>
        <div style={{ color: t.text, fontSize: 13, lineHeight: 1.6 }}>
          Живёт в модалке «Новый заказ / Редактирование» на странице заказов: форма сбрасывается при каждом открытии,
          бейдж «есть изменения» — это <code>isDirty</code>, кнопка Ok активна только при.dirty+валидной форме.
        </div>
        <div style={{ marginTop: 10 }}><Button theme={t} size="sm" variant="primary" outline icon={<IcoChevronRight s={12} />} onClick={() => (window.location.hash = '') /* noop */} style={{ display: 'none' }}>—</Button>
          <Chip>см. /orders → Новый заказ</Chip></div>
      </Cell>

      <Cell title="useStyleTag + useIsoLayoutEffect" props={['идемпотентная инъекция', 'до отрисовки']}
        footer={<><Chip>style-теги: {styleTags.length}/3</Chip><Chip color={t.accent}>измерено до paint: {measured}px</Chip></>}>
        <div ref={measureRef} style={{ padding: '10px 12px', borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
          Ширина этого блока измерена useIsoLayoutEffect при смене темы — без мигания.
        </div>
        {hint('useStyleTag инжектит CSS один раз по id; useIsoLayoutEffect = useLayoutEffect на клиенте и useEffect на сервере.')}
      </Cell>

      <Cell title="Nav-хелперы + useAuth / useUI" props={['filterNavTabs', 'matchActiveTab']}
        footer={<><Chip>видимых табов: {navVisible.length}</Chip><Chip color={t.accent}>active: {activeTabId}</Chip><Chip>user: {auth.user?.username ?? '—'}</Chip><Chip>ui.theme: {ui.theme}</Chip><Chip>ui.layout: {ui.layout}</Chip></>}>
        <div style={{ color: t.text, fontSize: 13, lineHeight: 1.6 }}>
          Права фильтруют навигацию: войдите как <strong>operator</strong> — таб «Админ» исчезнет, а справочник ограничится одним корнем.
          guards (<code>ProtectedRoute / AdminRoute / WebAdminRoute / TabGuard</code>) демонстрируются на /admin.
        </div>
      </Cell>
    </div>
  );
}

/* ═══════════════════════════ 13. АДМИН + GUARDS ═══════════════════════════ */

function AdminPage() {
  const { theme, user, logout } = useApp();
  const t = themes[theme];
  const navigate = useNavigate();
  const { data, loading, refetch } = useFetch<{ items: DemoUser[] }>('/api/users', undefined, { initialData: { items: [] } });

  const columns: Column<DemoUser>[] = [
    { key: 'username', header: 'Логин', render: (v) => <span className="demo-chip" style={{ color: t.accent }}>{v}</span> },
    { key: 'name', header: 'Имя', render: (_v, u) => `${u.name} ${u.surname}` },
    { key: 'department', header: 'Подразделение' },
    { key: 'role', header: 'Роли', sortable: false, render: (_v, u) => (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {u.webAdmin && <Badge theme={t} size="sm" variant="filled" bgColor={t.accent}>web</Badge>}
        {u.isAdmin && <Badge theme={t} size="sm" variant="soft" bgColor={t.success}>admin</Badge>}
        {!u.isAdmin && <Badge theme={t} size="sm" variant="soft" bgColor={t.pending}>operator</Badge>}
      </div>
    ) },
    { key: 'allowedTabs', header: 'Доступ', render: (v: string[] | null) => v == null ? 'все разделы' : `${v.length} табов` },
  ];

  return (
    <TabGuard tabId="/admin">
      <div>
        <Section title="AdminRoute + TabGuard" subtitle="Сюда не попадёт оператор: таб скрыт в навигации, прямой URL редиректит на главную">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <Badge theme={t} variant="filled" bgColor={t.success}>AdminRoute ✓</Badge>
            <Badge theme={t} variant="filled" bgColor={t.accent}>TabGuard ✓</Badge>
            <Chip> ProtectedRoute охраняет весь shell</Chip>
            <div style={{ flex: 1 }} />
            <Button theme={t} size="sm" variant="danger" outline icon={<IcoLogOut s={13} />}
              onClick={async () => { await logout(); navigate('/login'); toast.info('Сеанс завершён — войдите как operator'); }}>
              Войти как оператор
            </Button>
          </div>
          <div style={{ position: 'relative' }}>
            <Table<DemoUser> theme={t} columns={columns} data={data?.items ?? []} rowKey="userId"
              sortable initialSort={[{ key: 'username', direction: 'asc' }]} loading={loading && !data?.items.length}
              persistKey="demo-users" refetch={refetch} autoRefreshInterval={30_000} />
            <LoadingOverlay visible={loading && !!data?.items.length} theme={t} />
          </div>
        </Section>

        <WebAdminRoute>
          <Section title="WebAdminRoute — только web-админ" subtitle="Вложенный guard: оператор с isAdmin тоже не увидит этот блок">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
              <Badge theme={t} variant="filled" bgColor={t.accent}>webAdmin ✓</Badge>
              <span style={{ color: t.text, fontSize: 13 }}>Сеанс: <strong>{user?.username}</strong> · сессия хранится в sessionStorage</span>
              <div style={{ flex: 1 }} />
              <Button theme={t} size="sm" variant="danger" outline icon={<IcoChevronUp s={12} />}
                onClick={async () => { await api.post('/api/demo/reset-orders'); toast.success('Заказы сброшены к seed (56 записей)'); }}>
                Сбросить заказы
              </Button>
              <Button theme={t} size="sm" variant="danger" outline icon={<IcoChevronUp s={12} />}
                onClick={() => { directoryApi.reset(); toast.success('Справочник сброшен к seed'); }}>
                Сбросить справочник
              </Button>
            </div>
          </Section>
        </WebAdminRoute>
      </div>
    </TabGuard>
  );
}

/* ═══════════════════════════ 14. ВХОД (AuthPage) ═══════════════════════════ */

function LoginPage() {
  const { theme, setTheme, login, error, clearError, user, showHints } = useApp();
  const t = themes[theme];
  const navigate = useNavigate();
  const [hintClosed, setHintClosed] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <AuthPage t={t} theme={theme} onThemeChange={setTheme}
        siteName="KBS UI Kit" logoSvg="◈" emailLabel="Логин" emailType="text"
        authError={error ?? undefined} onClearAuthError={clearError}
        onSuccess={async (u, p) => { await login(u, p); navigate('/', { replace: true }); toast.success('Добро пожаловать!'); }} />
      {showHints && !hintClosed && (
        <div role="note" style={{
          position: 'fixed', top: 16, left: 16, zIndex: 50, maxWidth: 270,
          background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 14,
          boxShadow: t.shadowLg, color: t.text, fontSize: 12.5, lineHeight: 1.6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Демо-аккаунты</strong>
            <button type="button" className="demo-focus" aria-label="Скрыть подсказку" onClick={() => setHintClosed(true)}
              style={{ background: 'none', border: 'none', color: t.iconColor, cursor: 'pointer', display: 'flex', padding: 4 }}><IcoX s={10} /></button>
          </div>
          <div><span className="demo-chip" style={{ color: t.accent }}>admin / admin123</span> — web-админ, все разделы</div>
          <div style={{ marginTop: 6 }}><span className="demo-chip" style={{ color: t.pending }}>operator / operator123</span> — без «Админ», справочник ограничен</div>
          {user && (
            <div style={{ marginTop: 10 }}>
              <Button theme={t} size="sm" variant="success" outline onClick={() => navigate('/')}>Вы уже вошли — в приложение</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 15. SHELL + APP ═══════════════════════════ */

const TITLES: Record<string, string> = {
  '/': 'Обзор', '/orders': 'Заказы', '/inputs': 'Поля', '/ui': 'Компоненты',
  '/charts': 'Диаграммы', '/hooks': 'Хуки', '/calendar': 'Календарь смен', '/directory': 'Справочник', '/admin': 'Администрирование',
};

function Shell() {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? 'UI Kit';
  return (
    <AppPageLayout title={title}>
      <Outlet />
    </AppPageLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <appModule.AppProvider>
        <Chrome />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="inputs" element={<InputsPage />} />
            <Route path="ui" element={<UiPage />} />
            <Route path="charts" element={<ChartsPage />} />
            <Route path="hooks" element={<HooksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </appModule.AppProvider>
    </BrowserRouter>
  );
}