import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Обёртка над GET-запросом с защитой от гонок (последний запрос побеждает)
 * и состоянием загрузки/ошибки.
 *
 * @param url    относительный URL; null — не запрашивать
 * @param params query-параметры. Объект — обычный axios-params,
 *               URLSearchParams — передаётся как есть (удобно для массивов
 *               вида model=A&model=B, которые ожидает Express).
 */
export function useFetch<T = any>(
  url: string | null,
  params?: Record<string, any> | URLSearchParams,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqIdRef = useRef(0);

  const paramsKey =
    params instanceof URLSearchParams
      ? params.toString()
      : JSON.stringify(params ?? null);

  const fetchData = useCallback(async () => {
    if (!url) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<T>(url, { params });
      if (reqId === reqIdRef.current) setData(res.data);
    } catch (e) {
      if (reqId === reqIdRef.current) {
        setError(axios.isAxiosError(e) ? e.message : 'Ошибка загрузки');
      }
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}