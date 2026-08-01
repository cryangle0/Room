"""Vendor Ontime stylesheet dependencies for offline prototype use."""

from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
from datetime import date
from urllib.parse import unquote, urljoin, urlparse

import requests


ROOT = pathlib.Path(__file__).resolve().parents[1]
URLS_PATH = ROOT / "tools" / "_css_urls.json"
VENDOR_ROOT = ROOT / "assets" / "vendor" / "ontime"
CSS_DIR = VENDOR_ROOT / "css"
FONTS_DIR = VENDOR_ROOT / "fonts"
ICONFONT_DIR = VENDOR_ROOT / "iconfont"
IMAGES_DIR = VENDOR_ROOT / "img"
SOURCES_PATH = VENDOR_ROOT / "SOURCES.md"

URL_RE = re.compile(r"url\(\s*[\"']?([^\"')]+)[\"']?\s*\)", re.IGNORECASE)
IMPORT_RE = re.compile(
    r"@import\s+(?:url\(\s*)?[\"']?([^\"'\s)]+)[\"']?\s*\)?[^;]*;",
    re.IGNORECASE,
)
FONT_EXTENSIONS = {".eot", ".otf", ".svg", ".ttf", ".woff", ".woff2"}
IMAGE_EXTENSIONS = {".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".webp"}
PRODUCT_PATH_PARTS = ("/goods/", "/product/", "/products/", "/uploads/goods/")
THEME_HOST = "order.roomroom.com.cn"
THEME_PREFIX = "/sites/all/themes/ontimeorder_theme/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36"
)


def safe_filename(url: str, fallback: str) -> str:
    """Return a collision-resistant local filename for a remote URL."""
    parsed = urlparse(url)
    name = pathlib.PurePosixPath(unquote(parsed.path)).name or fallback
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", pathlib.Path(name).stem).strip(".-") or fallback
    suffix = pathlib.Path(name).suffix.lower()
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:10]
    return f"{stem}-{digest}{suffix}"


def append_sources(records: list[tuple[str, pathlib.Path]]) -> None:
    existing = SOURCES_PATH.read_text(encoding="utf-8").splitlines() if SOURCES_PATH.exists() else []
    known = set(existing)
    today = date.today().isoformat()
    for url, local_path in records:
        line = f"| {url} | {local_path.relative_to(ROOT).as_posix()} | {today} |"
        if line not in known:
            existing.append(line)
            known.add(line)
    SOURCES_PATH.write_text("\n".join(existing) + ("\n" if existing else ""), encoding="utf-8")


def rewrite_css(text: str, css_path: pathlib.Path, asset_map: dict[str, pathlib.Path]) -> str:
    """Rewrite downloaded CSS asset URLs to paths relative to the CSS file."""

    def repl(match: re.Match[str]) -> str:
        raw = match.group(1).strip()
        if raw.startswith(("data:", "#", "javascript:")):
            return match.group(0)
        local = asset_map.get(raw) or asset_map.get(raw.split("?", 1)[0])
        if local is None:
            return match.group(0)
        relative = os.path.relpath(local, css_path.parent).replace("\\", "/")
        return f"url({relative})"

    return URL_RE.sub(repl, text)


def rewrite_imports(
    text: str, css_url: str, css_path: pathlib.Path, css_map: dict[str, pathlib.Path]
) -> str:
    """Rewrite collected theme stylesheet imports to relative local CSS paths."""

    def repl(match: re.Match[str]) -> str:
        raw = match.group(1).strip()
        absolute_url = urljoin(css_url, raw)
        local = css_map.get(absolute_url) or css_map.get(absolute_url.split("?", 1)[0])
        if local is None:
            return match.group(0)
        relative = os.path.relpath(local, css_path.parent).replace("\\", "/")
        return match.group(0).replace(raw, relative, 1)

    return IMPORT_RE.sub(repl, text)


def is_theme_stylesheet(url: str) -> bool:
    parsed = urlparse(url)
    return (
        parsed.netloc == THEME_HOST
        and parsed.path.startswith(THEME_PREFIX)
        and parsed.path.lower().endswith(".css")
    )


def stylesheet_path(url: str) -> pathlib.Path:
    is_iconfont = "iconfont" in url.lower()
    destination_dir = ICONFONT_DIR if is_iconfont else CSS_DIR
    name = "iconfont.css" if is_iconfont else safe_filename(url, "stylesheet")
    return destination_dir / name


def destination_for(url: str, css_url: str | None = None) -> pathlib.Path | None:
    """Choose an allowed local dependency directory from the asset extension."""
    path = urlparse(url).path.lower()
    extension = pathlib.PurePosixPath(path).suffix
    if extension in FONT_EXTENSIONS:
        if css_url and "iconfont" in css_url.lower():
            return ICONFONT_DIR / safe_filename(url, "iconfont")
        return FONTS_DIR / safe_filename(url, "font")
    if extension in IMAGE_EXTENSIONS:
        if any(part in path for part in PRODUCT_PATH_PARTS):
            return None
        return IMAGES_DIR / safe_filename(url, "image")
    return None


def fetch(session: requests.Session, url: str) -> bytes:
    response = session.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def main() -> None:
    urls = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    if not isinstance(urls, list) or not all(isinstance(url, str) for url in urls):
        raise ValueError(f"{URLS_PATH} must contain a JSON array of stylesheet URLs")

    for directory in (CSS_DIR, FONTS_DIR, ICONFONT_DIR, IMAGES_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    if cookie := os.environ.get("ONTIME_COOKIE"):
        session.headers["Cookie"] = cookie

    source_records: list[tuple[str, pathlib.Path]] = []
    css_files: list[tuple[str, pathlib.Path, str]] = []
    pending = list(dict.fromkeys(urls))
    seen: set[str] = set()
    while pending:
        css_url = pending.pop(0)
        canonical_url = css_url.split("#", 1)[0]
        if canonical_url in seen:
            continue
        if not canonical_url.lower().split("?", 1)[0].endswith(".css"):
            raise ValueError(f"Not a CSS URL: {css_url}")
        seen.add(canonical_url)
        css_path = stylesheet_path(canonical_url)
        text = fetch(session, canonical_url).decode("utf-8-sig", errors="replace")
        css_files.append((canonical_url, css_path, text))
        source_records.append((canonical_url, css_path))
        for match in IMPORT_RE.finditer(text):
            imported_url = urljoin(canonical_url, match.group(1).strip())
            if is_theme_stylesheet(imported_url):
                pending.append(imported_url)

    css_map = {css_url: css_path for css_url, css_path, _ in css_files}
    css_map.update({css_url.split("?", 1)[0]: css_path for css_url, css_path, _ in css_files})

    for css_url, css_path, text in css_files:
        asset_map: dict[str, pathlib.Path] = {}
        for match in URL_RE.finditer(text):
            raw = match.group(1).strip()
            if raw.startswith(("data:", "#", "javascript:")):
                continue
            absolute_url = urljoin(css_url, raw)
            destination = destination_for(absolute_url, css_url)
            if destination is None:
                continue
            try:
                destination.write_bytes(fetch(session, absolute_url))
            except requests.RequestException as error:
                print(f"warning: could not download {absolute_url}: {error}")
                continue
            asset_map[raw] = destination
            asset_map[raw.split("?", 1)[0]] = destination
            source_records.append((absolute_url, destination))
        localized_css = rewrite_imports(text, css_url, css_path, css_map)
        localized_css = rewrite_css(localized_css, css_path, asset_map)
        localized_css = re.sub(r"[ \t]+(?=\r?$)", "", localized_css, flags=re.MULTILINE)
        if asset_map:
            localized_css = localized_css.rstrip() + "\n"
        css_path.write_text(localized_css, encoding="utf-8")

    append_sources(source_records)
    print(
        f"Vendored {len(css_files)} stylesheet(s) to {VENDOR_ROOT.relative_to(ROOT).as_posix()}"
    )


if __name__ == "__main__":
    main()
