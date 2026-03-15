"""Email service — uses Resend HTTP API (no SMTP, works on Railway)."""
import logging
import httpx

logger = logging.getLogger("email_service")

RESEND_API_URL = "https://api.resend.com/emails"


async def send_otp_email(to_email: str, otp: str, name: str = "User"):
    """Send OTP verification email via Resend API."""
    from shared.settings import config

    if not config.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not set — cannot send email")
        raise RuntimeError("Email service not configured. Set RESEND_API_KEY in Railway.")

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
        "from": config.EMAIL_FROM or "AI Call Agent <onboarding@resend.dev>",
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
        logger.error(f"Resend API error {response.status_code}: {response.text}")
        raise RuntimeError(f"Failed to send email: {response.text}")

    logger.info(f"OTP email sent to {to_email} via Resend")
