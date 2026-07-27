from __future__ import annotations

from opencc import OpenCC


_SIMPLIFIED_TO_TAIWAN = OpenCC("s2twp")


def to_traditional_chinese(text: str) -> str:
    return _SIMPLIFIED_TO_TAIWAN.convert(text)
