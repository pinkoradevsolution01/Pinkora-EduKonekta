'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Assignment = {
  id: string;
  title: string;
  instructions: string;
  dueAt: string;
  state: string;
  isLate: boolean;
  submissionCount: number;
  class: { name: string };
  subject: { name: string };
  submissions: Array<{
    content?: string | null;
    feedback?: string | null;
    completedAt?: string | null;
    isLate?: boolean;
  }>;
};
type Auth = { roles: string[] };
type Filter = 'ALL' | 'UPCOMING' | 'COMPLETED';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? 'Request failed');
  return data;
}

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [auth, setAuth] = useState<Auth>({ roles: [] });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submission, setSubmission] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const canCreate = auth.roles.some((role) =>
    ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role),
  );
  const isStudent = auth.roles.includes('STUDENT');

  async function load() {
    setLoading(true);
    try {
      const [me, assignments] = await Promise.all([request('/auth/me'), request('/assignments')]);
      setAuth(me);
      setItems(
        Array.isArray(assignments)
          ? assignments.map((assignment) => ({
              ...assignment,
              submissions: Array.isArray(assignment.submissions) ? assignment.submissions : [],
            }))
          : [],
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in to view assignments.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await request(`/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ content: submission[assignmentId] ?? '', completed: true }),
      });
      setMessage('Submission saved successfully.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Submission failed.');
    }
  }
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === 'ALL' ||
          (filter === 'UPCOMING'
            ? !item.submissions.length && new Date(item.dueAt) >= new Date()
            : Boolean(item.submissions.length)),
      ),
    [filter, items],
  );
  const completed = items.filter((item) => item.submissions.length).length;
  const upcoming = items.filter(
    (item) => !item.submissions.length && new Date(item.dueAt) >= new Date(),
  ).length;

  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        <WorkspaceNav />
        <header className="fade-in">
          <p className="eyebrow">Learning centre</p>
          <h1 className="page-title mt-2">Assignments and submissions</h1>
          <p className="page-copy mt-3">
            Keep classwork, due dates, feedback, and student submissions in one secure place.
          </p>
        </header>
        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <Metric label="Available work" value={items.length} color="bg-[#e8efff] text-[#092d83]" />
          <Metric label="Upcoming" value={upcoming} color="bg-[#fff3d2] text-[#8a5d00]" />
          <Metric label="Completed" value={completed} color="bg-emerald-50 text-emerald-700" />
        </section>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        {canCreate && (
          <p className="app-card mt-6 border-l-4 border-l-[#f4ae08] p-4 text-sm text-slate-600">
            Assignment creation is restricted to assigned teachers and administrators. Classes and
            subjects must already be linked to the teacher.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#092d83]">Your classwork</h2>
          <div className="flex rounded-xl border border-[#dce5f7] bg-white p-1">
            {(['ALL', 'UPCOMING', 'COMPLETED'] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`brand-focus rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? 'bg-[#092d83] text-white' : 'text-slate-600 hover:bg-[#f5f8ff]'}`}
              >
                {value[0] + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {loading && (
          <section className="mt-5 grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="skeleton h-72" />
            ))}
          </section>
        )}
        <section className="mt-5 grid gap-5 md:grid-cols-2">
          {visibleItems.map((item) => {
            const ownSubmission = item.submissions[0];
            return (
              <article key={item.id} className="app-card fade-in p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1455c0]">
                      {item.class.name} · {item.subject.name}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-[#092d83]">{item.title}</h2>
                  </div>
                  <span className="status-pill bg-[#fff3d2] text-[#8a5d00]">{item.state}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {item.instructions}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1f8] pt-4 text-sm">
                  <span className="font-semibold text-slate-700">
                    Due {new Date(item.dueAt).toLocaleString()}
                  </span>
                  {item.isLate && (
                    <span className="status-pill bg-red-50 text-[#c91624]">Late</span>
                  )}
                </div>
                {ownSubmission && (
                  <div className="mt-4 rounded-xl bg-[#f5f8ff] p-4 text-sm">
                    <p className="font-bold text-[#092d83]">
                      Submission recorded {ownSubmission.isLate ? '(late)' : ''}
                    </p>
                    {ownSubmission.feedback && (
                      <p className="mt-2 leading-6 text-slate-600">
                        <span className="font-semibold">Teacher feedback:</span>{' '}
                        {ownSubmission.feedback}
                      </p>
                    )}
                  </div>
                )}
                {isStudent && item.state === 'PUBLISHED' && (
                  <form onSubmit={(event) => submit(event, item.id)} className="mt-5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Your response
                      <textarea
                        value={submission[item.id] ?? ownSubmission?.content ?? ''}
                        onChange={(event) =>
                          setSubmission((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="brand-focus mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                        placeholder="Write your response..."
                      />
                    </label>
                    <button className="brand-button brand-focus mt-3 rounded-xl px-4 py-2.5 text-sm font-bold text-white">
                      Submit work
                    </button>
                  </form>
                )}
                {!isStudent && (
                  <p className="mt-4 text-sm text-slate-500">
                    Submissions received: {item.submissionCount}
                  </p>
                )}
              </article>
            );
          })}
        </section>
        {!loading && !visibleItems.length && !error && (
          <div className="app-card mt-5 p-8 text-center">
            <p className="font-bold text-[#092d83]">Nothing to show here</p>
            <p className="mt-2 text-sm text-slate-500">
              Try another filter or check back when your class publishes work.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="metric-card flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <span
        className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-lg font-extrabold ${color}`}
      >
        {value}
      </span>
    </div>
  );
}
