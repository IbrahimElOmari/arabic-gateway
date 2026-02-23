import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiInvoke, apiQuery } from '../lib/supabase-api';
import { supabase } from '../integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } } }),
    },
  },
}));

describe('Supabase API Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiQuery', () => {
    it('should return data on success', async () => {
      const mockData = [{ id: 1, name: 'test' }];
      const mockQueryBuilder = {
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      const result = await apiQuery('test_table', (q) => q.select());
      expect(result).toEqual(mockData);
    });

    it('should throw ApiError on failure', async () => {
      const mockError = { message: 'DB Error', code: '500' };
      const mockQueryBuilder = {
        select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      await expect(apiQuery('test_table', (q) => q.select()))
        .rejects
        .toThrow('DB Error');
    });
  });

  describe('apiInvoke', () => {
    it('should return data on success', async () => {
      const mockResponse = { data: { success: true }, error: null };
      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await apiInvoke('test-func', { foo: 'bar' });
      expect(result).toEqual({ success: true });
    });

    it('should retry on 5xx error', async () => {
      const error500 = { message: 'Server Error', status: 500 };
      const successResponse = { data: { success: true }, error: null };

      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({ data: null, error: error500 }) // First attempt fails
        .mockResolvedValueOnce(successResponse); // Second attempt succeeds

      const result = await apiInvoke('test-func');
      expect(result).toEqual({ success: true });
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const error500 = { message: 'Server Error', status: 500 };
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: error500 });

      await expect(apiInvoke('test-func')).rejects.toThrow('Server Error');
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
});
