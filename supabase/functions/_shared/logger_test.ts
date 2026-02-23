import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createLogger } from "./logger.ts";

Deno.test("createLogger returns correct object shape", () => {
  const logger = createLogger("test-function");
  assertExists(logger.info);
  assertExists(logger.warn);
  assertExists(logger.error);
  assertExists(logger.debug);
  assertExists(logger.withTiming);
  assertExists(logger.setUserId);
  assertExists(logger.requestId);
  assertEquals(typeof logger.requestId, "string");
});

Deno.test("info produces JSON with level, request_id, timestamp", () => {
  const original = console.log;
  let output = "";
  console.log = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  logger.info("hello world");

  console.log = original;

  const parsed = JSON.parse(output);
  assertEquals(parsed.level, "info");
  assertEquals(parsed.function_name, "test-fn");
  assertEquals(parsed.message, "hello world");
  assertExists(parsed.request_id);
  assertExists(parsed.timestamp);
});

Deno.test("warn produces JSON with level warn", () => {
  const original = console.warn;
  let output = "";
  console.warn = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  logger.warn("warning message");

  console.warn = original;

  const parsed = JSON.parse(output);
  assertEquals(parsed.level, "warn");
  assertEquals(parsed.message, "warning message");
});

Deno.test("error produces JSON with level error and supports stack", () => {
  const original = console.error;
  let output = "";
  console.error = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  logger.error("error message", { stack: "Error\n  at test" });

  console.error = original;

  const parsed = JSON.parse(output);
  assertEquals(parsed.level, "error");
  assertEquals(parsed.message, "error message");
  assertEquals(parsed.stack, "Error\n  at test");
});

Deno.test("setUserId adds user_id to subsequent logs", () => {
  const original = console.log;
  let output = "";
  console.log = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  logger.setUserId("user-123");
  logger.info("with user");

  console.log = original;

  const parsed = JSON.parse(output);
  assertEquals(parsed.user_id, "user-123");
});

Deno.test("withTiming measures duration and logs", async () => {
  const original = console.log;
  let output = "";
  console.log = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  const result = await logger.withTiming("my-task", async () => {
    await new Promise((r) => setTimeout(r, 50));
    return 42;
  });

  console.log = original;

  assertEquals(result, 42);
  const parsed = JSON.parse(output);
  assertStringIncludes(parsed.message, "my-task completed");
  assertExists(parsed.duration_ms);
  assertEquals(typeof parsed.duration_ms, "number");
});

Deno.test("withTiming logs error on failure", async () => {
  const originalError = console.error;
  let output = "";
  console.error = (msg: string) => { output = msg; };

  const logger = createLogger("test-fn");
  try {
    await logger.withTiming("failing-task", async () => {
      throw new Error("boom");
    });
  } catch {
    // expected
  }

  console.error = originalError;

  const parsed = JSON.parse(output);
  assertStringIncludes(parsed.message, "failing-task failed");
  assertEquals(parsed.error, "boom");
  assertExists(parsed.duration_ms);
});

Deno.test("request_id is extracted from header if present", () => {
  const headers = new Headers({ "x-request-id": "custom-req-id" });
  const req = new Request("http://localhost", { headers });
  const logger = createLogger("test-fn", req);
  assertEquals(logger.requestId, "custom-req-id");
});
