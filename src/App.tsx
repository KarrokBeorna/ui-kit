import React, { useState } from 'react';
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

const userData = [
  { id: 1, name: 'Алексей', age: 28, city: 'Москва', active: true },
  { id: 2, name: 'Екатерина', age: 34, city: 'СПб', active: false },
  { id: 3, name: 'Иван', age: 22, city: 'Казань', active: true },
  { id: 4, name: 'Мария', age: 41, city: 'Новосибирск', active: true },
  { id: 5, name: 'Дмитрий', age: 19, city: 'Екатеринбург', active: false },
];

const cityOptions = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'kaz', label: 'Казань' },
  { value: 'nsk', label: 'Новосибирск' },
  { value: 'ekb', label: 'Екатеринбург' },
];

export default function App() {
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

  // Явно типизируем колонки с помощью импортированного типа Column
  const columns: Column<(typeof userData)[0]>[] = [
    {
      key: 'name',
      header: 'Имя',
      width: 140,
      sortable: true,
      style: { fontWeight: 500 },
    },
    {
      key: 'age',
      header: 'Возраст',
      width: 100,
      sortable: true,
      style: { textAlign: 'center' as const },
      headerStyle: { textAlign: 'center' as const },
    },
    {
      key: 'city',
      header: 'Город',
      width: 150,
      sortable: true,
      render: (val: string) => <span style={{ color: t.accent }}>{val}</span>,
    },
    {
      key: 'active',
      header: 'Активен',
      width: 120,
      sortable: true,
      render: (val: boolean) => (
        <Badge
          theme={t}
          bgColor={val ? '#10b981' : '#ef4444'}
          borderColor={val ? '#10b981' : '#ef4444'}
          textColor="#fff"
          size="sm"
          variant="filled"
        >
          {val ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: 30, color: t.text, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <h1 style={{ margin: 0 }}>Демо-приложение</h1>
          <ThemeSwitcher theme={themeName} onChange={setThemeName} t={t} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '10px 24px',
              background: t.accent,
              color: t.accentText,
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
              fontWeight: 500,
              boxShadow: `0 0 0 2px ${t.accentGlow}`,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Открыть модальное окно
          </button>
        </div>

        <Table theme={t} columns={columns} data={userData} rowKey="id" />

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
            {
              row: 0, col: 0, colspan: 2, required: true,
              content: (
                <TextInput
                  label="Имя"
                  theme={t}
                  value={name}
                  onChange={setName}
                  inputType="text"
                />
              ),
            },
            {
              row: 1, col: 0, colspan: 1,
              content: (
                <Textarea
                  label="Комментарий"
                  theme={t}
                  value={comment}
                  onChange={setComment}
                  rows={2}
                  maxLength={100}
                />
              ),
            },
            {
              row: 1, col: 1, colspan: 1,
              content: (
                <Checkbox
                  label="Согласен с условиями"
                  theme={t}
                  checked={agree}
                  onChange={setAgree}
                />
              ),
            },
            {
              row: 2, col: 0, colspan: 1, required: true,
              content: (
                <SearchableSelect
                  label="Город"
                  theme={t}
                  options={cityOptions}
                  value={city}
                  onChange={setCity}
                />
              ),
            },
            {
              row: 2, col: 1, colspan: 1, required: true,
              content: (
                <DateTimePicker
                  label="Дата и время"
                  theme={t}
                  value={datetime}
                  onChange={setDatetime}
                  enableDate
                  enableTime
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}