"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  OVERCOOKED_PROMPT,
  PLANTS_VS_ZOMBIES_PROMPT,
  loadSettings,
  removeProfile,
  saveSettings,
} = require("../src/game-profiles");

test("game profiles include all built-in profiles", () => {
  const settings = loadSettings(path.join(os.tmpdir(), `missing-${Date.now()}.json`));
  assert.equal(settings.selectedId, "minecraft");
  assert.deepEqual(settings.profiles.map(profile => profile.name), ["我的世界", "植物大戰殭屍", "胡鬧廚房", "RD 開發者"]);
  assert.equal(settings.profiles.every(profile => profile.builtIn), true);
  assert.match(PLANTS_VS_ZOMBIES_PROMPT, /陽光產能/);
  assert.match(OVERCOOKED_PROMPT, /只給當前最高優先順序/);
  assert.equal(settings.profiles.every(profile => profile.prompt.includes("領域關注：")), true);
  assert.equal(settings.profiles.every(profile => profile.prompt.includes("表達風格：")), true);
  assert.equal(settings.profiles.every(profile => profile.prompt.length < 180), true);
  assert.equal(settings.profiles.every(profile => !profile.prompt.includes("不要虛構")), true);
});

test("selected profile and edited prompts persist", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-game-profiles-"));
  const file = path.join(directory, "profiles.json");
  const settings = loadSettings(file);
  settings.profiles[0].prompt = "自定義我的世界提示詞";
  settings.profiles.push({ id: "custom-game", name: "測試遊戲", prompt: "測試提示詞", builtIn: false });
  settings.selectedId = "custom-game";
  saveSettings(file, settings);

  const loaded = loadSettings(file);
  assert.equal(loaded.selectedId, "custom-game");
  assert.equal(loaded.profiles[0].prompt, "自定義我的世界提示詞");
  assert.equal(loaded.profiles.find(profile => profile.id === "custom-game").name, "測試遊戲");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("new built-in profiles are added to settings saved by older versions", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-game-profiles-"));
  const file = path.join(directory, "profiles.json");
  fs.writeFileSync(file, JSON.stringify({
    selectedId: "minecraft",
    profiles: [{ id: "minecraft", name: "我的世界", prompt: "保留舊提示詞", builtIn: true }],
  }), "utf8");

  const loaded = loadSettings(file);
  assert.deepEqual(
    loaded.profiles.map(profile => profile.id),
    ["minecraft", "plants-vs-zombies", "overcooked", "rd-developer"]
  );
  assert.equal(loaded.profiles[0].prompt, "保留舊提示詞");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("legacy built-in defaults upgrade without replacing user edits", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-game-profiles-"));
  const file = path.join(directory, "profiles.json");
  const legacyMinecraftPrompt = "你正在陪伴使用者遊玩《我的世界》。結合畫面判斷生存、建造、探索、採集、戰鬥或紅石等階段，優先關注生命與飢餓、裝備耐久、資源、時間、座標、敵對生物和環境風險。彈幕要像熟悉遊戲的朋友：資訊明確時給簡短實用的提醒，精彩或失誤時自然接梗；不要虛構版本機制、物品或畫面外事件，不確定時只對局勢作保留式回應。";
  fs.writeFileSync(file, JSON.stringify({
    selectedId: "minecraft",
    profiles: [
      { id: "minecraft", name: "我的世界", prompt: legacyMinecraftPrompt, builtIn: true },
      { id: "plants-vs-zombies", name: "植物大戰殭屍", prompt: "使用者定製內容", builtIn: true },
    ],
  }), "utf8");

  const loaded = loadSettings(file);
  assert.notEqual(loaded.profiles[0].prompt, legacyMinecraftPrompt);
  assert.match(loaded.profiles[0].prompt, /領域關注：/);
  assert.equal(loaded.profiles[1].prompt, "使用者定製內容");
  fs.rmSync(directory, { recursive: true, force: true });
});

test("deleted built-in profiles stay deleted after restart", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-game-profiles-"));
  const file = path.join(directory, "profiles.json");
  let settings = loadSettings(file);
  settings = removeProfile(settings, "minecraft");
  saveSettings(file, settings);

  const loaded = loadSettings(file);
  assert.equal(loaded.profiles.some(profile => profile.id === "minecraft"), false);
  assert.equal(loaded.selectedId, "plants-vs-zombies");
  assert.deepEqual(loaded.deletedBuiltInIds, ["minecraft"]);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("profile deletion keeps one runnable game profile", () => {
  const settings = {
    selectedId: "custom-only",
    profiles: [{ id: "custom-only", name: "唯一方案", prompt: "繼續陪伴遊戲", builtIn: false }],
    deletedBuiltInIds: ["minecraft", "plants-vs-zombies", "overcooked"],
  };
  assert.throws(() => removeProfile(settings, "custom-only"), /至少保留一個/);
});
