import { useState, useMemo } from 'react'
import { themes, ThemeName } from './themes/theme'
import {
  AuthPage,
  Checkbox,
  DateTimePicker,
  FileSelector,
  FilterBar,
  HorizontalHeader,
  VerticalHeader,
  MultiSelect,
  NumberInput,
  Pagination,
  PasswordInput,
  RadioGroup,
  RangeSlider,
  SearchableSelect,
  Textarea,
  TextInput,
  ThemeSwitcher,
} from './components'

function App() {
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const t = themes[themeName]

  // Состояния для компонентов
  const [checked, setChecked] = useState(false)
  const [dateTime, setDateTime] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [multiSelectVal, setMultiSelectVal] = useState<string[]>(['1'])
  const [numberVal, setNumberVal] = useState('42')
  const [passwordVal, setPasswordVal] = useState('')
  const [radioVal, setRadioVal] = useState('opt1')
  const [rangeVal, setRangeVal] = useState<[number, number]>([20, 80])
  const [selectVal, setSelectVal] = useState('')
  const [text, setText] = useState('')
  const [textarea, setTextarea] = useState('')
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Для Pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const totalItems = 150

  const navTabs = [
    { id: 'dashboard', label: 'Панель', icon: '⬡' },
    { id: 'analytics', label: 'Аналитика', icon: '◈' },
    { id: 'settings', label: 'Настройки', icon: '⚙' },
  ]

  const filterItems = [
    { component: <TextInput label="Поиск" theme={t} value={text} onChange={setText} />, row: 1 },
    { component: <SearchableSelect label="Статус" theme={t} options={[{ value: 'active', label: 'Активен' }, { value: 'pending', label: 'Ожидает' }]} value={selectVal} onChange={setSelectVal} />, row: 1 },
    { component: <NumberInput label="Количество" theme={t} value={numberVal} onChange={setNumberVal} />, row: 2 },
  ]

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100vh', padding: '24px', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: 0 }}>🎨 UI Showcase</h1>
          <ThemeSwitcher theme={themeName} onChange={setThemeName} t={t} />
        </div>

        {/* ------------------- AuthPage ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>AuthPage</h2>
          {authUser ? (
            <div style={{ padding: 16, background: t.bgSurface, borderRadius: 12 }}>
              Привет, {authUser}! <button onClick={() => setAuthUser(null)}>Выйти</button>
            </div>
          ) : (
            <div style={{ maxWidth: 420 }}>
              <AuthPage
                t={t}
                theme={themeName}
                onThemeChange={setThemeName}
                onSuccess={(name) => setAuthUser(name)}
                siteName="Peppo"
                logoSvg={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                    <path d="M12 2L12 22" stroke="white" strokeWidth="2" />
                  </svg>
                }
              />
            </div>
          )}
        </section>

        {/* ------------------- Checkbox ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>Checkbox</h2>
          <Checkbox
            label="Согласен с условиями"
            theme={t}
            checked={checked}
            onChange={setChecked}
            description="Подтвердите своё согласие"
          />
        </section>

        {/* ------------------- DateTimePicker ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 400 }}>
          <h2>DateTimePicker</h2>
          <DateTimePicker
            label="Выберите дату и время"
            theme={t}
            value={dateTime}
            onChange={setDateTime}
            enableDate
            enableTime
          />
        </section>

        {/* ------------------- FileSelector ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 400 }}>
          <h2>FileSelector</h2>
          <FileSelector
            label="Загрузите файлы"
            theme={t}
            multiple
            accept="image/*,.pdf"
            maxSizeMb={5}
            onFiles={setFiles}
          />
        </section>

        {/* ------------------- FilterBar ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>FilterBar</h2>
          <FilterBar
            theme={t}
            filters={filterItems}
            activeCount={2}
            chips={['Поиск: test', 'Статус: Активен']}
            onApply={() => alert('Применить')}
            onReset={() => {
              setText('')
              setSelectVal('')
              setNumberVal('')
            }}
          />
        </section>

        {/* ------------------- Headers ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>HorizontalHeader</h2>
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <HorizontalHeader
              t={t}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isLoggedIn={!!authUser}
              onSignIn={() => alert('Переход на страницу входа')}
              onSignOut={() => setAuthUser(null)}
              userName={authUser || undefined}
              navTabs={navTabs}
              siteName="Peppo"
              logoSvg={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" />
                </svg>
              }
              showProfile={false}
              showSettings={true}
            />
          </div>
          <h2 style={{ marginTop: 24 }}>VerticalHeader</h2>
          <div style={{ display: 'flex', height: 300, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <VerticalHeader
              t={t}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isLoggedIn={!!authUser}
              onSignIn={() => alert('Переход на страницу входа')}
              onSignOut={() => setAuthUser(null)}
              userName={authUser || undefined}
              navTabs={navTabs}
              siteName="Peppo"
              logoSvg={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" />
                </svg>
              }
            />
            <div style={{ flex: 1, padding: 24, background: t.bg }}>
              <p>Содержимое страницы</p>
            </div>
          </div>
        </section>

        {/* ------------------- MultiSelect ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 400 }}>
          <h2>MultiSelect</h2>
          <MultiSelect
            label="Выберите города"
            theme={t}
            options={[
              { value: '1', label: 'Москва' },
              { value: '2', label: 'Санкт-Петербургsdfgsd fgsdfgsdfgsdfgssdfgsdfgsdfgdfgsdfgsdfg' },
              { value: '3', label: 'Казань' },
              { value: '4', label: 'Новосибирск' },
            ]}
            value={multiSelectVal}
            onChange={setMultiSelectVal}
          />
        </section>

        {/* ------------------- NumberInput ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 300 }}>
          <h2>NumberInput</h2>
          <NumberInput
            label="Количество"
            theme={t}
            value={numberVal}
            onChange={setNumberVal}
            min={0}
            max={100}
            step={2}
            allowDecimal
          />
        </section>

        {/* ------------------- Pagination ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>Pagination</h2>
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <Pagination
              t={t}
              total={totalItems}
              defaultPerPage={perPage}
              onPageChange={(p, pp) => { setPage(p); setPerPage(pp) }}
            />
          </div>
        </section>

        {/* ------------------- PasswordInput ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 300 }}>
          <h2>PasswordInput</h2>
          <PasswordInput
            label="Пароль"
            theme={t}
            value={passwordVal}
            onChange={setPasswordVal}
          />
        </section>

        {/* ------------------- RadioGroup ------------------- */}
        <section style={{ marginBottom: 48 }}>
          <h2>RadioGroup</h2>
          <RadioGroup
            label="Выберите вариант"
            theme={t}
            options={[
              { value: 'opt1', label: 'Первый', description: 'Описание первого' },
              { value: 'opt2', label: 'Второй', description: 'Описание второго' },
              { value: 'opt3', label: 'Третий', description: 'Описание третьего' },
            ]}
            value={radioVal}
            onChange={setRadioVal}
            direction="horizontal"
          />
        </section>

        {/* ------------------- RangeSlider ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 400 }}>
          <h2>RangeSlider</h2>
          <RangeSlider
            label="Диапазон цен"
            theme={t}
            range
            value={rangeVal}
            onChange={setRangeVal}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />
        </section>

        {/* ------------------- SearchableSelect ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 300 }}>
          <h2>SearchableSelect</h2>
          <SearchableSelect
            label="Выберите страну"
            theme={t}
            options={[
              { value: 'ru', label: 'Россия sdfgsdf gsdfg sdfg sdf gsdff gsdf gsdf gsdf gs ' },
              { value: 'us', label: 'США' },
              { value: 'de', label: 'Германия' },
              { value: 'fr', label: 'Франция' },
            ]}
            value={selectVal}
            onChange={setSelectVal}
          />
        </section>

        {/* ------------------- Textarea ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 400 }}>
          <h2>Textarea</h2>
          <Textarea
            label="Комментарий"
            theme={t}
            value={textarea}
            onChange={setTextarea}
            rows={4}
            maxLength={140}
          />
        </section>

        {/* ------------------- TextInput ------------------- */}
        <section style={{ marginBottom: 48, maxWidth: 300 }}>
          <h2>TextInput</h2>
          <TextInput
            label="Ваше имя"
            theme={t}
            value={text}
            onChange={setText}
            inputType="text"
          />
          <div style={{ marginTop: 12 }}>
            <TextInput
              label="Телефон"
              theme={t}
              value={text}
              onChange={setText}
              inputType="tel"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export default App