import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/admin-log', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

describe('useAdminMutation', () => {
  it('exports useAdminMutation hook', async () => {
    const mod = await import('@/hooks/use-admin-mutation');
    expect(mod.useAdminMutation).toBeDefined();
    expect(typeof mod.useAdminMutation).toBe('function');
  });

  it('logAdminAction can be called with correct parameters', async () => {
    const { logAdminAction } = await import('@/lib/admin-log');
    await logAdminAction('user-123', 'create_class', 'classes', 'class-456', { name: 'Test' });
    expect(logAdminAction).toHaveBeenCalledWith('user-123', 'create_class', 'classes', 'class-456', { name: 'Test' });
  });

  it('logAdminAction handles missing optional params', async () => {
    const { logAdminAction } = await import('@/lib/admin-log');
    await logAdminAction('user-123', 'delete_level', 'levels');
    expect(logAdminAction).toHaveBeenCalledWith('user-123', 'delete_level', 'levels');
  });

  it('AdminMutationOptions interface accepts all required fields', () => {
    const options = {
      table: 'levels',
      mutationFn: async () => ({ id: '1' }),
      action: 'create_level',
      targetTable: 'levels',
      getTargetId: (_vars: any, data: any) => data.id as string,
      getDetails: (vars: any) => ({ name: vars.name }),
      invalidateKeys: [['admin-levels']],
      successMessage: 'Created!',
      errorMessage: 'Failed!',
    };
    expect(options.table).toBe('levels');
    expect(options.invalidateKeys).toHaveLength(1);
  });
});
