import hashlib
import secrets
import string
from datetime import timedelta

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings


# OTP is 6 digits, expires in 10 minutes
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10


def generate_otp() -> str:
    """
    Use secrets module (cryptographically secure PRNG) — NOT random.
    secrets.choice is safe against timing attacks unlike random.
    """
    alphabet = string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(OTP_LENGTH))


def hash_otp(otp: str) -> str:
    """
    SHA-256 hash of OTP — never store plaintext OTP in DB.
    Salt with user email is handled at call site by passing combined string.
    """
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()


def hash_otp_with_salt(otp: str, email: str) -> str:
    """
    Hash OTP salted with user email.
    Prevents rainbow table attacks on leaked OTP hashes.
    """
    salted = f"{otp}:{email.lower().strip()}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()


def get_otp_expiry() -> object:
    """Return timezone-aware expiry datetime."""
    return timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)


def send_otp_email(email: str, otp: str) -> bool:
    """
    Send OTP to user email.
    Returns True on success, False on failure.
    OTP shown in email only — never in API response (one-way flow).
    In DEBUG mode, always prints OTP to console as fallback.
    """
    try:
        send_mail(
            subject='LearnHub — Your Login OTP',
            message=(
                f"Your one-time login code is: {otp}\n\n"
                f"This code expires in {OTP_EXPIRY_MINUTES} minutes.\n"
                f"Do NOT share this code with anyone.\n\n"
                f"If you did not request this, ignore this email."
            ),
            from_email=getattr(settings, 'EMAIL_HOST_USER', 'noreply@learnhub.com'),
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # In DEBUG mode, print OTP to console so dev can test without SMTP
        if getattr(settings, 'DEBUG', False):
            print(f"\n{'='*50}")
            print(f"[DEV] OTP for {email}: {otp}")
            print(f"[DEV] SMTP error: {e}")
            print(f"{'='*50}\n")
            return True  # Allow flow to continue in dev
        return False
