"""Email service — uses Resend HTTP API (no SMTP, works on Railway)."""
import logging
import httpx

logger = logging.getLogger("email_service")

RESEND_API_URL = "https://api.resend.com/emails"
# Resend's onboarding@resend.dev is a SANDBOX sender — it can ONLY deliver to
# the Resend account owner's own email address.  Any other recipient will be
# rejected with HTTP 403.  Always set EMAIL_FROM to a verified-domain address.
_SANDBOX_SENDER = "onboarding@resend.dev"


async def send_otp_email(to_email: str, otp: str, name: str = "User"):
    """Send OTP verification email via Resend API."""
    from shared.settings import config

    if not config.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not set — cannot send email")
        raise RuntimeError("Email service not configured. Set RESEND_API_KEY in environment.")

    from_address = config.EMAIL_FROM or f"AI Call Agent <{_SANDBOX_SENDER}>"
    if _SANDBOX_SENDER in from_address:
        logger.warning(
            "EMAIL_FROM is using Resend's sandbox sender (%s). "
            "This can ONLY deliver to the Resend account owner's email — "
            "set EMAIL_FROM=noreply@yourdomain.com (verified domain) "
            "to send to any recipient.",
            _SANDBOX_SENDER,
        )

    html = f"""
    <!DOCTYPE html>
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
                              display:inline-block;">✉</div>
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
    </html>
    """

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
        # Log the full Resend error so the root cause is visible in logs
        logger.error(
            "Resend API error %s sending to %s: %s",
            response.status_code,
            to_email,
            body,
        )
        if response.status_code == 403:
            if _SANDBOX_SENDER in from_address:
                raise RuntimeError(
                    f"Resend rejected the email (403). You are using the sandbox sender "
                    f"'{_SANDBOX_SENDER}' which can only deliver to the Resend account "
                    f"owner's address. Set EMAIL_FROM to a verified-domain address."
                )
            if "not verified" in body or "domain" in body.lower():
                # Extract sender domain for a clear actionable message
                import re
                sender_domain = re.search(r"@([\w.-]+)", from_address)
                sender_domain = sender_domain.group(1) if sender_domain else from_address
                raise RuntimeError(
                    f"Resend rejected the email (403): the sender domain '{sender_domain}' "
                    f"is not verified. You cannot use public domains like gmail.com/yahoo.com. "
                    f"Set EMAIL_FROM to an address on a domain YOU own and have verified at "
                    f"https://resend.com/domains — e.g. EMAIL_FROM=noreply@yourdomain.com"
                )
        raise RuntimeError(f"Failed to send email ({response.status_code}): {body}")

    logger.info("OTP email sent to %s via Resend (from=%s)", to_email, from_address)
