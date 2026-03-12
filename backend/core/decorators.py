from functools import wraps
from rest_framework.response import Response
from rest_framework import status


def require_role(roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if request.user.role not in roles:
                return Response(
                    {'error': f'Access denied. Required role(s): {", ".join(roles)}'},
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


class RoleRequiredMixin:
    required_roles = []

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.required_roles and request.user.role not in self.required_roles:
            self.permission_denied(
                request,
                message=f'Access denied. Required role(s): {", ".join(self.required_roles)}'
            )
