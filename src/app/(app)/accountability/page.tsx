import { addAccountabilityEntry, deleteAccountabilityEntry } from '@/lib/actions';
import { getAccountabilityEntries } from '@/lib/data';
import type { AccountabilityEntry, AccountabilityType } from '@/lib/types';

const SECTIONS: {
  type: AccountabilityType;
  title: string;
  prompt: string;
  emoji: string;
  placeholder: string;
}[] = [
  {
    type: 'reason',
    title: 'Why I want to stop',
    prompt: 'Your reasons — read these in the hard moments.',
    emoji: '💚',
    placeholder: 'I want to be present for my family…',
  },
  {
    type: 'worst_loss',
    title: 'My worst gambling loss',
    prompt: 'The night you never want to repeat.',
    emoji: '🔻',
    placeholder: 'The time I lost…',
  },
  {
    type: 'cost',
    title: 'What gambling has cost me',
    prompt: 'Beyond money — relationships, time, peace.',
    emoji: '⚖️',
    placeholder: 'It cost me…',
  },
];

function EntryList({
  entries,
}: {
  entries: AccountabilityEntry[];
}) {
  if (!entries.length) {
    return <p className="muted">Nothing here yet. Add your first entry above.</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/5 p-3"
        >
          <p className="flex-1 text-sm text-slate-200">“{e.content}”</p>
          <form action={deleteAccountabilityEntry}>
            <input type="hidden" name="id" value={e.id} />
            <button
              className="text-slate-500 transition hover:text-danger-400"
              aria-label="Delete"
            >
              ✕
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default async function AccountabilityPage() {
  const entries = await getAccountabilityEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accountability wall 🧱</h1>
        <p className="muted mt-1">
          Your own words, saved for the moments you need them most. We show
          these during high-risk times.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const sectionEntries = entries.filter(
          (e) => e.entry_type === section.type,
        );
        return (
          <div key={section.type} className="card space-y-3">
            <div>
              <h2 className="font-semibold">
                {section.emoji} {section.title}
              </h2>
              <p className="muted">{section.prompt}</p>
            </div>

            <form action={addAccountabilityEntry} className="space-y-2">
              <input type="hidden" name="entry_type" value={section.type} />
              <textarea
                name="content"
                rows={2}
                required
                placeholder={section.placeholder}
                className="input resize-none"
              />
              <button className="btn-ghost w-full">Add</button>
            </form>

            <EntryList entries={sectionEntries} />
          </div>
        );
      })}
    </div>
  );
}
