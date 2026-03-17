from rest_framework.permissions import BasePermission


class IsInstructor(BasePermission):
    """Allow access only to users with role='INSTRUCTOR'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'INSTRUCTOR'
        )


class IsAdmin(BasePermission):
    """Allow access only to users with role='ADMIN'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsInstructorOwner(BasePermission):
    """Allow access only if the instructor owns the resource."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'instructor'):
            return obj.instructor == request.user
        if hasattr(obj, 'course'):
            return obj.course.instructor == request.user
        if hasattr(obj, 'module'):
            return obj.module.course.instructor == request.user
        return False
