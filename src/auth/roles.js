export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
}

export const ALL_ROLES = Object.values(ROLES)

export function defaultRouteForRole(role) {
  if (role === ROLES.SUPER_ADMIN) return '/saas/businesses'
  if (role === ROLES.ADMIN || role === ROLES.STAFF) return '/saas'
  return '/saas/login'
}
