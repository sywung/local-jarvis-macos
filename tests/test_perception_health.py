"""感知擷取失敗必須浮出來，不能靜默。

背景（2026-08-12）：Electron 退出後沒殺掉自己 spawn 的後端，該後端被 launchd 收養
（PPID 1），失去啟動者的螢幕錄製授權，於是每輪 screencapture 都失敗。
舊行為只在第一次寫一行 warning，之後完全靜默：/health 照回 ok、指令照回 ok:true，
但一整天零記錄，從外部完全看不出感知已死。

這些測試不需要 oMLX 或螢幕擷取，只驗證失敗計數、事件發送與 /health 欄位的契約。
"""

import asyncio

from jarvis_backend.native.mac_client import (
    PERCEPTION_ALERT_AFTER_FAILURES,
    MacNativeClient,
)


def drain(client: MacNativeClient) -> list[dict]:
    events = []
    while not client._events.empty():
        events.append(client._events.get_nowait())
    return events


def test_healthy_before_threshold():
    client = MacNativeClient()

    async def scenario():
        for _ in range(PERCEPTION_ALERT_AFTER_FAILURES - 1):
            await client._note_perception_failure("screencapture failed")

    asyncio.run(scenario())

    assert client.perception_ok is True
    assert client.perception_error is None
    assert drain(client) == []


def test_alerts_once_on_threshold():
    client = MacNativeClient()

    async def scenario():
        for _ in range(PERCEPTION_ALERT_AFTER_FAILURES + 4):
            await client._note_perception_failure("screencapture failed: exit 1")

    asyncio.run(scenario())

    assert client.perception_ok is False
    assert "exit 1" in (client.perception_error or "")
    alerts = [e for e in drain(client) if e["type"] == "perception.unavailable"]
    assert len(alerts) == 1, "持續故障只該通報一次，不能每輪洗版"
    assert alerts[0]["consecutive_failures"] == PERCEPTION_ALERT_AFTER_FAILURES


def test_recovery_clears_state_and_emits():
    client = MacNativeClient()

    async def scenario():
        for _ in range(PERCEPTION_ALERT_AFTER_FAILURES):
            await client._note_perception_failure("screencapture failed")
        drain(client)
        await client._note_perception_success()

    asyncio.run(scenario())

    assert client.perception_ok is True
    assert client.perception_error is None
    assert [e["type"] for e in drain(client)] == ["perception.recovered"]


def test_success_without_prior_failure_is_quiet():
    client = MacNativeClient()
    asyncio.run(client._note_perception_success())
    assert drain(client) == []


def test_stop_monitoring_clears_degraded_state():
    """停止監看不等於故障，不能留下假的降級狀態。"""
    client = MacNativeClient()

    async def scenario():
        for _ in range(PERCEPTION_ALERT_AFTER_FAILURES):
            await client._note_perception_failure("screencapture failed")
        await client._stop_monitoring()

    asyncio.run(scenario())

    assert client.perception_ok is True
    assert client.perception_error is None
