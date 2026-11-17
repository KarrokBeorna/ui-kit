import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

function pick<T extends Record<string, any>>(
  source: Record<string, any>,
  template: T,
): Partial<T> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(template)) {
    if (k in source) out[k] = source[k];
  }
  return out as Partial<T>;
}

/**
 * Управляет состоянием формы внутри модалки.
 *
 * @param isOpen      флаг открытия (сбрасывает форму при каждом открытии)
 * @param initialData данные для редактирования (или null для создания)
 * @param defaults    значения по умолчанию для «новой» записи
 */
export function useModalForm<T extends Record<string, any>>(
  isOpen: boolean,
  initialData: Partial<T> | null,
  defaults: T,
) {
  const [form, setForm] = useState<T>({ ...defaults });
  const [initialSnapshot, setInitialSnapshot] = useState<T>({ ...defaults });

  // defaults — обычно литерал, меняющий идентичность каждый рендер.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  useEffect(() => {
    if (!isOpen) return;
    const base = defaultsRef.current;
    const initial = { ...base, ...pick(initialData ?? {}, base) };
    setForm(initial);
    setInitialSnapshot(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }) as T);
  }, []);

  const reset = useCallback(() => {
    const base = defaultsRef.current;
    const initial = { ...base, ...pick(initialData ?? {}, base) };
    setForm(initial);
    setInitialSnapshot(initial);
  }, [initialData]);

  /** true, если форма отличается от исходного состояния. */
  const isDirty = useMemo(() => {
    // Простое сравнение; предполагается плоская (сериализуемая) форма.
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  return { form, setForm, setField, reset, isDirty };
}