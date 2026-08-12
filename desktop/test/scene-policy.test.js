"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveDisplayScene } = require("../src/scene-policy");

test("the backend stabilized scene is independent of course recording", () => {
  assert.equal(resolveDisplayScene("course"), "course");
  assert.equal(resolveDisplayScene("game"), "game");
  assert.equal(resolveDisplayScene("other"), "other");
  assert.equal(resolveDisplayScene("invalid"), "other");
});

test("the RD companion scene reaches the UI instead of collapsing into 其他", () => {
  // 後端 2026-08 起會回報 scene=dev；漏掉它的話控制面板會永遠顯示「其他」。
  assert.equal(resolveDisplayScene("dev"), "dev");
});
