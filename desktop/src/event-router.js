"use strict";

function routeBackendEvent(event) {
  const payload = event && event.payload ? event.payload : {};
  switch (event && event.topic) {
    case "perception.completed":
      return [{ type: "scene", scene: payload.scene || "other" }];
    case "assistant.message":
      if (payload.source === "screen_idle") {
        return payload.text
          ? [{ type: "idle", text: payload.text, tone: "idle", duration: 9000 }]
          : [];
      }
      return payload.text ? [{ type: "bubble", text: payload.text, tone: "info" }] : [];
    case "course.interaction":
      return payload.text ? [{ type: "bubble", text: payload.text, tone: "course" }] : [];
    case "barrage.generated":
      return payload.text ? [{ type: "barrage", text: payload.text }] : [];
    case "course.started":
      return [
        { type: "bubble", text: `開始記錄課程：${payload.title || "未命名課程"}`, tone: "course" },
      ];
    case "course.keyframe.requested":
      return [{ type: "capture", ...payload }];
    case "course.finished":
      return [
        {
          type: "bubble",
          text: "課程總結已經生成，已儲存到桌面。",
          tone: "success",
          outputPath: payload.output_path || null,
          duration: 12000,
        },
      ];
    case "screen.idle":
      return [];
    case "worker.fatal":
      return [{ type: "fault", text: payload.error || "本地推理服務連線中斷" }];
    default:
      return [];
  }
}

module.exports = { routeBackendEvent };
