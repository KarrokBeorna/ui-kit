import React, { useState, useMemo } from 'react';
import { ThemeName, themes } from './themes/theme';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import TextInput from './components/TextInput';
import Textarea from './components/Textarea';
import Checkbox from './components/Checkbox';
import SearchableSelect from './components/SearchableSelect';
import DateTimePicker from './components/DateTimePicker';
import Modal from './components/Modal';
import Table, { Column } from './components/Table';
import Badge from './components/Badge';

const generateUserData = () => {
  const names = ['Алексей', 'Екатерина', 'Иван', 'Мария', 'Дмитрий', 'Ольга', 'Павел', 'Анна', 'Сергей', 'Татьяна'];
  const cities = ['Москва', 'СПб', 'Казань', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород', 'Краснодар', 'Владивосток'];
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: names[i % names.length] + (i >= names.length ? ` ${i}` : ''),
    age: 18 + Math.floor(Math.random() * 40),
    city: cities[i % cities.length],
    active: Math.random() > 0.4,
  }));
};

const cityOptions = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'kaz', label: 'Казань' },
  { value: 'nsk', label: 'Новосибирск' },
  { value: 'ekb', label: 'Екатеринбург' },
];

export default function App3() {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const t = themes[themeName];

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [agree, setAgree] = useState(false);
  const [city, setCity] = useState('');
  const [datetime, setDatetime] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const canSubmit = name.trim() !== '' && city !== '' && datetime !== '';
  const handleOk = () => {
    console.log('Modal data:', { name, comment, agree, city, datetime });
    setModalOpen(false);
  };

  const userData = useMemo(() => generateUserData(), []);
  const columns: Column<(typeof userData)[0]>[] = useMemo(
    () => [
      { key: 'name', header: 'Имя', sortable: true, style: { fontWeight: 500 } },
      { key: 'age', header: 'Возраст', sortable: true, style: { textAlign: 'center' as const }, headerStyle: { textAlign: 'center' as const } },
      { key: 'city', header: 'Город', sortable: true, render: (val: string) => <span style={{ color: t.accent }}>{val}</span> },
      {
        key: 'active',
        header: 'Активен',
        sortable: true,
        render: (val: boolean) => (
          <Badge theme={t} bgColor={val ? '#10b981' : '#ef4444'} borderColor={val ? '#10b981' : '#ef4444'} textColor="#fff" size="sm" variant="filled">
            {val ? 'Да' : 'Нет'}
          </Badge>
        ),
      },
    ],
    [t]
  );

  return (
    <div
      style={{
        background: t.bg,
        height: 'calc(100vh - 20px)', // или '100dvh', если браузер поддерживает
        overflow: 'hidden',
        color: t.text,
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '30px',
        boxSizing: 'border-box',
        margin: 0,
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexShrink: 0 }}>
          <h1 style={{ margin: 0 }}>Демо-приложение</h1>
          <ThemeSwitcher theme={themeName} onChange={setThemeName} t={t} />
        </div>

        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <button onClick={() => setModalOpen(true)} style={{ padding: '10px 24px', background: t.accent, color: t.accentText, border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 500, boxShadow: `0 0 0 2px ${t.accentGlow}`, transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Открыть модальное окно
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Table theme={t} columns={columns} data={userData} rowKey="id" fixedHeader height="100%" stickyRight={['active']} />
        </div>

        <Modal
          theme={t}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onOk={handleOk}
          title="Редактирование профиля"
          columns={2}
          rows={3}
          canSubmit={canSubmit}
          fields={[
            { row: 0, col: 0, colspan: 2, required: true, content: <TextInput label="Имя" theme={t} value={name} onChange={setName} inputType="text" /> },
            { row: 1, col: 0, colspan: 1, content: <Textarea label="Комментарий" theme={t} value={comment} onChange={setComment} rows={2} maxLength={100} /> },
            { row: 1, col: 1, colspan: 1, content: <Checkbox label="Согласен с условиями" theme={t} checked={agree} onChange={setAgree} /> },
            { row: 2, col: 0, colspan: 1, required: true, content: <SearchableSelect label="Город" theme={t} options={cityOptions} value={city} onChange={setCity} /> },
            { row: 2, col: 1, colspan: 1, required: true, content: <DateTimePicker label="Дата и время" theme={t} value={datetime} onChange={setDatetime} enableDate enableTime /> },
          ]}
        />
      </div>
    </div>
  );
}