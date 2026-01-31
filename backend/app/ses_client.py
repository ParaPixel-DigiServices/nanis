"""Amazon SES client — server-only. P2-SES-002: send email via SES."""

from typing import Any

from app.config import get_settings


def get_ses_client() -> Any:
    """Return boto3 SES client. Requires AWS_* and SES_FROM_EMAIL in env."""
    settings = get_settings()
    if not settings.aws_access_key_id or not settings.aws_secret_access_key:
        raise RuntimeError(
            "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for SES"
        )
    if not (settings.ses_from_email or "").strip():
        raise RuntimeError(
            "SES_FROM_EMAIL must be set (verified sender in SES)")
    import boto3
    return boto3.client(
        "ses",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def send_email(
    to_address: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
    from_email: str | None = None,
) -> dict[str, Any]:
    """Send one email via SES. Returns SES MessageId or raises."""
    client = get_ses_client()
    settings = get_settings()
    source = from_email or settings.ses_from_email
    msg: dict[str, Any] = {
        "Subject": {"Data": subject, "Charset": "UTF-8"},
        "Body": {"Html": {"Data": body_html, "Charset": "UTF-8"}},
    }
    if body_text:
        msg["Body"]["Text"] = {"Data": body_text, "Charset": "UTF-8"}
    return client.send_email(
        Source=source,
        Destination={"ToAddresses": [to_address]},
        Message={"Subject": msg["Subject"], "Body": msg["Body"]},
    )
