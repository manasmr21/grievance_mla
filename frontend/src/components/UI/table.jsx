import React from 'react';

const Table = ({ columns = [], data = [], emptyMessage = 'No records available.' }) => {
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {typeof column.render === 'function'
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length || 1} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
