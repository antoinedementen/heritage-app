interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-heritage-sand/30">
      <table className={`w-full border-collapse text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: TableProps) {
  return (
    <thead className="bg-heritage-beige border-b border-heritage-sand/40">
      {children}
    </thead>
  );
}

export function TableBody({ children }: TableProps) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = "" }: TableProps) {
  return (
    <tr className={`border-b border-heritage-sand/20 last:border-0
      hover:bg-heritage-cream/60 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = "" }: TableCellProps) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold
      uppercase tracking-wide text-heritage-brown ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "", colSpan }: TableCellProps) {
  return (
    <td className={`px-4 py-3 text-heritage-dark ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
