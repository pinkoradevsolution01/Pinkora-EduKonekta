export type TenantWhere = Record<string, unknown> & { schoolId: string };

/**
 * Adds the tenant boundary last so a caller cannot override it with a broader
 * or different schoolId filter.
 */
export function tenantWhere<T extends Record<string, unknown>>(
  schoolId: string,
  where = {} as T,
): T & { schoolId: string } {
  if (!schoolId.trim()) throw new Error('schoolId is required for tenant-scoped queries');
  return { ...where, schoolId } as T & { schoolId: string };
}
