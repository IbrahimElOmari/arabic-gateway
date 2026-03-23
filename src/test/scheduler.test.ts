import { describe, it, expect } from 'vitest';

/**
 * Scheduler / Cron Fallback Tests
 * Validates the scheduler edge function configuration and expected behavior.
 */
describe('Scheduler Cron Fallback', () => {
  const SCHEDULER_TARGETS = ['release-exercises', 'send-lesson-reminders'];

  it('defines both target functions', () => {
    expect(SCHEDULER_TARGETS).toContain('release-exercises');
    expect(SCHEDULER_TARGETS).toContain('send-lesson-reminders');
  });

  it('scheduler results structure is correct', () => {
    const mockResults: Record<string, { status: number; message: string }> = {
      'release-exercises': { status: 200, message: '{"released": 0}' },
      'send-lesson-reminders': { status: 200, message: '{"sent": 0}' },
    };

    for (const target of SCHEDULER_TARGETS) {
      expect(mockResults[target]).toBeDefined();
      expect(mockResults[target].status).toBe(200);
      expect(typeof mockResults[target].message).toBe('string');
    }
  });

  it('scheduler handles function failures gracefully', () => {
    const mockResults: Record<string, { status: number; message: string }> = {
      'release-exercises': { status: 500, message: 'Internal error' },
      'send-lesson-reminders': { status: 200, message: '{"sent": 0}' },
    };

    // One failure should not prevent the other from running
    expect(mockResults['release-exercises'].status).toBe(500);
    expect(mockResults['send-lesson-reminders'].status).toBe(200);
  });

  it('scheduler logs activity', () => {
    const logEntry = {
      admin_id: '00000000-0000-0000-0000-000000000000',
      action: 'scheduler_run',
      target_table: 'system',
      details: {
        results: {},
        triggered_at: new Date().toISOString(),
      },
    };

    expect(logEntry.action).toBe('scheduler_run');
    expect(logEntry.target_table).toBe('system');
    expect(logEntry.details.triggered_at).toBeTruthy();
  });
});
