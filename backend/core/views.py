import uuid
from django.contrib.auth import get_user_model, authenticate
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserSession
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, UserProfileUpdateSerializer

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

    user = authenticate(
        request,
        username=serializer.validated_data['email'],
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

    # Invalidate previous sessions (single-device enforcement)
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

    # Create new session
    session_token = str(uuid.uuid4())
    UserSession.objects.create(
        user=user,
        session_token=session_token,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['session_token'] = session_token

    return Response({
        'message': 'Login successful.',
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
        'user': UserSerializer(user).data,
    })


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
