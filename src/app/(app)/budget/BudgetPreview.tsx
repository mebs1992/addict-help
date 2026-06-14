'use client';

import { useEffect, useRef, useState } from 'react';
import { guardrailsForIncome, money } from '@/lib/calculations';

/**
 * Live preview of the tiered guardrails. Reads the monthly-income field from
 * the enclosing <form> so the safe limit and hard ceiling update as you type.
 */
export function BudgetPreview({ defaultIncome }: { defaultIncome: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [income, setIncome] = useState(defaultIncome);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const recompute = () => {
      const raw = (form.elements.namedItem('monthly_income') as HTMLInputElement)
        ?.value;
      setIncome(parseFloat(raw || '0') || 0);
    };
    form.addEventListener('input', recompute);
    return () => form.removeEventListener('input', recompute);
  }, []);

  const g = guardrailsForIncome(income);

  return (
    <div
      ref={ref}
      className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-brand-400">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          Safe limit
        </span>
        <span className="font-semibold text-brand-400">
          {money(g.safeLimit)}/mo
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-warn-400">
          <span className="h-2.5 w-2.5 rounded-full bg-warn-500" />
          Caution above
        </span>
        <span className="font-semibold text-warn-400">
          {money(g.safeLimit)}
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
