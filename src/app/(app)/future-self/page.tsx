import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getPrimaryGoal, getProfile, getUser } from '@/lib/data';
import { FutureSelfForm } from './FutureSelfForm';

export default async function FutureSelfPage() {
  const [user, profile, goal] = await Promise.all([
    getUser(),
    getProfile(),
    getPrimaryGoal(),
  ]);
  if (!user) redirect('/login');

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
              {caption || 'Your next gambling session costs progress toward this.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-brand-300">
        Your next gambling session costs progress toward this goal.
      </div>

      <FutureSelfForm userId={user.id} defaultCaption={caption} />
    </div>
  );
}
