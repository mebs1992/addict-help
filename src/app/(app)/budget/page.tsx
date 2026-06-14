import { saveBudget } from '@/lib/actions';
import { getCurrentBudget, getPrimaryGoal, getProfile } from '@/lib/data';
import {
  disposableIncome,
  money,
  recommendedBudget,
} from '@/lib/calculations';
import { DEFAULT_BUDGET_PCT } from '@/lib/constants';
import { BudgetPreview } from './BudgetPreview';

export default async function BudgetPage() {
  const [profile, budget, goal] = await Promise.all([
    getProfile(),
    getCurrentBudget(),
    getPrimaryGoal(),
  ]);

  const annualIncome = profile?.annual_income ?? 0;
  const monthlyExpenses = profile?.monthly_expenses ?? 0;
  const hourlyWage = profile?.hourly_wage ?? 25;
  const pct = budget?.budget_pct ?? DEFAULT_BUDGET_PCT;
  const maxBudget = budget?.max_budget ?? null;
  const savingsTarget = goal?.target_amount ?? 0;

  const disposable = disposableIncome(annualIncome, monthlyExpenses);
  const recommended = recommendedBudget(disposable, pct, maxBudget);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your monthly plan</h1>
        <p className="muted mt-1">
          We&apos;re not asking you to quit cold turkey. We&apos;ll set a small,
          deliberate limit and make every dollar visible.
        </p>
      </div>

      {budget && (
        <div className="card-tight">
          <p className="muted">Current recommended allowance</p>
          <p className="stat text-brand-400">{money(recommended)}</p>
          <p className="muted mt-1">
            {pct}% of {money(disposable)} disposable income
            {maxBudget != null ? `, capped at ${money(maxBudget)}` : ''}
          </p>
        </div>
      )}

      <form action={saveBudget} className="card space-y-4">
        <div>
          <label className="label" htmlFor="annual_income">
            Annual income (before tax)
          </label>
          <input
            id="annual_income"
            name="annual_income"
            type="number"
            inputMode="decimal"
            min="0"
            step="100"
            defaultValue={annualIncome || ''}
            placeholder="78000"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="monthly_expenses">
            Monthly expenses
          </label>
          <input
            id="monthly_expenses"
            name="monthly_expenses"
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            defaultValue={monthlyExpenses || ''}
            placeholder="4200"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="savings_target">
            Savings goal (target amount)
          </label>
          <input
            id="savings_target"
            name="savings_target"
            type="number"
            inputMode="decimal"
            min="0"
            step="100"
            defaultValue={savingsTarget || ''}
            placeholder="8000"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="budget_pct">
              Budget % of disposable
            </label>
            <input
              id="budget_pct"
              name="budget_pct"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              defaultValue={pct}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="max_budget">
              Hard cap (optional)
            </label>
            <input
              id="max_budget"
              name="max_budget"
              type="number"
              inputMode="decimal"
              min="0"
              step="5"
              defaultValue={maxBudget ?? ''}
              placeholder="25"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="hourly_wage">
            Your hourly wage (to show hours worked)
          </label>
          <input
            id="hourly_wage"
            name="hourly_wage"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            defaultValue={hourlyWage}
            className="input"
          />
        </div>

        <BudgetPreview
          defaultIncome={annualIncome}
          defaultExpenses={monthlyExpenses}
          defaultPct={pct}
          defaultCap={maxBudget}
        />

        <button className="btn-primary w-full py-3.5">Save my plan</button>
      </form>
    </div>
  );
}
