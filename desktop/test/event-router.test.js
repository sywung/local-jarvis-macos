"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { routeBackendEvent } = require("../src/event-router");

test("game perception hides the pet through a scene effect", () => {
  assert.deepEqual(
    routeBackendEvent({ topic: "perception.completed", payload: { scene: "game" } }),
    [{ type: "scene", scene: "game" }]
  );
});

test("generated barrage is forwarded without business logic", () => {
  assert.deepEqual(
    routeBackendEvent({ topic: "barrage.generated", payload: { text: "漂亮的反殺！" } }),
    [{ type: "barrage", text: "漂亮的反殺！" }]
  );
});

test("course interaction uses the course bubble", () => {
  assert.deepEqual(
    routeBackendEvent({ topic: "course.interaction", payload: { text: "先想想這個條件為何必要。" } }),
    [{ type: "bubble", text: "先想想這個條件為何必要。", tone: "course" }]
  );
});

test("course completion preserves the current scene and exposes the output", () => {
  const effects = routeBackendEvent({
    topic: "course.finished",
    payload: { output_path: "C:/Users/test/Desktop/Jarvis-Courses/lesson/README.md" },
  });
  assert.equal(effects.length, 1);
  assert.equal(effects[0].tone, "success");
  assert.match(effects[0].text, /課程總結/);
  assert.match(effects[0].outputPath, /README\.md$/);
});

test("keyframe requests remain backend directed", () => {
  assert.deepEqual(
    routeBackendEvent({
      topic: "course.keyframe.requested",
      payload: { id: "lesson", timestamp_ms: 1200, note: "F=ma" },
    }),
    [{ type: "capture", id: "lesson", timestamp_ms: 1200, note: "F=ma" }]
  );
});

test("perception outage warns without marking the app as failed", () => {
  const effects = routeBackendEvent({
    topic: "perception.unavailable",
    payload: { reason: "screencapture failed: exit 1", consecutive_failures: 3 },
  });
  assert.equal(effects.length, 1);
  // fault would flip phase to "error" and stop monitoring; this outage is
  // recoverable on its own, so it must stay a warning.
  assert.equal(effects[0].type, "warning");
  assert.equal(effects[0].tone, "error");
  assert.match(effects[0].text, /螢幕錄製/);
  assert.equal(effects[0].detail, "screencapture failed: exit 1");
});

test("perception recovery clears the warning with a success tone", () => {
  const effects = routeBackendEvent({
    topic: "perception.recovered",
    payload: { after_failures: 7 },
  });
  assert.equal(effects.length, 1);
  assert.equal(effects[0].type, "warning");
  assert.equal(effects[0].tone, "success");
});

test("idle status stays silent and backend reminders use the idle bubble", () => {
  assert.deepEqual(
    routeBackendEvent({ topic: "screen.idle", payload: { idle_seconds: 120 } }),
    []
  );
  assert.deepEqual(
    routeBackendEvent({
      topic: "assistant.message",
      payload: { text: "是在摸魚嗎？", source: "screen_idle" },
    }),
    [{ type: "idle", text: "是在摸魚嗎？", tone: "idle", duration: 9000 }]
  );
});
