export type UiTableSystemColumnDef = {
  name: string;
  code: string;
  field_kind: string;
  data_type: string;
  reference_table: string | null;
  db_column_name: string;
  display_order: number;
};

export type UiTableRegistryDef = {
  name: string;
  code: string;
  physical_table_name: string;
  system_columns: UiTableSystemColumnDef[];
};

/** Tables registered here are ensured on app startup if missing from ui_tables. */
export const KNOWN_UI_TABLES: UiTableRegistryDef[] = [];
