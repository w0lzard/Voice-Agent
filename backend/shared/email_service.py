"""Email service for sending OTP and notifications."""
import asyncio
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("email_service")


def _send_email_sync(to_email: str, subject: str, html_body: str):
    """Send email synchronously (run in executor)."""
    from shared.settings import config

    if not config.EMAIL_USER or not config.EMAIL_PASSWORD:
        logger.warning("Email not configured — OTP: check server logs for code")
        raise RuntimeError("Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM or config.EMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    host = config.EMAIL_SMTP_HOST
    port = config.EMAIL_SMTP_PORT

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=10) as server:
            server.login(config.EMAIL_USER, config.EMAIL_PASSWORD)
            server.sendmail(msg["From"], to_email, msg.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(config.EMAIL_USER, config.EMAIL_PASSWORD)
            server.sendmail(msg["From"], to_email, msg.as_string())


async def send_otp_email(to_email: str, otp: str, name: str = "User"):
    """Send OTP verification email."""
    subject = "Your verification code – AI Call Agent"
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
                              display:inline-block;line-height:48px;font-size:24px;
                              text-align:center;">✉</div>
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
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_sync, to_email, subject, html)
