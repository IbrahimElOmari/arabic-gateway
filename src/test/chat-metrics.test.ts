import { describe, it, expect } from "vitest";
import {
  startChatTimer,
  getChatMetricsSnapshot,
  recordRealtimeStatus,
} from "../lib/chat-metrics";

describe("chat-metrics", () => {
  it("records successful sends", () => {
    const t = startChatTimer("private", "send");
    const ms = t.end(true);
    expect(ms).toBeGreaterThanOrEqual(0);
    const snap = getChatMetricsSnapshot();
    expect(snap.samples).toBeGreaterThan(0);
  });

  it("records errors without throwing", () => {
    const t = startChatTimer("private", "send");
    expect(() => t.end(false, new Error("boom"))).not.toThrow();
  });

  it("recordRealtimeStatus tolerates all statuses", () => {
    expect(() => recordRealtimeStatus("private", "SUBSCRIBED")).not.toThrow();
    expect(() => recordRealtimeStatus("private", "CHANNEL_ERROR", new Error("x"))).not.toThrow();
    expect(() => recordRealtimeStatus("private", "TIMED_OUT")).not.toThrow();
    expect(() => recordRealtimeStatus("private", "CLOSED")).not.toThrow();
  });
});
