import { money } from '@/lib/calculations';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional reference line (e.g. the month's allowance). */
  budget?: number | null;
}

/**
 * Minimal, dependency-free responsive bar chart rendered with flexbox.
 * Bars turn red when they exceed the budget reference for that period.
 */
export function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.budget ?? 0)));
  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d) => {
        const h = (d.value / max) * 100;
        const over = d.budget != null && d.budget > 0 && d.value > d.budget;
        const budgetH = d.budget ? (d.budget / max) * 100 : 0;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-slate-400">
              {d.value > 0 ? money(d.value) : ''}
            </span>
            <div className="relative flex h-32 w-full items-end">
              {d.budget != null && d.budget > 0 && (
                <div
                  className="absolute inset-x-0 border-t border-dashed border-warn-500/70"
                  style={{ bottom: `${budgetH}%` }}
                  title={`Allowance ${money(d.budget)}`}
                />
              )}
              <div
                className={`w-full rounded-t-md transition-all ${over ? 'bg-danger-500' : 'bg-brand-500'}`}
                style={{ height: `${Math.max(h, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
