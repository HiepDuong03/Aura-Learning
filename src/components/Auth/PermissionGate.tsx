import React, { ReactNode } from 'react';
import { UserPermission, UserRole } from '../../types';
import { authService } from '../../services/authService';

interface PermissionGateProps {
  children: ReactNode;
  permission?: UserPermission;
  role?: UserRole;
  fallback?: ReactNode;
}

/**
 * Enterprise RBAC Permission Gate (Compliant with AURA AI Constitution)
 * Conditionally renders UI elements based on explicit permissions or roles.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  role,
  fallback = null,
}) => {
  const currentUser = authService.getCurrentUser();

  if (role && currentUser?.role !== role) {
    return <>{fallback}</>;
  }

  if (permission && !authService.can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
