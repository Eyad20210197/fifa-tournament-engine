export default function ResponsiveDataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-white/5">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-white/10">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-[var(--text-primary)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={headers.length}>
                لا توجد بيانات حاليا.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
