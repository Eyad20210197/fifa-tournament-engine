export default function ResponsiveDataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-white/5">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 text-white/80">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-white/5">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-3 py-3 text-white/85">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

