import type { BusinessRole, UserRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      businesses?: Array<{
        id: string;
        businessId: string;
        role: BusinessRole;
        business: {
          id: string;
          name: string;
          slug: string;
          logo?: string;
        };
      }>;
      staffProfile?: {
        id: string;
        businessId: string;
        displayName: string;
        title?: string;
        avatar?: string;
        business: {
          id: string;
          name: string;
          slug: string;
        };
      };
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    businesses?: Array<{
      id: string;
      businessId: string;
      role: BusinessRole;
      business: {
        id: string;
        name: string;
        slug: string;
        logo?: string;
      };
    }>;
    staffProfile?: {
      id: string;
      businessId: string;
      displayName: string;
      title?: string;
      avatar?: string;
      business: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    businesses?: Array<{
      id: string;
      businessId: string;
      role: BusinessRole;
      business: {
        id: string;
        name: string;
        slug: string;
        logo?: string;
      };
    }>;
    staffProfile?: {
      id: string;
      businessId: string;
      displayName: string;
      title?: string;
      avatar?: string;
      business: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }
}

// Custom types for authentication flows
export interface SignUpData {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  role?: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BusinessInviteData {
  email: string;
  businessId: string;
  role: BusinessRole;
  invitedBy: string;
}

// Permission types
export type PermissionAction =
  | 'canManageBusiness'
  | 'canManageStaff'
  | 'canManageServices'
  | 'canManageClients'
  | 'canCreateAppointments'
  | 'canModifyAppointments'
  | 'canViewAllAppointments'
  | 'canViewFinancials'
  | 'canProcessPayments'
  | 'canManageSettings'
  | 'canManageIntegrations';

// Auth context types for client components
export interface AuthContextType {
  user: DefaultSession['user'] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  hasBusinessRole: (businessId: string, roles: BusinessRole[]) => boolean;
  canPerformAction: (businessId: string, action: PermissionAction) => boolean;
  signOut: () => Promise<void>;
}

// Business context types
export interface BusinessContextType {
  currentBusiness: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    userRole: BusinessRole;
  } | null;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string;
    userRole: BusinessRole;
  }>;
  switchBusiness: (businessId: string) => void;
  isLoading: boolean;
}

// Form validation schemas (using Zod)
export const signUpSchema = {
  name: 'string().min(2, "Name must be at least 2 characters")',
  email: 'string().email("Invalid email address")',
  password: 'string().min(8, "Password must be at least 8 characters")',
  businessName:
    'string().min(2, "Business name must be at least 2 characters").optional()',
};

export const signInSchema = {
  email: 'string().email("Invalid email address")',
  password: 'string().min(1, "Password is required")',
};

export const resetPasswordSchema = {
  email: 'string().email("Invalid email address")',
};

export const changePasswordSchema = {
  currentPassword: 'string().min(1, "Current password is required")',
  newPassword: 'string().min(8, "New password must be at least 8 characters")',
  confirmPassword: 'string().min(1, "Please confirm your password")',
};

// API response types
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: Record<string, string[]>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMembership {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessRole;
  business: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
