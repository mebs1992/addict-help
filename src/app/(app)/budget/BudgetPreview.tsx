'use client';

import { useEffect, useRef, useState } from 'react';
import {
  calculateExposureRisk,
  calculateFinancialPosition,
  money,
} from '@/lib/calculations';
import {
  EXPOSURE_BLURBS,
  FINANCIAL_POSITION_BLURBS,
  FINANCIAL_POSITION_LABELS,
  RISK_BAND_LABELS,
} from '@/lib/constants';
import type { FinancialPositionLevel, RiskBand } from '@/lib/types';

const FINANCIAL_CLASS: Record<FinancialPositionLevel, string> = {
  strong: 'text-brand-400',
  stable: 'text-warn-400',
  fragile: 'text-danger-400',
};
const BAND_CLASS: Record<RiskBand, string> = {
  low: 'text-brand-400',
  moderate: 'text-warn-400',
  high: 'text-danger-400',
};

/**
 * Live preview of the financial picture. Reads the income, expenses and account
 * fields from the enclosing <form> so the financial position and exposure
 * update as you type. No "safe limit" — this app never names an amount you can
 * gamble; it shows how resilient and how exposed you are.
 */
export function BudgetPreview({
  defaultIncome,
  defaultExpenses,
  defaultSpendings,
  defaultSavings,
  defaultOffset,
}: {
  defaultIncome: number;
  defaultExpenses: number;
  defaultSpendings: number;
  defaultSavings: number;
  defaultOffset: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [income, setIncome] = useState(defaultIncome);
  const [expenses, setExpenses] = useState(defaultExpenses);
  const [spendings, setSpendings] = useState(defaultSpendings);
  const [savings, setSavings] = useState(defaultSavings);
  const [offset, setOffset] = useState(defaultOffset);

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
      setSpendings(get('spendings_balance'));
      setSavings(get('savings_balance'));
      setOffset(get('offset_balance'));
    };
    form.addEventListener('input', recompute);
    return () => form.removeEventListener('input', recompute);
  }, []);

  const financial = calculateFinancialPosition(income, expenses);
  const exposure = calculateExposureRisk(
    spendings,
    savings,
    offset,
    financial.surplus,
  );

  if (income <= 0) {
    return (
      <div
        ref={ref}
        className="rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <p className="muted">
          Enter your income and expenses to see your financial position.
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
        <span className="muted">Monthly surplus after essentials</span>
        <span className="font-semibold text-slate-100">
          {money(financial.surplus)}/mo
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-sm font-medium text-slate-300">
          Financial position
        </span>
        <span className={`font-semibold ${FINANCIAL_CLASS[financial.level]}`}>
          {FINANCIAL_POSITION_LABELS[financial.level]}
        </span>
      </div>
      <p className="muted">{FINANCIAL_POSITION_BLURBS[financial.level]}</p>

      {exposure.accessible > 0 && (
        <>
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-medium text-slate-300">
              Exposure risk
            </span>
            <span className={`font-semibold ${BAND_CLASS[exposure.level]}`}>
              {RISK_BAND_LABELS[exposure.level]}
            </span>
          </div>
          <p className="muted">{EXPOSURE_BLURBS[exposure.level]}</p>
        </>
      )}
    </div>
  );
}
