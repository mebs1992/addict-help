import { saveBudget } from '@/lib/actions';
import { getProfile } from '@/lib/data';
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
import { BudgetPreview } from './BudgetPreview';

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

export default async function BudgetPage() {
  const profile = await getProfile();
  const monthlyIncome = profile?.monthly_income ?? 0;
  const monthlyExpenses = profile?.monthly_expenses ?? 0;
  const spendings = profile?.spendings_balance ?? 0;
  const savings = profile?.savings_balance ?? 0;
  const offset = profile?.offset_balance ?? 0;
  const financial = calculateFinancialPosition(monthlyIncome, monthlyExpenses);
  const exposure = calculateExposureRisk(
    spendings,
    savings,
    offset,
    financial.surplus,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your financial position</h1>
        <p className="muted mt-1">
          Tell us what you earn, what your essentials cost, and what sits in your
          accounts. We&apos;ll show how resilient you are and how much cash is
          within easy reach — never an amount it&apos;s &ldquo;okay&rdquo; to
          gamble.
        </p>
      </div>

      {monthlyIncome > 0 && (
        <div className="card-tight space-y-2">
          <div className="flex items-center justify-between">
            <p className="muted">Financial position</p>
            <p className={`text-xl font-bold ${FINANCIAL_CLASS[financial.level]}`}>
              {FINANCIAL_POSITION_LABELS[financial.level]}
            </p>
          </div>
          <p className="muted">
            {money(financial.surplus)} left after essentials each month.{' '}
            {FINANCIAL_POSITION_BLURBS[financial.level]}
          </p>
          {exposure.accessible > 0 && (
            <p className="muted border-t border-white/10 pt-2">
              Exposure risk:{' '}
              <span className={`font-semibold ${BAND_CLASS[exposure.level]}`}>
                {RISK_BAND_LABELS[exposure.level]}
              </span>{' '}
              — {money(exposure.accessible)} within easy reach.
            </p>
          )}
        </div>
      )}

      <form action={saveBudget} className="card space-y-4">
        <div>
          <label className="label" htmlFor="monthly_income">
            How much do you earn each month? (take-home)
          </label>
          <input
            id="monthly_income"
            name="monthly_income"
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            defaultValue={monthlyIncome || ''}
            placeholder="5000"
            className="input"
            required
            autoFocus
          />
          <p className="muted mt-1">
            Roughly what lands in your account each month, after tax.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="monthly_expenses">
            What are your essential expenses each month?
          </label>
          <input
            id="monthly_expenses"
            name="monthly_expenses"
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            defaultValue={monthlyExpenses || ''}
            placeholder="3500"
            className="input"
            required
          />
          <p className="muted mt-1">
            Rent or mortgage, bills, food, transport — the things you have to
            pay.
          </p>
        </div>

        <BudgetPreview
          defaultIncome={monthlyIncome}
          defaultExpenses={monthlyExpenses}
          defaultSpendings={spendings}
          defaultSavings={savings}
          defaultOffset={offset}
        />

        <div className="space-y-4 border-t border-white/10 pt-4">
          <div>
            <p className="label">Your accounts (optional)</p>
            <p className="muted">
              Balances gauge your exposure — how much cash is within easy reach
              in a weak moment. Spendings + savings count as accessible; your
              offset is treated as protected.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="spendings_balance">
              Spendings / everyday account
            </label>
            <input
              id="spendings_balance"
              name="spendings_balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              defaultValue={spendings || ''}
              placeholder="800"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="savings_balance">
              Savings account
            </label>
            <input
              id="savings_balance"
              name="savings_balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              defaultValue={savings || ''}
              placeholder="5000"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="offset_balance">
              Mortgage offset account
            </label>
            <input
              id="offset_balance"
              name="offset_balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              defaultValue={offset || ''}
              placeholder="20000"
              className="input"
            />
          </div>
        </div>

        <button className="btn-primary w-full py-3.5">Save</button>
      </form>

      <p className="muted text-center text-xs">
        This app never tells you a &ldquo;safe&rdquo; amount to gamble. It shows
        what gambling would mean in the context of your finances, your behaviour
        and your goals — so every decision is made with eyes open.
      </p>
    </div>
  );
}
