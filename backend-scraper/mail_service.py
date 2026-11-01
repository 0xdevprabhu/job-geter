#!/usr/bin/env python3
"""
Mail & SMTP Service for Job Tracker (Gmail 16-Digit App Password Support)
Handles sending OTP emails for user signup, password reset, and system notifications.
Also provides utility functions for testing SMTP credentials.
"""

import os
import sys
import json
import random
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from typing import Dict, Any, Optional

# Load .env files from backend-scraper and frontend-portal
try:
    from dotenv import load_dotenv
    base_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(base_dir, ".env"))
    load_dotenv(os.path.join(base_dir, "..", "frontend-portal", ".env"))
except ImportError:
    pass

IST = timezone(timedelta(hours=5, minutes=30))

# Try importing firebase_admin
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False


def get_firestore_db():
    """Initializes and returns Firestore client if credentials exist."""
    if not FIREBASE_AVAILABLE:
        return None
    if firebase_admin._apps:
        return firestore.client()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    sa_path = os.path.join(base_dir, "serviceAccountKey.json")
    if os.path.exists(sa_path):
        try:
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
            return firestore.client()
        except Exception as e:
            print(f"[MailService] Error initializing Firebase Admin: {e}", file=sys.stderr)
    return None


def get_smtp_credentials(db=None) -> Dict[str, str]:
    """
    Retrieves SMTP configuration in priority:
    1. Environment variables: SMTP_USER / GMAIL_USER, SMTP_PASS / GMAIL_APP_PASSWORD
    2. Firestore app_config/smtp_config (if Firestore client is available)
    3. Fallback placeholder
    """
    user = os.environ.get("SMTP_USER") or os.environ.get("GMAIL_USER") or os.environ.get("VITE_SMTP_USER", "")
    password = os.environ.get("SMTP_PASS") or os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("VITE_SMTP_PASS", "")

    # Clean spaces from 16-digit Google App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    password = password.replace(" ", "").strip()

    if (not user or not password) and db:
        try:
            doc_snap = db.collection("app_config").document("smtp_config").get()
            if doc_snap.exists:
                data = doc_snap.to_dict() or {}
                user = user or data.get("smtp_email", "")
                password = password or data.get("smtp_app_password", "").replace(" ", "").strip()
        except Exception as e:
            print(f"[MailService] Could not read smtp_config from Firestore: {e}", file=sys.stderr)

    return {
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 465,  # SSL
        "smtp_user": user.strip(),
        "smtp_pass": password.strip(),
    }


def generate_otp(length: int = 6) -> str:
    """Generates a secure 6-digit numeric OTP string."""
    return f"{random.randint(100000, 999999)}"


def build_otp_html(otp_code: str, purpose: str = "signup") -> str:
    """Creates a modern responsive HTML email for the OTP with ZipZap branding."""
    action_text = "verify your email address and create your ZipZap account" if purpose == "signup" else "reset your ZipZap account password"
    title_text = "Email Verification Code" if purpose == "signup" else "Password Reset Request"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_text} - ZipZap</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header with ZipZap PNG Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); padding: 36px 36px 30px; text-align: center;">
              <!-- Embedded PNG ZipZap Logo via CID -->
              <div style="text-align: center; margin-bottom: 14px;">
                <img src="cid:zipzap_logo" width="68" height="68" alt="ZipZap" style="display: inline-block; width: 68px; height: 68px; border-radius: 18px; border: 0; outline: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);" />
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
                ZipZap <span style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: #f59e0b; font-size: 14px; font-weight: 800; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.4); vertical-align: middle;">JOBS</span>
              </h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">Instant Daily Job Radar & Application Tracker</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 700;">{title_text}</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
                Use the one-time verification code below to {action_text}. This code will expire in <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; margin: 0;">
                  {otp_code}
                </div>
                <div style="color: #64748b; font-size: 12px; margin-top: 8px; font-weight: 500;">⚡ Valid for 10 minutes only</div>
              </div>

              <!-- Security Note -->
              <p style="margin: 0 0 12px; color: #64748b; font-size: 13px; line-height: 1.5;">
                🔒 <strong>Security Notice:</strong> Never share this code with anyone. ZipZap support will never ask for your verification code.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you did not request this verification code, please disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                ZipZap — Spot Jobs Before Anyone Else
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                Automated notification from your ZipZap platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_otp_email(recipient_email: str, otp_code: str, purpose: str = "signup", db=None) -> Dict[str, Any]:
    """
    Sends the 6-digit OTP to the recipient via Gmail SMTP SSL with ZipZap branding.
    """
    creds = get_smtp_credentials(db=db)
    user = creds["smtp_user"]
    password = creds["smtp_pass"]

    if not user or not password:
        return {
            "success": False,
            "error": "Gmail SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS (16-digit Google App Password) in .env or via Admin Panel."
        }

    try:
        subject = f"⚡ Your ZipZap Verification Code: {otp_code}"
        html_content = build_otp_html(otp_code, purpose)

        # Root message must be multipart/related to link inline CID images with HTML
        message = MIMEMultipart("related")
        message["Subject"] = subject
        message["From"] = f"ZipZap Jobs <{user}>"
        message["To"] = recipient_email

        # Alternative container for plain text and HTML
        msg_alt = MIMEMultipart("alternative")
        message.attach(msg_alt)

        # Attach plain text fallback + rich HTML
        plain_text = f"Your ZipZap verification code is: {otp_code}. Valid for 10 minutes."
        msg_alt.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg_alt.attach(MIMEText(html_content, "html", "utf-8"))

        # Attach ZipZap PNG Logo as inline CID
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(base_dir, "assets", "zipzap_logo.png")
        if os.path.exists(logo_path):
            try:
                with open(logo_path, "rb") as f:
                    img = MIMEImage(f.read(), _subtype="png")
                    img.add_header("Content-ID", "<zipzap_logo>")
                    img.add_header("Content-Disposition", "inline", filename="zipzap_logo.png")
                    message.attach(img)
            except Exception as img_err:
                print(f"[MailService] Notice: Could not attach inline logo: {img_err}", file=sys.stderr)

        # Connect via SSL to port 465
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(user, password)
            server.sendmail(user, [recipient_email], message.as_string())

        # If Firestore is available, save/update the OTP record with 10 min expiration
        if not db:
            db = get_firestore_db()
        if db:
            try:
                now = datetime.now(timezone.utc)
                expires = now + timedelta(minutes=10)
                clean_email = recipient_email.strip().lower()
                db.collection("auth_otps").document(clean_email).set({
                    "email": clean_email,
                    "otp": str(otp_code).strip(),
                    "purpose": purpose,
                    "created_at": now.isoformat(),
                    "expires_at": expires.isoformat(),
                    "expires_timestamp": int(expires.timestamp() * 1000)
                })
            except Exception as fire_err:
                print(f"[MailService] Warning: Could not write OTP to Firestore: {fire_err}", file=sys.stderr)

        return {
            "success": True,
            "message": f"OTP sent to {recipient_email} successfully!"
        }
    except smtplib.SMTPAuthenticationError as auth_err:
        return {
            "success": False,
            "error": f"Gmail Authentication failed. Ensure 2-Step Verification is enabled and use a 16-character Google App Password (not your normal Gmail password). Details: {auth_err}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to send email: {str(e)}"
        }


def verify_otp(recipient_email: str, otp_code: str, db=None) -> Dict[str, Any]:
    """Verifies the OTP against Firestore auth_otps record."""
    if not db:
        db = get_firestore_db()
    if not db:
        return {"success": False, "error": "Firestore database not available to verify OTP."}

    clean_email = recipient_email.strip().lower()
    doc_ref = db.collection("auth_otps").document(clean_email)
    doc_snap = doc_ref.get()

    if not doc_snap.exists:
        return {"success": False, "error": "No OTP found for this email. Please request a new code."}

    data = doc_snap.to_dict() or {}
    expected_otp = str(data.get("otp", "")).strip()
    expires_ts = data.get("expires_timestamp", 0)
    now_ts = int(datetime.now(timezone.utc).timestamp() * 1000)

    if now_ts > expires_ts:
        return {"success": False, "error": "Verification code has expired. Please request a new OTP."}

    if expected_otp != str(otp_code).strip():
        return {"success": False, "error": "Invalid verification code. Please check and try again."}

    # Code is valid! Delete the consumed OTP
    try:
        doc_ref.delete()
    except Exception:
        pass

    return {"success": True, "message": "OTP verified successfully!"}


def test_smtp_connection(test_recipient: Optional[str] = None, db=None) -> Dict[str, Any]:
    """Tests the SMTP connection and optionally sends a verification test email."""
    creds = get_smtp_credentials(db=db)
    user = creds["smtp_user"]
    password = creds["smtp_pass"]

    if not user or not password:
        return {
            "success": False,
            "error": "Gmail credentials missing. Please configure SMTP_USER and SMTP_PASS."
        }

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(user, password)
            if test_recipient:
                msg = MIMEMultipart("related")
                msg["Subject"] = "⚡ ZipZap SMTP Connection Verified!"
                msg["From"] = f"ZipZap Jobs <{user}>"
                msg["To"] = test_recipient

                msg_alt = MIMEMultipart("alternative")
                msg.attach(msg_alt)

                test_html = """<!DOCTYPE html><html><body style="font-family: sans-serif; background-color: #f1f5f9; padding: 30px 10px;">
                <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; padding: 32px 24px; border: 1px solid #e2e8f0;">
                  <img src="cid:zipzap_logo" width="64" height="64" alt="ZipZap" style="display: inline-block; margin-bottom: 12px; border-radius: 16px;" />
                  <h2 style="margin: 0 0 8px; color: #0f172a;">SMTP Verified Successfully!</h2>
                  <p style="margin: 0 0 16px; color: #475569; font-size: 14px;">Your Gmail 16-digit App Password is connected and working perfectly with ZipZap Jobs.</p>
                  <div style="display: inline-block; background: #ecfdf5; color: #059669; font-weight: bold; font-size: 13px; padding: 6px 16px; border-radius: 20px; border: 1px solid #a7f3d0;">⚡ Ready to send OTPs</div>
                </div></body></html>"""

                msg_alt.attach(MIMEText("⚡ Congratulations! Your Gmail 16-digit App Password is working perfectly with ZipZap Jobs.", "plain", "utf-8"))
                msg_alt.attach(MIMEText(test_html, "html", "utf-8"))

                base_dir = os.path.dirname(os.path.abspath(__file__))
                logo_path = os.path.join(base_dir, "assets", "zipzap_logo.png")
                if os.path.exists(logo_path):
                    try:
                        with open(logo_path, "rb") as f:
                            img = MIMEImage(f.read(), _subtype="png")
                            img.add_header("Content-ID", "<zipzap_logo>")
                            img.add_header("Content-Disposition", "inline", filename="zipzap_logo.png")
                            msg.attach(img)
                    except Exception:
                        pass

                server.sendmail(user, [test_recipient], msg.as_string())
        return {
            "success": True,
            "message": f"SMTP Connection to smtp.gmail.com successful using {user}!"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# CLI invocation
if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "send" and len(sys.argv) >= 4:
            recipient = sys.argv[2]
            code = sys.argv[3]
            purp = sys.argv[4] if len(sys.argv) > 4 else "signup"
            res = send_otp_email(recipient, code, purp)
            print(json.dumps(res))
        elif cmd == "verify" and len(sys.argv) >= 4:
            recipient = sys.argv[2]
            code = sys.argv[3]
            res = verify_otp(recipient, code)
            print(json.dumps(res))
        elif cmd == "test":
            target = sys.argv[2] if len(sys.argv) > 2 else None
            res = test_smtp_connection(target)
            print(json.dumps(res))
        else:
            print(f"Usage: {sys.argv[0]} send <recipient_email> <otp_code> [purpose]")
            print(f"       {sys.argv[0]} test [optional_recipient]")
    else:
        print("Mail service ready.")
