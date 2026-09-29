import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Возвращает подмножество source, содержащее только ключи из template.
 * Внутри работаем как с Record<string, any>, чтобы не упираться в
 * TS2536 (keyof T не индексирует Record<string, any>).
 */
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

  // defaults — обычно литерал, меняющий идентичность каждый рендер.
  // Держим актуальную ссылку в ref, чтобы reset() не «залипал» на старом объекте.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  useEffect(() => {
    if (!isOpen) return;
    const base = defaultsRef.current;
    setForm({ ...base, ...pick(initialData ?? {}, base) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    // as T — потому что computed key в спреде сужает до T & { [x: string]: T[K] }.
    setForm((prev) => ({ ...prev, [key]: value }) as T);
  }, []);

  const reset = useCallback(() => {
    const base = defaultsRef.current;
    setForm({ ...base, ...pick(initialData ?? {}, base) });
  }, [initialData]);

  return { form, setForm, setField, reset };
}