import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminDataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: Row) => ReactNode;
};

export function AdminDataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState
}: {
  caption: string;
  columns: AdminDataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyState: ReactNode;
}) {
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <table className="min-w-full divide-y divide-ocean-900/10 text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sand-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/58", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ocean-900/10">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 text-ocean-900", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
