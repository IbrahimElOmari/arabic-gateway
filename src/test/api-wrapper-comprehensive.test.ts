import { describe, it, expect, vi } from 'vitest';
import { apiQuery, apiMutate, apiInvoke } from '../lib/supabase-api';
import { supabase } from '../integrations/supabase/client';
import { ApiError } from '../lib/api-error';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}));

describe('API Wrapper comprehensive tests', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('apiQuery', () => {
    it('returns data on success', async () => {
      const mockData = [{ id: 1 }];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });
      const result = await apiQuery('test_table', (q) => q.select());
      expect(result).toEqual(mockData);
    });

    it('throws ApiError on DB error', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });
      await expect(apiQuery('test_table', (q) => q.select())).rejects.toThrow('fail');
    });

    it('normalizes thrown exceptions', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('network')),
      });
      await expect(apiQuery('t', (q) => q.select())).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('apiMutate', () => {
    it('does not retry on failure', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'err', status: 500 } }),
      };
      (supabase.from as any).mockReturnValue(builder);
      await expect(apiMutate('t', (q) => q.insert({}))).rejects.toThrow('err');
      expect(builder.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('apiInvoke', () => {
    it('retries on 5xx then succeeds', async () => {
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({ data: null, error: { message: 'Server Error', status: 500 } })
        .mockResolvedValueOnce({ data: { ok: true }, error: null });
      const result = await apiInvoke('fn');
      expect(result).toEqual({ ok: true });
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    it('does not retry 4xx', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Bad Request', status: 400 },
      });
      await expect(apiInvoke('fn')).rejects.toThrow('Bad Request');
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it('includes version header', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ data: {}, error: null });
      await apiInvoke('fn');
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'fn',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-App-Version': expect.stringContaining('/1.0') }),
        })
      );
    });
  });
});
