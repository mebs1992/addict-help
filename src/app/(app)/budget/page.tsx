import { saveBudget } from '@/lib/actions';
import { getProfile } from '@/lib/data';
import { guardrailsFor, money } from '@/lib/calculations';
import { GUARDRAIL_CEILING_PCT, GUARDRAIL_SAFE_PCT } from '@/lib/constants';
import { BudgetPreview } from './BudgetPreview';

export default async function BudgetPage() {
  const profile = await getProfile();
  const monthlyIncome = profile?.monthly_income ?? 0;
  const monthlyExpenses = profile?.monthly_expenses ?? 0;
  const g = guardrailsFor(monthlyIncome, monthlyExpenses);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Set your guardrails</h1>
        <p className="muted mt-1">
          Tell us what you earn and what your essentials cost. We&apos;ll work
          out what&apos;s actually spare — and set a safe limit plus a hard line
          you don&apos;t want to cross.
        </p>
      </div>

      {g.disposable > 0 && (
        <div className="card-tight">
          <p className="muted">Your safe monthly limit</p>
          <p className="stat text-brand-400">{money(g.safeLimit)}</p>
          <p className="muted mt-1">
            From {money(g.disposable)} left after expenses. Hard ceiling{' '}
            {money(g.ceiling)} — past this, gambling is taking from things that
            matter.
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
        />

        <button className="btn-primary w-full py-3.5">Save my guardrails</button>
      </form>

      <p className="muted text-center text-xs">
        Your safe limit is {GUARDRAIL_SAFE_PCT}% of your disposable income
        (what&apos;s left after expenses); the hard ceiling is{' '}
        {GUARDRAIL_CEILING_PCT}%. Lower is always better — anything you
        don&apos;t spend stays yours.
      </p>
    </div>
  );
}
