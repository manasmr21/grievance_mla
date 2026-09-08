import { HttpException } from '@nestjs/common';
import { Sequelize, QueryTypes } from 'sequelize';

export interface ReferenceUsage {
    table: string;
    column: string;
    count: number;
}

interface DbForeignKeyRef {
    referencing_table: string;
    referencing_column: string;
}

interface ReferenceCountRow {
    count: number;
}

export const GRIEVANCE_NOTIFICATION_AUTO_HANDLED_TABLES = [
    'grievance_execution',
    'grievance_details',
    'notifications',
    'grievance_chats',
    'grievance_messages',
];

export interface ReferenceCleanupQuery {
    sql: string;
    replacements?: Record<string, string | number>;
}

export interface EnsureRecordCanBeRemovedOptions {
    sequelize: Sequelize;
    tableName: string;
    recordId: string | number;
    entityLabel: string;
    action: 'deactivate' | 'delete';
    autoHandledTables?: string[];
    nullifyQueries?: ReferenceCleanupQuery[];
    deleteCleanupQueries?: ReferenceCleanupQuery[];
}

export async function ensureRecordCanBeRemoved(
    options: EnsureRecordCanBeRemovedOptions,
): Promise<void> {
    const {
        sequelize,
        tableName,
        recordId,
        entityLabel,
        action,
        autoHandledTables = GRIEVANCE_NOTIFICATION_AUTO_HANDLED_TABLES,
        nullifyQueries = [],
        deleteCleanupQueries = [],
    } = options;

    const refs = await checkRecordReferences(sequelize, tableName, recordId);
    const referenceReasons = new Set<string>();
    for (const ref of refs.filter((r) => !autoHandledTables.includes(r.table))) {
        referenceReasons.add(ref.table);
    }

    if (referenceReasons.size > 0) {
        throw new HttpException(
            `Cannot ${action} this ${entityLabel}. It is still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign those records first.`,
            400,
        );
    }

    const queriesToRun = [
        ...nullifyQueries,
        ...(action === 'delete' ? deleteCleanupQueries : []),
    ];

    for (const query of queriesToRun) {
        try {
            await sequelize.query(query.sql, {
                replacements: { recordId, ...query.replacements },
                type: QueryTypes.UPDATE,
            });
        } catch (err) {
            console.error(`Failed to run reference cleanup for ${entityLabel}:`, err);
        }
    }
}

export async function checkRecordReferences(
    sequelize: Sequelize,
    tableName: string,
    recordId: string | number,
): Promise<ReferenceUsage[]> {
    const references: { table: string; column: string }[] = [];

    // 1. Inspect Sequelize models dynamically to find matching reference structures
    if (sequelize.models) {
        for (const modelName of Object.keys(sequelize.models)) {
            const model = sequelize.models[modelName];
            const rawAttributes = (model as any).rawAttributes;
            if (!rawAttributes) continue;

            for (const attributeName of Object.keys(rawAttributes)) {
                const attr = rawAttributes[attributeName];
                if (attr.references) {
                    let refModelName = '';
                    if (typeof attr.references.model === 'string') {
                        refModelName = attr.references.model;
                    } else if (attr.references.model && typeof attr.references.model.tableName === 'string') {
                        refModelName = attr.references.model.tableName;
                    } else if (attr.references.model && typeof attr.references.model.name === 'string') {
                        refModelName = attr.references.model.name;
                    }

                    if (refModelName && (refModelName.toLowerCase() === tableName.toLowerCase() || 
                                         refModelName.toLowerCase() === `public.${tableName}`.toLowerCase())) {
                        references.push({
                            table: (model as any).tableName || model.name,
                            column: attr.field || attributeName
                        });
                    }
                }
            }
        }
    }

    // 2. Query PostgreSQL system catalogs for actual DB foreign keys (bypassing privilege-limited information_schema)
    const dbRefsQuery = `
        SELECT
            conrelid::regclass::text AS referencing_table,
            a.attname AS referencing_column
        FROM
            pg_constraint c
        JOIN
            pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE
            c.contype = 'f'
            AND confrelid::regclass::text IN (:tableName, 'public.' || :tableName);
    `;

    try {
        const dbRefs = await sequelize.query<DbForeignKeyRef>(dbRefsQuery, {
            replacements: { tableName },
            type: QueryTypes.SELECT,
        });

        for (const ref of dbRefs) {
            const cleanTable = ref.referencing_table.replace(/^public\./, '').replace(/"/g, '');
            const cleanColumn = ref.referencing_column.replace(/"/g, '');
            
            // Add if not already present from Sequelize models inspection
            if (!references.some(r => r.table.toLowerCase() === cleanTable.toLowerCase() && r.column.toLowerCase() === cleanColumn.toLowerCase())) {
                references.push({
                    table: cleanTable,
                    column: cleanColumn
                });
            }
        }
    } catch (err) {
        console.error('Failed to query DB foreign keys from catalog:', err);
    }

    // 3. Query counts of references dynamically
    const usage: ReferenceUsage[] = [];

    for (const ref of references) {
        const countQuery = `
            SELECT COUNT(*)::int AS count
            FROM "${ref.table}"
            WHERE "${ref.column}" = :recordId
        `;

        try {
            const result = await sequelize.query<ReferenceCountRow>(
                countQuery,
                {
                    replacements: { recordId },
                    type: QueryTypes.SELECT,
                }
            );

            const count = result[0]?.count ?? 0;
            if (count > 0) {
                usage.push({
                    table: ref.table,
                    column: ref.column,
                    count,
                });
            }
        } catch (err) {
            console.error(`Failed to query count for reference ${ref.table}.${ref.column}:`, err);
        }
    }

    return usage;
}