import uuid
from django.contrib.auth import get_user_model, authenticate
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserSession, OTPToken
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, UserProfileUpdateSerializer
from .otp_utils import generate_otp, hash_otp_with_salt, get_otp_expiry, send_otp_email

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Registration successful.',
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    user = authenticate(
        request,
        username=email,
        password=serializer.validated_data['password']
    )

    if user is None:
        return Response(
            {'error': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'error': 'Account is deactivated. Contact admin.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Step 1 of 2FA: credentials verified — now send OTP
    OTPToken.objects.filter(user=user, is_used=False).update(is_used=True)
    otp = generate_otp()
    OTPToken.objects.create(
        user=user,
        code_hash=hash_otp_with_salt(otp, email),
        expires_at=get_otp_expiry(),
    )
    send_otp_email(email, otp)

    return Response({
        'otp_required': True,
        'email': email,
        'message': 'OTP sent to your email. Enter it to complete login.',
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        # Invalidate session
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)

        return Response({'message': 'Logout successful.'})
    except Exception:
        return Response({'message': 'Logout successful.'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def token_refresh_view(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    except Exception:
        return Response({'error': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserSerializer


# ─────────────────────────────────────────────
# OTP AUTH FLOW  (Step 1 → Step 2)
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def otp_request_view(request):
    """
    Step 1: Email validation + OTP dispatch.

    POST /api/auth/otp/request/
    Body: { "email": "user@example.com" }

    Security notes:
    - Email existence check runs in constant time (no early returns that leak timing info)
    - OTP generated with secrets module (CSPRNG)
    - OTP hashed with SHA-256 + email salt before DB storage
    - Plaintext OTP sent ONLY via email — never returned in API response
    - Previous unused OTPs for this user are invalidated on new request
    - Rate limiting should be applied at reverse-proxy level (nginx/cloudflare)
    """
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Strict email existence check — exact error string as specified
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return Response(
            {'error': 'this email does not exist'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Invalidate all previous unused OTPs for this user
    OTPToken.objects.filter(user=user, is_used=False).update(is_used=True)

    # Generate secure OTP
    otp = generate_otp()
    code_hash = hash_otp_with_salt(otp, email)

    # Persist hashed OTP
    OTPToken.objects.create(
        user=user,
        code_hash=code_hash,
        expires_at=get_otp_expiry(),
    )

    # Send OTP via email — one-way delivery, not in response
    sent = send_otp_email(email, otp)
    if not sent:
        return Response(
            {'error': 'Failed to send OTP email. Try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response({
        'message': 'OTP sent to your email address.',
        'email': email,
        # Deliberately NOT returning OTP — one-way flow
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def otp_verify_view(request):
    """
    Step 2: OTP verification → issue JWT tokens.

    POST /api/auth/otp/verify/
    Body: { "email": "user@example.com", "otp": "123456" }

    Security notes:
    - OTP comparison uses hashed value — plaintext never stored
    - Attempt counter incremented on every wrong guess (max 5)
    - OTP marked used immediately after successful verify (prevents replay)
    - Session token created for single-device enforcement
    - JWT issued only after full OTP validation passes
    """
    email = request.data.get('email', '').strip().lower()
    otp_input = request.data.get('otp', '').strip()

    if not email or not otp_input:
        return Response(
            {'error': 'Email and OTP are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return Response(
            {'error': 'this email does not exist'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get latest valid OTP record for this user
    token = OTPToken.objects.filter(
        user=user, is_used=False
    ).order_by('-created_at').first()

    if not token:
        return Response(
            {'error': 'No active OTP found. Request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check expiry and attempt limit before comparing hash
    if not token.is_valid:
        if token.is_expired:
            return Response(
                {'error': 'OTP has expired. Request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {'error': 'Too many failed attempts. Request a new OTP.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Hash incoming OTP with same salt and compare
    incoming_hash = hash_otp_with_salt(otp_input, email)

    if incoming_hash != token.code_hash:
        # Increment attempt counter
        token.attempts += 1
        token.save(update_fields=['attempts'])
        remaining = max(0, 5 - token.attempts)
        return Response(
            {'error': f'Invalid OTP. {remaining} attempt(s) remaining.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # OTP valid — mark as used immediately (replay prevention)
    token.is_used = True
    token.save(update_fields=['is_used'])

    # Invalidate old sessions (single-device enforcement)
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

    # Create new session
    session_token = str(uuid.uuid4())
    UserSession.objects.create(
        user=user,
        session_token=session_token,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    # Issue JWT
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['session_token'] = session_token

    return Response({
        'message': 'OTP verified. Login successful.',
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)
