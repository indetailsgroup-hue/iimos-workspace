/**
 * tenant/index.ts — Barrel exports for Multi-Tenant Module
 */

// Types
export type {
  Organization,
  OrgMember,
  OrgInvitation,
  OrgRole,
  OrgPlan,
  OrgStatus,
  OrgSettings,
  TenantContext,
  TenantPermissions,
  InviteStatus,
} from './types';

export {
  ORG_ROLE_HIERARCHY,
  PLAN_LIMITS,
  hasPermission,
  isOwnerOrAdmin,
  canAccessFeature,
  isTrialExpired,
  generateOrgSlug,
} from './types';

// Store
export { useTenantStore } from './tenantStore';

// Provider & Hooks
export {
  TenantProvider,
  useTenant,
  useOrgId,
  useFeatureGate,
  OrgGuard,
  FeatureGate,
} from './TenantProvider';
export type { TenantProviderProps } from './TenantProvider';

// Onboarding
export { TenantOnboarding } from './TenantOnboarding';
export type { TenantOnboardingProps } from './TenantOnboarding';

// Query Helpers
export {
  scopeToOrg,
  withOrgId,
  withOrgIdBatch,
  assertOrgOwnership,
  belongsToOrg,
  generateRlsPolicy,
} from './orgScopedQuery';
