'use client';

import { useEffect, useState } from 'react';
import { WorkspaceNav } from '../../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Dashboard = {
  children: Array<{
    student: { user: { displayName: string } };
    attendanceSummary: Record<string, number>;
    assignmentStatus: { total: number; submitted: number; pending: number; late: number };
    feedbackSummary: { count: number };
  }>;
  recentAnnouncements: Array<{ id: string; title: string }>;
  upcomingEvents: Array<{ id: string; title: string; startsAt: string }>;
};

export default function ParentDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${api}/dashboard/parent`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message ?? 'Dashboard unavailable');
        return data;
      })
      .then(setDashboard)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Dashboard unavailable'),
      );
  }, []);
  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        <WorkspaceNav />
        <header className="relative overflow-hidden rounded-[1.5rem] bg-[#092d83] p-7 text-white sm:p-9">
          <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-[#e31b23]/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4c448]">
              Family view
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Parent dashboard</h1>
            <p className="mt-3 max-w-2xl leading-7 text-white/80">
              A secure snapshot of your linked children’s learning progress, attendance, feedback,
              and school updates.
            </p>
          </div>
        </header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {!dashboard && !error && (
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="skeleton h-60" />
            ))}
          </div>
        )}
        {dashboard && (
          <>
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Linked children</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#092d83]">Progress at a glance</h2>
                </div>
                <span className="status-pill bg-[#e8efff] text-[#092d83]">
                  {dashboard.children.length} linked
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {dashboard.children.map((child) => (
                  <article key={child.student.user.displayName} className="app-card fade-in p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-[#092d83]">
                        {child.student.user.displayName}
                      </h2>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff3d2] font-bold text-[#8a5d00]">
                        {child.student.user.displayName.charAt(0)}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm">
                      <Tile
                        label="Present"
                        value={child.attendanceSummary.present ?? 0}
                        color="bg-emerald-50 text-emerald-700"
                      />
                      <Tile
                        label="Absent"
                        value={child.attendanceSummary.absent ?? 0}
                        color="bg-red-50 text-[#c91624]"
                      />
                      <Tile
                        label="Pending work"
                        value={child.assignmentStatus.pending}
                        color="bg-[#fff3d2] text-[#8a5d00]"
                      />
                      <Tile
                        label="Feedback"
                        value={child.feedbackSummary.count}
                        color="bg-[#e8efff] text-[#1455c0]"
                      />
                    </div>
                    <div className="mt-5 border-t border-[#edf1f8] pt-4 text-sm text-slate-600">
                      <span className="font-semibold">Assignments:</span>{' '}
                      {child.assignmentStatus.submitted} of {child.assignmentStatus.total} submitted{' '}
                      {child.assignmentStatus.late > 0 && (
                        <span className="text-[#c91624]">· {child.assignmentStatus.late} late</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <ListCard
                title="Recent announcements"
                eyebrow="Stay connected"
                items={dashboard.recentAnnouncements.map((item) => item.title)}
              />
              <ListCard
                title="Upcoming events"
                eyebrow="Plan ahead"
                items={dashboard.upcomingEvents.map(
                  (item) => `${item.title} · ${new Date(item.startsAt).toLocaleString()}`,
                )}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <b className="block text-xl">{value}</b>
      <span className="mt-1 block text-xs font-semibold">{label}</span>
    </div>
  );
}
function ListCard({ title, eyebrow, items }: { title: string; eyebrow: string; items: string[] }) {
  return (
    <article className="app-card p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-[#092d83]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <p key={item} className="rounded-xl bg-[#f5f8ff] p-3 text-sm leading-6 text-slate-700">
              {item}
            </p>
          ))
        ) : (
          <p className="rounded-xl bg-[#f5f8ff] p-3 text-sm text-slate-500">
            Nothing new at the moment.
          </p>
        )}
      </div>
    </article>
  );
}
