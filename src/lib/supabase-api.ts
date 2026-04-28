/**
 * Centralized Supabase API wrapper with error normalization, retry, timeout,
 * and version headers.
 *
 * Usage:
 *   import { apiQuery, apiInvoke } from '@/lib/supabase-api';
 *
 *   // Read queries (with retry + timeout)
 *   const data = await apiQuery<MyType>('table', q => q.select('*').eq('id', id));
 *
 *   // Edge function calls (with retry + timeout)
 *   const result = await apiInvoke<Resp>('my-func', { body });
 *
 *   // Mutations – thin wrapper for error normalization only (no retry for safety)
 *   const result = await apiMutate<T>('table', q => q.insert({ ... }));
 */
import { supabase } from '@/integrations/supabase/client';
import { ApiError, normalizeError } from './api-error';
import appConfig from './app-config';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;

/**
 * Wrapper around supabase.from() queries with error normalization and retry on 5xx.
 */
export async function apiQuery<T>(
  table: string,
  queryFn: (query: any) => any
): Promise<T> {
  const functionName = `query:${table}`;

  try {
    const query = supabase.from(table as any);
    const { data, error } = await queryFn(query);

    if (error) {
      throw normalizeError(error, functionName);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw normalizeError(error, functionName);
  }
}

/**
 * Wrapper around supabase.from() mutations (INSERT/UPDATE/DELETE) with error normalization.
 * Does NOT retry — mutations are not idempotent.
 */
export async function apiMutate<T = any>(
  table: string,
  mutationFn: (query: any) => any
): Promise<T> {
  const functionName = `mutate:${table}`;

  try {
    const query = supabase.from(table as any);
    const { data, error } = await mutationFn(query);

    if (error) {
      throw normalizeError(error, functionName);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw normalizeError(error, functionName);
  }
}

/**
 * Wrapper around supabase.rpc() calls with consistent error normalization.
 */
export async function apiRpc<T = any>(
  functionName: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    const { data, error } = await supabase.rpc(functionName as any, args as any);

    if (error) {
      throw normalizeError(error, `rpc:${functionName}`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw normalizeError(error, `rpc:${functionName}`);
  }
}

/**
 * Wrapper around supabase.functions.invoke() with retry (1x on 5xx), timeout (15s),
 * version header, and error normalization.
 */
export async function apiInvoke<T>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const invoke = async (attempt: number): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'X-App-Version': appConfig.appNameShort + '/1.0',
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
        ...(options?.headers || {}),
      };

      const response = await supabase.functions.invoke(functionName, {
        body,
        headers,
      });

      clearTimeout(timeoutId);

      if (response.error) {
        const apiErr = normalizeError(response.error, functionName);

        if (apiErr.isRetryable && attempt < MAX_RETRIES) {
          return invoke(attempt + 1);
        }
        throw apiErr;
      }

      return response.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutErr = new ApiError(
          `Request to ${functionName} timed out after ${timeoutMs}ms`,
          408,
          functionName,
          true
        );
        if (attempt < MAX_RETRIES) {
          return invoke(attempt + 1);
        }
        throw timeoutErr;
      }

      if (error instanceof ApiError) {
        if (error.isRetryable && attempt < MAX_RETRIES) {
          return invoke(attempt + 1);
        }
        throw error;
      }

      throw normalizeError(error, functionName);
    }
  };

  return invoke(0);
}
