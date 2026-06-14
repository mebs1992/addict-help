import { redirect } from 'next/navigation';

// Personal mode: no landing/login — go straight to the dashboard.
export default function Home() {
  redirect('/dashboard');
}
