import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiInvoke, apiQuery, apiMutate } from '../lib/supabase-api';
import { supabase } from '../integrations/supabase/client';
import { ApiError } from '../lib/api-error';

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

    it('should normalize non-ApiError exceptions', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      await expect(apiQuery('test_table', (q) => q.select()))
        .rejects
        .toBeInstanceOf(ApiError);
    });
  });

  describe('apiMutate', () => {
    it('should return data on success', async () => {
      const mockData = { id: 1 };
      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      const result = await apiMutate('test_table', (q) => q.insert({ name: 'test' }));
      expect(result).toEqual(mockData);
    });

    it('should throw ApiError on mutation failure', async () => {
      const mockError = { message: 'Constraint violation', code: '23505' };
      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      await expect(apiMutate('test_table', (q) => q.insert({ name: 'dup' })))
        .rejects
        .toThrow('Constraint violation');
    });

    it('should NOT retry mutations (safety)', async () => {
      const mockError = { message: 'Server Error', status: 500 };
      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      (supabase.from as any).mockReturnValue(mockQueryBuilder);

      await expect(apiMutate('test_table', (q) => q.insert({ x: 1 })))
        .rejects
        .toThrow('Server Error');
      // Only called once — no retry
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(1);
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

    it('should not retry on 4xx errors', async () => {
      const error400 = { message: 'Bad Request', status: 400 };
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: error400 });

      await expect(apiInvoke('test-func')).rejects.toThrow('Bad Request');
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it('should include version header', async () => {
      const mockResponse = { data: { ok: true }, error: null };
      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      await apiInvoke('test-func');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('test-func', expect.objectContaining({
        headers: expect.objectContaining({
          'X-App-Version': expect.stringContaining('/1.0'),
        }),
      }));
    });
  });
});
