'use client';

import { useEffect, useRef, useState } from 'react';
import { guardrailsFor, money } from '@/lib/calculations';

/**
 * Live preview of the tiered guardrails. Reads the income and expenses fields
 * from the enclosing <form> so the safe limit and hard ceiling update as you
 * type — derived from what's left after expenses.
 */
export function BudgetPreview({
  defaultIncome,
  defaultExpenses,
}: {
  defaultIncome: number;
  defaultExpenses: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [income, setIncome] = useState(defaultIncome);
  const [expenses, setExpenses] = useState(defaultExpenses);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const recompute = () => {
      const get = (n: string) =>
        parseFloat(
          (form.elements.namedItem(n) as HTMLInputElement)?.value || '0',
        ) || 0;
      setIncome(get('monthly_income'));
      setExpenses(get('monthly_expenses'));
    };
    form.addEventListener('input', recompute);
    return () => form.removeEventListener('input', recompute);
  }, []);

  const g = guardrailsFor(income, expenses);

  if (g.disposable <= 0) {
    return (
      <div
        ref={ref}
        className="rounded-xl border border-danger-500/40 bg-danger-500/10 p-4"
      >
        <p className="text-sm font-medium text-danger-400">
          Nothing spare to gamble with.
        </p>
        <p className="muted mt-1">
          Your expenses meet or exceed your income, so any gambling comes
          straight out of essentials. Your safe limit is {money(0)}.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="muted">Spare after expenses</span>
        <span className="font-semibold text-slate-100">
          {money(g.disposable)}/mo
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <span className="flex items-center gap-2 text-sm font-medium text-brand-400">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          Safe limit
        </span>
        <span className="font-semibold text-brand-400">
          {money(g.safeLimit)}/mo
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-danger-400">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
          Hard ceiling
        </span>
        <span className="font-semibold text-danger-400">
          {money(g.ceiling)}/mo
        </span>
      </div>
      <p className="muted border-t border-white/10 pt-3">
        Stay under {money(g.safeLimit)} and you&apos;re in the green. Cross{' '}
        {money(g.ceiling)} and gambling is doing real damage.
      </p>
    </div>
  );
}
