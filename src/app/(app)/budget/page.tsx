import { saveBudget } from '@/lib/actions';
import { getProfile } from '@/lib/data';
import { guardrailsForIncome, money } from '@/lib/calculations';
import { GUARDRAIL_CEILING_PCT, GUARDRAIL_SAFE_PCT } from '@/lib/constants';
import { BudgetPreview } from './BudgetPreview';

export default async function BudgetPage() {
  const profile = await getProfile();
  const monthlyIncome = profile?.monthly_income ?? 0;
  const g = guardrailsForIncome(monthlyIncome);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Set your guardrails</h1>
        <p className="muted mt-1">
          One question. Tell us what you earn in a typical month and we&apos;ll
          show you a safe limit — and a hard line you don&apos;t want to cross.
        </p>
      </div>

      {monthlyIncome > 0 && (
        <div className="card-tight">
          <p className="muted">Your safe monthly limit</p>
          <p className="stat text-brand-400">{money(g.safeLimit)}</p>
          <p className="muted mt-1">
            Hard ceiling {money(g.ceiling)} — past this, gambling is taking from
            things that matter.
          </p>
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

        <BudgetPreview defaultIncome={monthlyIncome} />

        <button className="btn-primary w-full py-3.5">Save my guardrails</button>
      </form>

      <p className="muted text-center text-xs">
        Your safe limit is {GUARDRAIL_SAFE_PCT}% of your income; the hard ceiling
        is {GUARDRAIL_CEILING_PCT}%. Lower is always better — anything you
        don&apos;t spend stays yours.
      </p>
    </div>
  );
}
