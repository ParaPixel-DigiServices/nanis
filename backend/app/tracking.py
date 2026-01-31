"""P2-SES-004: Tracking token (open/click) — sign and verify campaign_recipient_id."""

import base64
import hmac
import hashlib
from urllib.parse import quote

from app.config import get_settings


def create_tracking_token(campaign_recipient_id: str) -> str:
    """Return a signed token for use in track URLs. Fails if TRACKING_SECRET not set."""
    settings = get_settings()
    secret = (settings.tracking_secret or "").encode("utf-8")
    if not secret:
        raise RuntimeError("TRACKING_SECRET must be set for tracking")
    payload = campaign_recipient_id.encode("utf-8")
    sig = hmac.new(secret, payload, hashlib.sha256).digest()
    b64_payload = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    b64_sig = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")
    return f"{b64_payload}.{b64_sig}"


def verify_tracking_token(token: str) -> str | None:
    """Verify token and return campaign_recipient_id, or None if invalid."""
    if not token or "." not in token:
        return None
    settings = get_settings()
    secret = (settings.tracking_secret or "").encode("utf-8")
    if not secret:
        return None
    parts = token.split(".", 1)
    if len(parts) != 2:
        return None
    try:
        b64_payload = parts[0] + "=="
        payload = base64.urlsafe_b64decode(b64_payload)
        campaign_recipient_id = payload.decode("utf-8")
        sig_got = base64.urlsafe_b64decode(parts[1] + "==")
        sig_expected = hmac.new(secret, payload, hashlib.sha256).digest()
        if hmac.compare_digest(sig_got, sig_expected):
            return campaign_recipient_id
    except Exception:
        pass
    return None


def wrap_links_for_tracking(html: str, click_redirect_base: str) -> str:
    """Replace href="..." with click redirect URL. click_redirect_base must end with &url= or ?url=."""
    import re

    def repl(m: re.Match) -> str:
        url = m.group(1)
        if url.startswith("mailto:") or url.startswith("#"):
            return m.group(0)
        encoded = quote(url, safe="")
        return f'href="{click_redirect_base}{encoded}"'
    return re.sub(r'href="([^"]+)"', repl, html)
