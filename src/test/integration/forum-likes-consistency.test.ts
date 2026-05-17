import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration test — likes_count consistency.
 *
 * Verifies that:
 *  - The `sync_forum_likes_count` trigger keeps `forum_posts.likes_count`
 *    in sync with rows in `forum_likes` on INSERT and DELETE.
 *  - Concurrent like/unlike operations don't drift the counter.
 *  - Re-counting from `forum_likes` always equals `forum_posts.likes_count`.
 *
 * Skipped when service-role creds are not available in the env
 * (e.g. on PR builds from forks). Runs in CI via SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY.
 */

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && serviceKey);

const d = enabled ? describe : describe.skip;

d('forum likes_count trigger consistency', () => {
  let admin: SupabaseClient;
  let roomId: string;
  let postId: string;
  const userIds: string[] = [];
  const createdUsers: string[] = [];

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Ensure a forum room exists.
    const { data: room } = await admin
      .from('forum_rooms')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (!room) throw new Error('No forum_rooms row available for test');
    roomId = room.id;

    // 2. Create 5 throwaway users.
    for (let i = 0; i < 5; i++) {
      const email = `likes-test-${Date.now()}-${i}@test.local`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: 'TempPass123!Test',
        email_confirm: true,
      });
      if (error) throw error;
      userIds.push(data.user!.id);
      createdUsers.push(data.user!.id);
    }

    // 3. Create a forum post owned by user[0].
    const { data: post, error: postErr } = await admin
      .from('forum_posts')
      .insert({
        room_id: roomId,
        author_id: userIds[0],
        title: 'likes-count-trigger-test',
        content: 'integration test',
      })
      .select('id')
      .single();
    if (postErr) throw postErr;
    postId = post.id;
  }, 60_000);

  afterAll(async () => {
    if (postId) {
      await admin.from('forum_likes').delete().eq('post_id', postId);
      await admin.from('forum_posts').delete().eq('id', postId);
    }
    for (const id of createdUsers) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  }, 60_000);

  async function readCount(): Promise<number> {
    const { data, error } = await admin
      .from('forum_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();
    if (error) throw error;
    return data.likes_count as number;
  }

  async function actualLikes(): Promise<number> {
    const { count, error } = await admin
      .from('forum_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    if (error) throw error;
    return count ?? 0;
  }

  it('increments likes_count on insert', async () => {
    await admin.from('forum_likes').insert({ post_id: postId, user_id: userIds[0] });
    expect(await readCount()).toBe(1);
    expect(await actualLikes()).toBe(1);
  });

  it('decrements likes_count on delete', async () => {
    await admin.from('forum_likes').delete().eq('post_id', postId).eq('user_id', userIds[0]);
    expect(await readCount()).toBe(0);
    expect(await actualLikes()).toBe(0);
  });

  it('stays consistent under concurrent inserts', async () => {
    await Promise.all(
      userIds.map((uid) =>
        admin.from('forum_likes').insert({ post_id: postId, user_id: uid }),
      ),
    );
    const stored = await readCount();
    const real = await actualLikes();
    expect(stored).toBe(real);
    expect(stored).toBe(userIds.length);
  });

  it('stays consistent under concurrent deletes', async () => {
    await Promise.all(
      userIds.map((uid) =>
        admin.from('forum_likes').delete().eq('post_id', postId).eq('user_id', uid),
      ),
    );
    const stored = await readCount();
    const real = await actualLikes();
    expect(stored).toBe(real);
    expect(stored).toBe(0);
  });

  it('stays consistent under interleaved insert/delete churn', async () => {
    const ops: Promise<unknown>[] = [];
    for (let round = 0; round < 3; round++) {
      for (const uid of userIds) {
        ops.push(Promise.resolve(admin.from('forum_likes').insert({ post_id: postId, user_id: uid })));
        ops.push(
          Promise.resolve(admin.from('forum_likes').delete().eq('post_id', postId).eq('user_id', uid)),
        );
      }
    }
    await Promise.allSettled(ops);
    // Settle: ensure final state matches whatever rows survived.
    const stored = await readCount();
    const real = await actualLikes();
    expect(stored).toBe(real);
    expect(stored).toBeGreaterThanOrEqual(0);
  });
});
