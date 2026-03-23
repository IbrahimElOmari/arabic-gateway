import { describe, it, expect } from 'vitest';

describe('Skeleton Components', () => {
  it('DashboardSkeleton exports correctly', async () => {
    const mod = await import('@/components/skeletons/DashboardSkeleton');
    expect(mod.DashboardSkeleton).toBeDefined();
  });

  it('TableSkeleton exports correctly', async () => {
    const mod = await import('@/components/skeletons/TableSkeleton');
    expect(mod.TableSkeleton).toBeDefined();
  });

  it('ForumPostSkeleton exports correctly', async () => {
    const mod = await import('@/components/skeletons/ForumPostSkeleton');
    expect(mod.ForumPostSkeleton).toBeDefined();
  });

  it('ChatMessageSkeleton exports correctly', async () => {
    const mod = await import('@/components/skeletons/ChatMessageSkeleton');
    expect(mod.ChatMessageSkeleton).toBeDefined();
  });

  it('Skeleton base component exports correctly', async () => {
    const mod = await import('@/components/ui/skeleton');
    expect(mod.Skeleton).toBeDefined();
  });
});
