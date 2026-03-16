"""Email service — Resend API (primary) or Gmail SMTP (fallback)."""
import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

logger = logging.getLogger("email_service")

RESEND_API_URL = "https://api.resend.com/emails"
# Resend's onboarding@resend.dev is a SANDBOX sender — it can ONLY deliver to
# the Resend account owner's own email address.
_SANDBOX_SENDER = "onboarding@resend.dev"

_OTP_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#1e293b;border-radius:12px;padding:40px;color:#e2e8f0;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background:#7AB2B2;width:48px;height:48px;border-radius:12px;
                          line-height:48px;font-size:24px;text-align:center;
                          display:inline-block;">&#9993;</div>
            </td>
          </tr>
          <tr>
            <td align="center">
              <h2 style="margin:0 0 8px;font-size:24px;color:#f1f5f9;">
                Verify your email
              </h2>
              <p style="margin:0 0 32px;color:#94a3b8;font-size:15px;">
                Hi {name}, use the code below to verify your account.
              </p>
              <div style="background:#0f172a;border-radius:10px;padding:20px 40px;
                          font-size:40px;font-weight:700;letter-spacing:12px;
                          color:#7AB2B2;display:inline-block;">
                {otp}
              </div>
              <p style="margin:24px 0 0;color:#64748b;font-size:13px;">
                This code expires in <strong>10 minutes</strong>.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_otp_email(to_email: str, otp: str, name: str = "User") -> None:
    """Send OTP verification email.

    Uses Resend API when RESEND_API_KEY is set, otherwise falls back to
    Gmail SMTP (requires GMAIL_USER + GMAIL_APP_PASSWORD).
    """
    from shared.settings import config

    html = _OTP_HTML_TEMPLATE.format(name=name, otp=otp)

    if config.RESEND_API_KEY:
        await _send_via_resend(config, to_email, html)
    elif config.GMAIL_USER and config.GMAIL_APP_PASSWORD:
        await _send_via_gmail(config, to_email, html, name, otp)
    else:
        raise RuntimeError(
            "No email provider configured. Set either:\n"
            "  • RESEND_API_KEY (+ EMAIL_FROM with a verified domain), or\n"
            "  • GMAIL_USER + GMAIL_APP_PASSWORD (Gmail App Password)"
        )


async def _send_via_resend(config, to_email: str, html: str) -> None:
    """Send via Resend HTTP API."""
    import re

    from_address = config.EMAIL_FROM or f"AI Call Agent <{_SANDBOX_SENDER}>"

    if _SANDBOX_SENDER in from_address:
        logger.warning(
            "EMAIL_FROM is using Resend's sandbox sender (%s). "
            "This can ONLY deliver to the Resend account owner's email. "
            "Set EMAIL_FROM=noreply@yourdomain.com (verified domain) for all recipients.",
            _SANDBOX_SENDER,
        )

    payload = {
        "from": from_address,
        "to": [to_email],
        "subject": "Your verification code – AI Call Agent",
        "html": html,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {config.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code not in (200, 201):
        body = response.text
        logger.error("Resend API error %s sending to %s: %s", response.status_code, to_email, body)
        if response.status_code == 403:
            if _SANDBOX_SENDER in from_address:
                raise RuntimeError(
                    f"Resend rejected the email (403): sandbox sender '{_SANDBOX_SENDER}' "
                    f"can only deliver to the account owner's address. "
                    f"Set EMAIL_FROM to a verified-domain address."
                )
            if "not verified" in body or "domain" in body.lower():
                sender_domain = re.search(r"@([\w.-]+)", from_address)
                sender_domain = sender_domain.group(1) if sender_domain else from_address
                raise RuntimeError(
                    f"Resend rejected the email (403): sender domain '{sender_domain}' is not "
                    f"verified. You cannot use public domains like gmail.com or yahoo.com. "
                    f"Verify your own domain at https://resend.com/domains and set "
                    f"EMAIL_FROM=noreply@yourdomain.com — or use Gmail SMTP instead "
                    f"(set GMAIL_USER + GMAIL_APP_PASSWORD and remove RESEND_API_KEY)."
                )
        raise RuntimeError(f"Failed to send email ({response.status_code}): {body}")

    logger.info("OTP email sent to %s via Resend (from=%s)", to_email, from_address)


async def _send_via_gmail(config, to_email: str, html: str, name: str, otp: str) -> None:
    """Send via Gmail SMTP using an App Password (runs in a thread pool)."""
    gmail_user = config.GMAIL_USER
    app_password = config.GMAIL_APP_PASSWORD

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your verification code – AI Call Agent"
    msg["From"] = gmail_user
    msg["To"] = to_email
    # Plain-text fallback for email clients that don't render HTML
    plain = f"Hi {name},\n\nYour verification code is: {otp}\n\nIt expires in 10 minutes."
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    def _smtp_send():
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(gmail_user, app_password)
            server.sendmail(gmail_user, to_email, msg.as_string())

    try:
        await asyncio.to_thread(_smtp_send)
        logger.info("OTP email sent to %s via Gmail SMTP (%s)", to_email, gmail_user)
    except smtplib.SMTPAuthenticationError:
        raise RuntimeError(
            "Gmail SMTP authentication failed. Make sure you are using a Gmail App Password "
            "(NOT your regular Gmail password). Enable it at: "
            "https://myaccount.google.com/apppasswords — also ensure 2-Step Verification "
            "is ON for your Google account."
        )
    except Exception as e:
        raise RuntimeError(f"Gmail SMTP failed: {e}")
