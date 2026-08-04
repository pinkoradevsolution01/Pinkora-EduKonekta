'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const reportKinds = ['attendance', 'assignments', 'users', 'communications', 'audit'] as const;
type ReportKind = (typeof reportKinds)[number];
type Overview = {
  activeUsers: number;
  classes: { total: number; activeEnrollments: number };
  attendance: Array<{ state: string; total: number }>;
  assignmentCompletion: { assignments: number; submitted: number; pending: number };
  announcementReach: { announcements: number; reads: number; parentAcknowledgements: number };
  safetyTotals: Array<{ status: string; total: number }>;
  openGuidanceCases: number;
};
type Settings = {
  school: { name: string; slug: string; subscriptionPlan: string; subscriptionStatus: string };
  featureFlags: Array<{ key: string; enabled: boolean }>;
};

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
function dates(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
  return params.toString();
}
function flat(value: unknown, prefix = ''): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { [prefix || 'value']: String(value ?? '') };
  return Object.entries(value as Record<string, unknown>).reduce(
    (result, [key, current]) => {
      const name = prefix ? `${prefix}.${key}` : key;
      if (current && typeof current === 'object' && !Array.isArray(current))
        Object.assign(result, flat(current, name));
      else result[name] = Array.isArray(current) ? JSON.stringify(current) : String(current ?? '');
      return result;
    },
    {} as Record<string, string>,
  );
}

export function AdminDashboardManager() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [kind, setKind] = useState<ReportKind>('attendance');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    try {
      const suffix = dates(from, to);
      const [nextOverview, nextSettings] = await Promise.all([
        request(`/dashboard/admin/overview${suffix ? `?${suffix}` : ''}`),
        request('/dashboard/admin/settings'),
      ]);
      setOverview(nextOverview);
      setSettings(nextSettings);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load the administration dashboard.',
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    await load();
  }
  async function loadReport(nextKind = kind) {
    try {
      const suffix = dates(from, to);
      const report = await request(
        `/dashboard/admin/reports/${nextKind}${suffix ? `?${suffix}` : ''}`,
      );
      const records = Array.isArray(report) ? report : [report];
      setRows(records.map((item) => flat(item)));
      setKind(nextKind);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Report could not be loaded.');
    }
  }
  async function exportReport() {
    try {
      const suffix = dates(from, to);
      const report = await request(
        `/dashboard/admin/reports/${kind}/export${suffix ? `?${suffix}` : ''}`,
      );
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([report.content], { type: report.contentType }));
      link.download = report.fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Report export could not be created.');
    }
  }
  async function saveSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await request('/dashboard/admin/settings/school', {
        method: 'PATCH',
        body: JSON.stringify({ name: form.get('name') }),
      });
      setMessage('School settings saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Settings could not be saved.');
    }
  }
  async function toggle(key: string, enabled: boolean) {
    try {
      await request(`/dashboard/admin/settings/feature-flags/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      setMessage(`Feature flag ${enabled ? 'enabled' : 'disabled'}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Feature flag could not be updated.');
    }
  }
  const columns = useMemo(() => [...new Set(rows.flatMap((row) => Object.keys(row)))], [rows]);
  return (
    <>
      <form onSubmit={filter} className="app-card mt-7 flex flex-wrap items-end gap-4 p-5">
        <label className="text-sm font-semibold text-slate-700">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="brand-focus mt-1 block rounded-xl border border-slate-200 p-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="brand-focus mt-1 block rounded-xl border border-slate-200 p-3 font-normal"
          />
        </label>
        <button className="brand-button brand-focus rounded-xl px-5 py-3 font-bold text-white">
          Apply date filters
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {message && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
      {overview && (
        <>
          <section
            aria-label="Key school metrics"
            className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              ['Active users', overview.activeUsers],
              ['Classes', overview.classes.total],
              ['Enrollments', overview.classes.activeEnrollments],
              ['Open guidance', overview.openGuidanceCases],
            ].map(([label, value]) => (
              <Metric key={String(label)} label={String(label)} value={Number(value)} />
            ))}
          </section>
          <section className="mt-7 grid gap-5 lg:grid-cols-2">
            <MetricTable
              title="Attendance summary"
              rows={overview.attendance.map((item) => [item.state, item.total])}
            />
            <MetricTable
              title="De-identified safety totals"
              rows={overview.safetyTotals.map((item) => [item.status, item.total])}
            />
          </section>
          <section className="app-card mt-7 p-5">
            <h2 className="font-bold text-[#092d83]">Engagement and assignment completion</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ['Assignments created', overview.assignmentCompletion.assignments],
                ['Submissions received', overview.assignmentCompletion.submitted],
                ['Assignments pending', overview.assignmentCompletion.pending],
                ['Announcements', overview.announcementReach.announcements],
                ['Announcement reads', overview.announcementReach.reads],
                ['Parent acknowledgements', overview.announcementReach.parentAcknowledgements],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="mt-1 text-2xl font-extrabold text-[#092d83]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
      <section className="app-card mt-7 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold text-[#092d83]">Reports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tenant-scoped, date-filtered, and capped to 1,000 rows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Report type"
              value={kind}
              onChange={(event) => setKind(event.target.value as ReportKind)}
              className="brand-focus rounded-xl border border-slate-200 bg-white p-2 text-sm"
            >
              {reportKinds.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadReport()}
              className="brand-focus rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-[#092d83]"
            >
              View report
            </button>
            <button
              onClick={exportReport}
              className="brand-button brand-focus rounded-xl px-3 py-2 text-sm font-bold text-white"
            >
              Export CSV
            </button>
          </div>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8faff]">
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className="px-4 py-3 font-semibold text-slate-600">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {columns.map((column) => (
                      <td key={column} className="max-w-72 truncate px-4 py-3 text-slate-700">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">Choose a report type and select View report.</p>
        )}
      </section>
      {settings && (
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <section className="app-card p-5">
            <h2 className="font-bold text-[#092d83]">School settings</h2>
            <form onSubmit={saveSchool} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                School name
                <input
                  name="name"
                  defaultValue={settings.school.name}
                  required
                  maxLength={200}
                  className="brand-focus mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
                />
              </label>
              <p className="text-sm text-slate-500">
                Slug: {settings.school.slug} · {settings.school.subscriptionPlan} /{' '}
                {settings.school.subscriptionStatus}
              </p>
              <button className="brand-button brand-focus rounded-xl px-4 py-3 text-sm font-bold text-white">
                Save settings
              </button>
            </form>
          </section>
          <section className="app-card p-5">
            <h2 className="font-bold text-[#092d83]">Pilot feature flags</h2>
            <div className="mt-4 space-y-3">
              {settings.featureFlags.map((flag) => (
                <label
                  key={flag.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <span className="font-mono text-sm text-slate-700">{flag.key}</span>
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={(event) => toggle(flag.key, event.target.checked)}
                    className="h-5 w-5"
                  />
                </label>
              ))}
              {!settings.featureFlags.length && (
                <p className="text-sm text-slate-500">No feature flags have been configured yet.</p>
              )}
            </div>
          </section>
        </section>
      )}
    </>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <h2 className="text-sm text-slate-600">{label}</h2>
      <p className="mt-2 text-3xl font-bold text-[#092d83]">{value}</p>
    </article>
  );
}
function MetricTable({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <section className="app-card overflow-hidden">
      <h2 className="border-b border-slate-100 p-5 font-bold text-[#092d83]">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead className="sr-only">
          <tr>
            <th>Category</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-slate-100">
              <th scope="row" className="px-5 py-3 font-medium text-slate-700">
                {label}
              </th>
              <td className="px-5 py-3 text-right font-bold text-[#092d83]">{value}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={2} className="p-5 text-slate-500">
                No data in this date range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
