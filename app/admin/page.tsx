import { redirect } from 'next/navigation';

// /admin redirects to /admin/dashboard (middleware handles auth)
export default function AdminRoot() {
  redirect('/admin/dashboard');
}
