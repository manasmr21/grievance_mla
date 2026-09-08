import { Op } from 'sequelize';

/**
 * Builds a Sequelize `where` fragment for case-insensitive text search
 * across one or more column names using Op.iLike.
 *
 * Returns an empty object when `search` is blank so callers can spread it
 * safely into any existing `where` clause.
 *
 * Example:
 *   const searchWhere = buildSearchWhere(search, ['name', 'code']);
 *   await paginate(Model, { where: { ...baseWhere, ...searchWhere } }, page, limit);
 */
export function buildSearchWhere(
    search: string | undefined,
    fields: string[],
): Record<string, any> {
    if (!search?.trim()) return {};
    const pattern = `%${search.trim()}%`;
    return {
        [Op.or as any]: fields.map((f) => ({ [f]: { [Op.iLike]: pattern } })),
    };
}
