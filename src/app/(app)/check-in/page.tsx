import { getEmergencyPauseContext, getProfile } from '@/lib/data';
import { CheckInForm } from './CheckInForm';

function localDateTimeValue(d = new Date()): string {
  // YYYY-MM-DDTHH:mm in local time for datetime-local default.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default async function CheckInPage() {
  const [profile, pauseContext] = await Promise.all([
    getProfile(),
    getEmergencyPauseContext(),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Before you spin</h1>
        <p className="muted mt-1">
          See the real cost first. Nothing is logged until you choose to proceed
          — and one session never erases your progress.
        </p>
      </div>
      <CheckInForm
        consequenceMode={profile?.consequence_mode ?? false}
        defaultDateTime={localDateTimeValue()}
        hourlyWage={profile?.hourly_wage ?? 25}
        {...pauseContext}
      />
    </div>
  );
}
