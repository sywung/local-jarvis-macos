"""開發者陪伴場景（scene=dev）的感知正規化測試。

這些測試不需要 oMLX 或螢幕擷取，純粹驗證 _parse_perception 對模型輸出的約束：
模型常常違反「留空」與「只填可讀內容」的指令，後端必須擋下來，
否則錯誤資訊會被寫進記憶並污染日後查詢。
"""

import json

from jarvis_backend.orchestrator.service import OrchestrationService


def parse(payload: dict) -> dict:
    return OrchestrationService._parse_perception(json.dumps(payload, ensure_ascii=False))


def base(**overrides) -> dict:
    payload = {
        "scene": "dev",
        "confidence": 0.95,
        "scene_evidence": {"dev_surface": True, "terminal_visible": True},
        "observation": "終端機執行 go test，輸出顯示測試全數通過並回到提示字元。",
    }
    payload.update(overrides)
    return payload


def test_dev_fields_are_captured():
    result = parse(base(
        dev_environment="Ghostty", dev_language="Go", dev_framework="Gin",
        dev_project="nutrition", dev_status="testing", dev_progress="14 passed",
    ))
    assert result["scene"] == "dev"
    assert result["dev_environment"] == "Ghostty"
    assert result["dev_status"] == "testing"
    assert result["dev_progress"] == "14 passed"


def test_negative_phrasing_becomes_empty():
    """模型常把「沒有這項資訊」寫成一句話而不是留空。"""
    result = parse(base(
        dev_project="未顯示明確專案路徑", dev_blocker="未見明確錯誤阻塞點",
        dev_framework="N/A", dev_language="不明",
    ))
    assert result["dev_project"] == ""
    assert result["dev_blocker"] == ""
    assert result["dev_framework"] == ""
    assert result["dev_language"] == ""


def test_unknown_dev_status_is_dropped():
    assert parse(base(dev_status="寫程式中"))["dev_status"] == ""


def test_editor_or_terminal_downgrades_game_to_dev():
    """風景桌布常被判成遊戲世界；畫面上有終端機時主體必定是工作。"""
    result = parse({
        "scene": "game", "confidence": 0.98,
        "scene_evidence": {
            "game_surface": True, "interactive_gameplay": True, "terminal_visible": True,
        },
        "observation": "畫面顯示終端機視窗與背景桌布，正在執行指令並輸出多行結果。",
    })
    assert result["scene"] == "dev"


def test_dev_without_evidence_falls_back_to_other():
    result = parse(base(scene_evidence={"ordinary_browsing": True}))
    assert result["scene"] == "other"


def test_dev_fields_cleared_outside_dev_scene():
    result = parse(base(scene="other", scene_evidence={}, dev_environment="Ghostty"))
    assert result["dev_environment"] == ""


def test_truncated_dev_response_is_recovered():
    """截斷的 dev 回應必須能回復場景，不能整筆丟掉。

    2026-08-11 加 scene=dev 時只改了正常解析路徑，_recover_truncated_perception
    的正則仍只認 game|course|other。8/12 實機出現一次
    `perception.failed: incomplete perception JSON`——模型吐出 216 字元的殘缺
    dev 回應，回復失敗，整筆感知被丟棄。
    """
    truncated = (
        '{"scene": "dev", "confidence": 0.92, '
        '"scene_evidence": {"dev_surface": true, "terminal_visible": true}, '
        '"observation": "終端機正在執行測試，輸出多行結'
    )
    result = OrchestrationService._parse_perception(truncated)
    assert result["scene"] == "dev"
    assert result["confidence"] == 0.92
    assert result["scene_evidence"]["terminal_visible"] is True


def test_recovery_regex_covers_every_scene():
    """回復路徑的場景正則必須認得所有合法場景，不能再有漏同步的列舉值。

    證據不足而拒絕回復是既有的刻意契約（game/course 要求證據齊全），
    這裡只守「場景本身認不認得出來」。
    """
    from jarvis_backend.orchestrator.service import PERCEPTION_SCENES

    for scene in PERCEPTION_SCENES:
        source = f'{{"scene": "{scene}", "confidence": 0.8, "scene_evidence": {{'
        try:
            OrchestrationService._recover_truncated_perception(source)
        except json.JSONDecodeError as exc:
            assert "incomplete scene evidence" in str(exc), (
                f"場景 {scene} 沒被回復路徑的正則認出——列舉漏同步了"
            )
