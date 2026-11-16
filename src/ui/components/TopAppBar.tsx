interface TopAppBarProps {
  title: string;
  subtitle?: string;
}

export function TopAppBar({ title, subtitle }: TopAppBarProps) {
  return (
    <header className="border-b border-slate-800 px-4 py-4">
      <div className="text-lg font-black">{title}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
    </header>
  );
}

