import { useState } from 'react';
import {
  themes, ThemeName,
  ResponsiveProvider, useResponsive,
  MobileHeader, MobileCardList, MobilePagination,
  Modal, TextInput, Button,
  Calendar, PieChart, Histogram,
} from './index';

function ResponsiveDemoInner() {
  const [theme, setTheme] = useState<ThemeName>('dark');
  const t = themes[theme];
  const { isMobile, width } = useResponsive();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');

  const data = Array.from({ length: 5 }, (_, i) => ({
    ID: i + 1,
    NAME: `Пользователь ${i + 1}`,
    ROLE: i % 2 === 0 ? 'Администратор' : 'Пользователь',
  }));

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, padding: 12 }}>
      <div style={{ marginBottom: 12, fontSize: 13 }}>
        Текущий режим: <strong>{width}</strong> ({isMobile ? 'mobile' : 'desktop'})
      </div>

      <MobileHeader
        t={t}
        activeTab="/"
        onTabChange={(id) => console.log('tab', id)}
        isLoggedIn
        onSignIn={() => {}}
        onSignOut={() => {}}
        userName="admin"
        navTabs={[
          { id: '/', label: 'Главная', icon: '☷' },
          { id: '/users', label: 'Пользователи', icon: '🗣' },
        ]}
        siteName="Demo"
        currentTheme={theme}
        onThemeChange={setTheme}
        showThemeSwitcher
      />

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MobileCardList
          t={t}
          data={data}
          rowKey="ID"
          titleRender={(r) => r.NAME}
          fields={[
            { label: 'ID', render: (r) => r.ID },
            { label: 'Роль', render: (r) => r.ROLE },
          ]}
          onEdit={(r) => console.log('edit', r)}
        />

        <MobilePagination
          t={t}
          page={1}
          perPage={10}
          total={45}
          onPageChange={(p, pp) => console.log(p, pp)}
        />

        <Button variant="primary" theme={t} onClick={() => setModalOpen(true)}>
          Открыть модалку
        </Button>

        <Modal
          theme={t}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onOk={() => setModalOpen(false)}
          title="Пример формы"
          columns={2}
          rows={1}
          fields={[
            {
              row: 0,
              col: 0,
              content: (
                <TextInput
                  label="Имя"
                  theme={t}
                  value={name}
                  onChange={setName}
                />
              ),
            },
          ]}
        />

        <Calendar
          theme={t}
          templateOptions={[
            { value: 'work', label: 'Рабочий', color: '#2ecc71' },
            { value: 'weekend', label: 'Выходной', color: '#f39c12' },
          ]}
          assignments={{}}
        />

        <PieChart
          data={[
            { id: 1, label: 'A', value: 40, level: 0 },
            { id: 2, label: 'B', value: 30, level: 0 },
            { id: 3, label: 'C', value: 30, level: 0 },
          ]}
          theme={t}
          showLegend
        />

        <Histogram
          data={[
            { id: 1, label: 'Q1', value: 120, series: '2024' },
            { id: 2, label: 'Q2', value: 150, series: '2024' },
            { id: 3, label: 'Q1', value: 90, series: '2025' },
            { id: 4, label: 'Q2', value: 110, series: '2025' },
          ]}
          theme={t}
          showLegend
        />
      </div>
    </div>
  );
}

export function ResponsiveDemo() {
  const [mode, setMode] = useState<'mobile' | 'tablet' | 'desktop' | undefined>(undefined);
  return (
    <ResponsiveProvider forceMode={mode}>
      <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, display: 'flex', gap: 4 }}>
        {(['mobile', 'tablet', 'desktop', undefined] as const).map((m) => (
          <button
            key={String(m)}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              border: '1px solid #888', background: mode === m ? '#4361ee' : '#fff',
              color: mode === m ? '#fff' : '#000',
            }}
          >
            {m ?? 'auto'}
          </button>
        ))}
      </div>
      <ResponsiveDemoInner />
    </ResponsiveProvider>
  );
}