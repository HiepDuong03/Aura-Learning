import React, { ReactNode } from 'react';
import { AuthUser, UserPermission, UserRole } from '../../types';
import { authService } from '../../services/authService';

interface PermissionGateProps {
  children: ReactNode;
  permission?: UserPermission;
  permissions?: UserPermission[];
  role?: UserRole;
  roles?: UserRole[];
  currentUser?: AuthUser | null;
  fallback?: ReactNode;
}

/**
 * Reactive RBAC Permission Gate
 * Conditionally renders UI elements based on explicit permissions or roles.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  role,
  roles,
  currentUser,
  fallback = null,
}) => {
  const effectiveUser = currentUser !== undefined ? currentUser : authService.getCurrentUser();
  const effectiveRole: UserRole = effectiveUser?.role || 'guest';
  const userPermissions: UserPermission[] = effectiveUser?.permissions || ['vocab:read'];

  if (role && effectiveRole !== role) {
    return <>{fallback}</>;
  }

  if (roles && roles.length > 0 && !roles.includes(effectiveRole)) {
    return <>{fallback}</>;
  }

  if (permission && !userPermissions.includes(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0 && !permissions.some(p => userPermissions.includes(p))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
