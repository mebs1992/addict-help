import Image from 'next/image';
import { getPrimaryGoal, getProfile } from '@/lib/data';
import { saveFutureSelf } from '@/lib/actions';
import { Banner } from '@/components/ui';

export default async function FutureSelfPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const [profile, goal] = await Promise.all([getProfile(), getPrimaryGoal()]);

  const image = profile?.future_self_image_url || goal?.image_url || null;
  const caption = profile?.future_self_caption || '';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Future self</h1>
        <p className="muted mt-1">
          Keep what matters in front of you. Look here before you ever reach for
          a machine.
        </p>
      </div>

      {searchParams.saved && <Banner tone="brand">Saved 💚</Banner>}

      {image && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="relative h-56 w-full bg-ink-800">
            <Image
              src={image}
              alt="Your future self"
              fill
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
            <p className="absolute bottom-0 p-4 text-base font-semibold text-white drop-shadow">
              {caption ||
                'Your next gambling session costs progress toward this.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-brand-300">
        Your next gambling session costs progress toward this goal.
      </div>

      <form action={saveFutureSelf} className="card space-y-4">
        <div>
          <label className="label" htmlFor="photo">
            Upload a photo (your family, or what you&apos;re saving for)
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-ink-950"
          />
        </div>

        <div>
          <label className="label" htmlFor="caption">
            What does this represent?
          </label>
          <textarea
            id="caption"
            name="caption"
            defaultValue={caption}
            rows={3}
            placeholder="My kids' first overseas trip — this is what I'm playing for."
            className="input resize-none"
          />
        </div>

        <button className="btn-primary w-full py-3">
          Save my future self
        </button>
      </form>
    </div>
  );
}
