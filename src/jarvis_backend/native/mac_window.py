"""Frontmost-window geometry via CoreGraphics, using ctypes only.

``screencapture -x`` grabs the *main* display in full. On a multi-display setup
that means the backend sees display 1 even when the user is working on display
2, and even on a single display most of the frame is menu bar, Dock and
wallpaper. Cropping to the active window fixes both: it follows the user across
displays and spends the downscale budget (``CAPTURE_MAX_EDGE``) on content
instead of desktop.

``CGWindowListCopyWindowInfo`` exposes window geometry, owner and title. The
title requires the Screen Recording grant the backend already needs for
``screencapture``; no Accessibility grant is involved. Using ctypes rather than
pyobjc keeps the backend on the standard library.

Every helper here is best effort: any failure returns ``None`` so the caller
falls back to a full-screen capture.
"""

from __future__ import annotations

import ctypes
import ctypes.util
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Windows smaller than this (in points) carry too little context to be worth
# cropping to -- a palette or an alert would starve the model of surroundings.
MIN_WINDOW_POINTS = (400, 300)

# Our own pet overlay must never be treated as the user's focus; capturing it
# would feed Jarvis its own reflection. Packaged it owns the window as
# "AI Jarvis", but run unpackaged from source Electron reports the generic
# "Electron". Excluding that generic name outright would also hide unpackaged
# third-party Electron apps, so it only counts alongside our window title.
# Branded Electron apps (VS Code -> "Code", Slack, Discord) are unaffected.
EXCLUDED_OWNERS = frozenset({"AI Jarvis"})
_GENERIC_ELECTRON_OWNER = "Electron"
_OWN_WINDOW_TITLE_MARKER = "Jarvis"


def _is_own_window(owner: str, title: str) -> bool:
    if owner in EXCLUDED_OWNERS:
        return True
    return owner == _GENERIC_ELECTRON_OWNER and _OWN_WINDOW_TITLE_MARKER in title

_kCFStringEncodingUTF8 = 0x08000100
_kCFNumberIntType = 9
_kCFNumberDoubleType = 13
_kCGWindowListOptionOnScreenOnly = 1 << 0
_kCGWindowListExcludeDesktopElements = 1 << 4
_kCGNullWindowID = 0

# Normal application windows live on layer 0; menu bar, Dock, notification
# widgets and overlays all sit on non-zero layers.
_NORMAL_WINDOW_LAYER = 0

_TITLE_BUFFER_BYTES = 1024


@dataclass(frozen=True)
class WindowRect:
    """Frontmost window geometry in global display points.

    Coordinates share the origin ``screencapture -R`` expects, so they may be
    negative when a display is positioned left of or above the main one.
    """

    x: int
    y: int
    width: int
    height: int
    owner: str
    title: str

    def as_capture_rect(self) -> str:
        """Format for ``screencapture -R<x,y,w,h>``."""
        return f"{self.x},{self.y},{self.width},{self.height}"


class _CoreGraphics:
    """Lazily bound CoreFoundation/CoreGraphics entry points."""

    def __init__(self) -> None:
        cf_path = ctypes.util.find_library("CoreFoundation")
        cg_path = ctypes.util.find_library("CoreGraphics")
        if not cf_path or not cg_path:
            raise OSError("CoreFoundation/CoreGraphics not found")
        self.cf = ctypes.CDLL(cf_path)
        self.cg = ctypes.CDLL(cg_path)

        cf_index = ctypes.c_long
        self.cf.CFStringCreateWithCString.restype = ctypes.c_void_p
        self.cf.CFStringCreateWithCString.argtypes = [
            ctypes.c_void_p,
            ctypes.c_char_p,
            ctypes.c_uint32,
        ]
        self.cf.CFArrayGetCount.restype = cf_index
        self.cf.CFArrayGetCount.argtypes = [ctypes.c_void_p]
        self.cf.CFArrayGetValueAtIndex.restype = ctypes.c_void_p
        self.cf.CFArrayGetValueAtIndex.argtypes = [ctypes.c_void_p, cf_index]
        self.cf.CFDictionaryGetValue.restype = ctypes.c_void_p
        self.cf.CFDictionaryGetValue.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
        self.cf.CFNumberGetValue.restype = ctypes.c_bool
        self.cf.CFNumberGetValue.argtypes = [
            ctypes.c_void_p,
            cf_index,
            ctypes.c_void_p,
        ]
        self.cf.CFStringGetCString.restype = ctypes.c_bool
        self.cf.CFStringGetCString.argtypes = [
            ctypes.c_void_p,
            ctypes.c_char_p,
            cf_index,
            ctypes.c_uint32,
        ]
        self.cf.CFRelease.argtypes = [ctypes.c_void_p]

        self.cg.CGWindowListCopyWindowInfo.restype = ctypes.c_void_p
        self.cg.CGWindowListCopyWindowInfo.argtypes = [
            ctypes.c_uint32,
            ctypes.c_uint32,
        ]

        # Dictionary keys are created once and intentionally kept alive for the
        # process lifetime; the probe runs on every perception tick.
        self.key_owner = self._string("kCGWindowOwnerName")
        self.key_name = self._string("kCGWindowName")
        self.key_layer = self._string("kCGWindowLayer")
        self.key_bounds = self._string("kCGWindowBounds")
        self.key_x = self._string("X")
        self.key_y = self._string("Y")
        self.key_width = self._string("Width")
        self.key_height = self._string("Height")

    def _string(self, text: str) -> ctypes.c_void_p:
        ref = self.cf.CFStringCreateWithCString(
            None, text.encode("utf-8"), _kCFStringEncodingUTF8
        )
        if not ref:
            raise OSError(f"CFStringCreateWithCString failed for {text!r}")
        return ref

    def read_string(self, dictionary: int, key: ctypes.c_void_p) -> str:
        ref = self.cf.CFDictionaryGetValue(dictionary, key)
        if not ref:
            return ""
        buffer = ctypes.create_string_buffer(_TITLE_BUFFER_BYTES)
        if not self.cf.CFStringGetCString(
            ref, buffer, _TITLE_BUFFER_BYTES, _kCFStringEncodingUTF8
        ):
            return ""
        return buffer.value.decode("utf-8", "replace")

    def read_int(self, dictionary: int, key: ctypes.c_void_p) -> int | None:
        ref = self.cf.CFDictionaryGetValue(dictionary, key)
        if not ref:
            return None
        out = ctypes.c_int()
        if not self.cf.CFNumberGetValue(ref, _kCFNumberIntType, ctypes.byref(out)):
            return None
        return out.value

    def read_double(self, dictionary: int, key: ctypes.c_void_p) -> float | None:
        ref = self.cf.CFDictionaryGetValue(dictionary, key)
        if not ref:
            return None
        out = ctypes.c_double()
        if not self.cf.CFNumberGetValue(ref, _kCFNumberDoubleType, ctypes.byref(out)):
            return None
        return out.value


_backend: _CoreGraphics | None = None
_backend_failed = False


def _get_backend() -> _CoreGraphics | None:
    """Bind the frameworks once; remember failure so we stop retrying."""
    global _backend, _backend_failed
    if _backend is not None:
        return _backend
    if _backend_failed:
        return None
    try:
        _backend = _CoreGraphics()
    except (OSError, AttributeError) as exc:
        _backend_failed = True
        logger.warning("window probe unavailable, using full-screen capture: %s", exc)
        return None
    return _backend


def _rect_from_window(api: _CoreGraphics, window: int) -> tuple[int, int, int, int] | None:
    bounds = api.cf.CFDictionaryGetValue(window, api.key_bounds)
    if not bounds:
        return None
    x = api.read_double(bounds, api.key_x)
    y = api.read_double(bounds, api.key_y)
    width = api.read_double(bounds, api.key_width)
    height = api.read_double(bounds, api.key_height)
    if None in (x, y, width, height):
        return None
    return int(x), int(y), int(width), int(height)


def frontmost_window() -> WindowRect | None:
    """Return the frontmost ordinary window, or ``None`` when undetermined.

    ``None`` means "capture the whole screen instead" -- no window qualified,
    the probe is unsupported, or the frontmost window is too small to be
    informative.
    """
    api = _get_backend()
    if api is None:
        return None

    info = None
    try:
        info = api.cg.CGWindowListCopyWindowInfo(
            _kCGWindowListOptionOnScreenOnly | _kCGWindowListExcludeDesktopElements,
            _kCGNullWindowID,
        )
        if not info:
            return None

        # The list is ordered front to back, so the first qualifying window is
        # the one the user is looking at.
        for index in range(api.cf.CFArrayGetCount(info)):
            window = api.cf.CFArrayGetValueAtIndex(info, index)
            if api.read_int(window, api.key_layer) != _NORMAL_WINDOW_LAYER:
                continue
            owner = api.read_string(window, api.key_owner)
            title = api.read_string(window, api.key_name)
            if _is_own_window(owner, title):
                continue
            rect = _rect_from_window(api, window)
            if rect is None:
                continue
            x, y, width, height = rect
            if width < MIN_WINDOW_POINTS[0] or height < MIN_WINDOW_POINTS[1]:
                continue
            return WindowRect(
                x=x,
                y=y,
                width=width,
                height=height,
                owner=owner,
                title=title,
            )
        return None
    except (OSError, ValueError, AttributeError) as exc:
        logger.debug("frontmost window probe failed: %s", exc)
        return None
    finally:
        if info:
            api.cf.CFRelease(info)
