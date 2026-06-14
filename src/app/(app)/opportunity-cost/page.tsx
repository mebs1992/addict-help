import { getSessions } from '@/lib/data';
import { money, opportunityBreakdown, sum } from '@/lib/calculations';
import { OPPORTUNITY_ITEMS } from '@/lib/constants';

export default async function OpportunityCostPage() {
  const sessions = await getSessions();
  const year = new Date().getFullYear();
  const yearSpent = sum(
    sessions
      .filter((s) => new Date(s.gambled_at).getFullYear() === year)
      .map((s) => Number(s.amount)),
  );
  const lifetime = sum(sessions.map((s) => Number(s.amount)));

  const yearBreakdown = opportunityBreakdown(yearSpent, 6);
  const lifetimeBreakdown = opportunityBreakdown(lifetime, 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Opportunity cost</h1>
        <p className="muted mt-1">
          Every dollar gambled is a dollar that could have been something real.
        </p>
      </div>

      <div className="card">
        <p className="muted">This year ({year}) you&apos;ve spent enough to buy:</p>
        {yearBreakdown.length ? (
          <ul className="mt-3 space-y-2">
            {yearBreakdown.map((i) => (
              <li key={i.label} className="flex items-center gap-3">
                <span className="text-xl">{i.emoji}</span>
                <span className="font-medium">
                  {i.quantity} × {i.label}
                </span>
                <span className="muted ml-auto">{money(i.quantity * i.cost)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 font-medium text-brand-400">
            Nothing yet this year. Keep it that way. 💚
          </p>
        )}
      </div>

      <div className="card">
        <p className="muted">Across everything you&apos;ve logged:</p>
        {lifetimeBreakdown.length ? (
          <ul className="mt-3 space-y-2">
            {lifetimeBreakdown.map((i) => (
              <li key={i.label} className="flex items-center gap-3">
                <span className="text-xl">{i.emoji}</span>
                <span className="font-medium">
                  {i.quantity} × {i.label}
                </span>
                <span className="muted ml-auto">{money(i.quantity * i.cost)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 muted">No sessions logged yet.</p>
        )}
      </div>

      <div className="card">
        <p className="muted mb-3">The exchange rate of a spin</p>
        <ul className="grid grid-cols-2 gap-2">
          {OPPORTUNITY_ITEMS.map((i) => (
            <li
              key={i.label}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 p-2.5 text-sm"
            >
              <span className="text-lg">{i.emoji}</span>
              <span className="capitalize">{i.label}</span>
              <span className="muted ml-auto">{money(i.cost)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
