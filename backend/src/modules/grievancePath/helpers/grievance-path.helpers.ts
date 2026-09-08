export const MAX_NODE_ROLES = 5;

export function normalizeRoleIds(roleIds: unknown): number[] {
    if (!Array.isArray(roleIds)) return [];
    const seen = new Set<number>();
    const result: number[] = [];
    for (const raw of roleIds) {
        const n = Number(raw);
        if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
        seen.add(n);
        result.push(n);
    }
    return result;
}

export function formatRolesLabel(roles: Array<{ name?: string } | null | undefined>): string {
    const names = (roles || []).map((r) => r?.name).filter(Boolean);
    return names.length ? names.join(', ') : '—';
}
