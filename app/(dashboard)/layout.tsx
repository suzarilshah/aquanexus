import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { devices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

async function getSystemStatus(userId: string) {
  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  const totalDevices = userDevices.length;
  const onlineDevices = userDevices.filter((d) => d.status === 'online').length;
  const offlineDevices = totalDevices - onlineDevices;

  return {
    totalDevices,
    onlineDevices,
    offlineDevices,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const systemStatus = await getSystemStatus(session.userId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar systemStatus={systemStatus} />
      <div className="lg:pl-72">
        <Header user={{ name: session.name, email: session.email }} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
