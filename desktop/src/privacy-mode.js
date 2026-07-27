"use strict";

const PRIVACY_MESSAGES = Object.freeze([
  "在幹嘛？讓我看看！",
  "你是在揹著我偷偷看什麼見不得 AI 的東西嗎？",
  "畫面黑掉了，我可還在這兒呢。",
  "這麼神秘？雙擊我就可以把畫面還回來。",
  "我現在什麼都看不見，有點在意你那邊發生了什麼。",
]);

function randomPrivacyDelay(random = Math.random, minimum = 25_000, maximum = 55_000) {
  return Math.floor(minimum + random() * (maximum - minimum + 1));
}

function randomPrivacyMessage(random = Math.random) {
  return PRIVACY_MESSAGES[Math.floor(random() * PRIVACY_MESSAGES.length)];
}

module.exports = { PRIVACY_MESSAGES, randomPrivacyDelay, randomPrivacyMessage };
