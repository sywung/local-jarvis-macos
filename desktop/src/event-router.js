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
    // 感知擷取連續失敗。不是致命錯誤（權限補回來就會自己恢復），所以走 warning
    // 而非 fault：提醒使用者，但不把整個 app 標成 error、不關掉 monitoring。
    case "perception.unavailable":
      return [
        {
          type: "warning",
          text: "我看不到螢幕了，請確認「系統設定 → 隱私權與安全性 → 螢幕錄製」已授權給啟動 Jarvis 的程式。",
          tone: "error",
          detail: payload.reason || "",
          duration: 15000,
        },
      ];
    case "perception.recovered":
      return [{ type: "warning", text: "螢幕感知已恢復。", tone: "success", duration: 6000 }];
    case "worker.fatal":
      return [{ type: "fault", text: payload.error || "本地推理服務連線中斷" }];
    default:
      return [];
  }
}

module.exports = { routeBackendEvent };
