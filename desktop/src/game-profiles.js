"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const MINECRAFT_PROMPT = "領域關注：生存、建造、探索、採集、戰鬥或紅石階段；生命與飢餓、裝備耐久、資源、時間、座標、敵對生物和環境風險。表達風格：像熟悉《我的世界》的朋友，實用提醒與自然接梗並重。";
const PLANTS_VS_ZOMBIES_PROMPT = "領域關注：關卡地形與晝夜、波次、殭屍路線、陽光產能、植物冷卻、各路火力、防線缺口、特殊威脅和割草機。建議優先處理即將破線的威脅，其次最佳化經濟與陣型，並點明一個關鍵理由；穩定時可點評陣型協同。表達風格：懂遊戲、輕鬆直接。";
const OVERCOOKED_PROMPT = "領域關注：訂單與剩餘時間、菜品工序、食材和廚具位置、灶臺、地形及分工。建議只給當前最高優先順序並說明先後順序，優先處理超時、燒糊、缺盤缺料和動線堵塞；有餘裕再談分割槽與備料。表達風格：冷靜有趣的隊友，不指責具體玩家。";
const RD_DEVELOPER_PROMPT = "領域關注：開發環境、語言與框架、正在處理的專案或任務、測試／建置／除錯狀態、錯誤與阻塞點、可確認的進展；讀不清就留空，不猜測。表達風格：不打斷專注的長期陪伴者，只在測試通過、里程碑完成或長時間卡關時給一句簡短具體的話，不空泛鼓勵、不催促、不假裝已代為操作。";

const builtInProfiles = [
  {
    id: "minecraft",
    name: "我的世界",
    prompt: MINECRAFT_PROMPT,
    builtIn: true,
  },
  {
    id: "plants-vs-zombies",
    name: "植物大戰殭屍",
    prompt: PLANTS_VS_ZOMBIES_PROMPT,
    builtIn: true,
  },
  {
    id: "overcooked",
    name: "胡鬧廚房",
    prompt: OVERCOOKED_PROMPT,
    builtIn: true,
  },
  {
    id: "rd-developer",
    name: "RD 開發者",
    prompt: RD_DEVELOPER_PROMPT,
    builtIn: true,
  },
];
const builtInIds = new Set(builtInProfiles.map(item => item.id));
const legacyBuiltInPromptHashes = new Map([
  ["minecraft", "50b5d28f1f9616ccc498c95d081b2b53bed82876bba7425584846f05a705a785"],
  ["plants-vs-zombies", "1bd91a53d89500c96bd52283ab6776ac4c42efa1947f7e75d72c49c5fe8b872e"],
  ["overcooked", "67d16cb8521475b3b0dd1ade93f2bc2fb87f73b97fc09a5cabf365f306d8a2a0"],
  // 首版自由段落寫法，未遵守「領域關注／表達風格」結構且超過長度上限。
  ["rd-developer", "5cf010a2b48534509e654f6d985f4edbab394efddb1b97e1057e54bb475af50e"],
]);

function usesLegacyBuiltInPrompt(profile) {
  const legacyHash = legacyBuiltInPromptHashes.get(profile.id);
  if (!legacyHash) return false;
  return crypto.createHash("sha256").update(profile.prompt, "utf8").digest("hex") === legacyHash;
}

function normalizeProfile(value, builtIn = false) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "").trim().slice(0, 80);
  const name = String(value.name || "").trim().slice(0, 40);
  const prompt = String(value.prompt || "").trim().slice(0, 8000);
  if (!id || !name || !prompt) return null;
  return { id, name, prompt, builtIn };
}

function defaultSettings() {
  return {
    selectedId: "minecraft",
    profiles: builtInProfiles.map(item => ({ ...item })),
    deletedBuiltInIds: [],
  };
}

function loadSettings(filePath) {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {}
  const custom = Array.isArray(saved.profiles)
    ? saved.profiles.map(item => normalizeProfile(item, builtInIds.has(item?.id))).filter(Boolean)
    : [];
  const deletedBuiltInIds = new Set(
    Array.isArray(saved.deletedBuiltInIds)
      ? saved.deletedBuiltInIds.filter(id => builtInIds.has(id))
      : [],
  );
  const profiles = [
    ...builtInProfiles
      .filter(profile => !deletedBuiltInIds.has(profile.id))
      .map(profile => {
        const savedProfile = custom.find(item => item.id === profile.id);
        if (!savedProfile) return { ...profile };
        return usesLegacyBuiltInPrompt(savedProfile)
          ? { ...savedProfile, prompt: profile.prompt }
          : savedProfile;
      }),
    ...custom.filter(item => !builtInIds.has(item.id)),
  ];
  if (!profiles.length) {
    profiles.push({ ...builtInProfiles[0] });
    deletedBuiltInIds.delete(builtInProfiles[0].id);
  }
  const selectedId = profiles.some(item => item.id === saved.selectedId)
    ? saved.selectedId
    : profiles[0].id;
  return { selectedId, profiles, deletedBuiltInIds: [...deletedBuiltInIds] };
}

function saveSettings(filePath, settings) {
  const profiles = settings.profiles
    .map(item => normalizeProfile(item, builtInIds.has(item.id)))
    .filter(Boolean);
  const deletedBuiltInIds = Array.isArray(settings.deletedBuiltInIds)
    ? settings.deletedBuiltInIds.filter(id => builtInIds.has(id))
    : [];
  fs.writeFileSync(
    filePath,
    JSON.stringify({ selectedId: settings.selectedId, profiles, deletedBuiltInIds }, null, 2),
    "utf8",
  );
}

function removeProfile(settings, id) {
  const profile = settings.profiles.find(item => item.id === id);
  if (!profile) throw new Error("陪伴方案不存在");
  if (settings.profiles.length <= 1) throw new Error("至少保留一個陪伴方案");
  const deletedBuiltInIds = new Set(settings.deletedBuiltInIds || []);
  if (builtInIds.has(profile.id)) deletedBuiltInIds.add(profile.id);
  const profiles = settings.profiles.filter(item => item.id !== id);
  return {
    ...settings,
    profiles,
    selectedId: settings.selectedId === id ? profiles[0].id : settings.selectedId,
    deletedBuiltInIds: [...deletedBuiltInIds],
  };
}

module.exports = {
  MINECRAFT_PROMPT,
  OVERCOOKED_PROMPT,
  RD_DEVELOPER_PROMPT,
  PLANTS_VS_ZOMBIES_PROMPT,
  defaultSettings,
  loadSettings,
  normalizeProfile,
  removeProfile,
  saveSettings,
};
