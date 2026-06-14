'use client';

import { useEffect, useRef, useState } from 'react';
import {
  disposableIncome,
  money,
  recommendedBudget,
} from '@/lib/calculations';

/**
 * Live preview of the recommended allowance. Reads sibling fields from the
 * enclosing <form> so the user sees the number update as they type.
 */
export function BudgetPreview({
  defaultIncome,
  defaultExpenses,
  defaultPct,
  defaultCap,
}: {
  defaultIncome: number;
  defaultExpenses: number;
  defaultPct: number;
  defaultCap: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(() => {
    const disp = disposableIncome(defaultIncome, defaultExpenses);
    return {
      disposable: disp,
      recommended: recommendedBudget(disp, defaultPct, defaultCap),
    };
  });

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const recompute = () => {
      const get = (n: string) =>
        parseFloat(
          (form.elements.namedItem(n) as HTMLInputElement)?.value || '0',
        ) || 0;
      const capRaw = (form.elements.namedItem('max_budget') as HTMLInputElement)
        ?.value;
      const cap = capRaw && capRaw.trim() !== '' ? parseFloat(capRaw) : null;
      const disp = disposableIncome(get('annual_income'), get('monthly_expenses'));
      setState({
        disposable: disp,
        recommended: recommendedBudget(disp, get('budget_pct'), cap),
      });
    };
    form.addEventListener('input', recompute);
    return () => form.removeEventListener('input', recompute);
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4"
    >
      <p className="muted">Recommended monthly gambling allowance</p>
      <p className="stat text-brand-400">{money(state.recommended)}</p>
      <p className="muted mt-1">
        Disposable income {money(state.disposable)}/mo. A small, deliberate
        limit — anything you don&apos;t spend goes toward your goals.
      </p>
    </div>
  );
}
