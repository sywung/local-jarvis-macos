"use strict";

// "dev" is the RD companion scene added in 2026-08; without it here the backend
// classifies dev work correctly but the UI silently shows 其他.
const DISPLAY_SCENES = ["game", "course", "dev", "other"];

function resolveDisplayScene(reportedScene) {
  return DISPLAY_SCENES.includes(reportedScene) ? reportedScene : "other";
}

module.exports = { resolveDisplayScene, DISPLAY_SCENES };
