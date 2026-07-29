'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'GUIDANCE' | 'SCHOOL_ADMIN' | 'PLATFORM_ADMIN';
type Row = {
  studentId: string;
  name: string;
  state: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes: string;
};
type Summary = { present: number; absent: number; late: number; excused: number };

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

export default function AttendancePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isTeacher = roles.includes('TEACHER');

  useEffect(() => {
    void (async () => {
      try {
        const me = await request('/auth/me');
        setRoles(me.roles ?? []);
        if (me.roles?.includes('TEACHER')) {
          const classes = await request('/structure/classes');
          const first = classes[0];
          if (first) {
            setClassId(first.id);
            const detail = await request(`/structure/classes/${first.id}`);
            setRows(
              detail.enrollments.map(
                (item: { student: { id: string; user: { displayName: string } } }) => ({
                  studentId: item.student.id,
                  name: item.student.user.displayName,
                  state: 'PRESENT',
                  notes: '',
                }),
              ),
            );
          }
        } else if (me.roles?.includes('PARENT')) {
          const children = await request('/attendance/children');
          setSummary(
            children.reduce(
              (total: Summary, child: { summary: Summary }) => ({
                present: total.present + child.summary.present,
                absent: total.absent + child.summary.absent,
                late: total.late + child.summary.late,
                excused: total.excused + child.summary.excused,
              }),
              { present: 0, absent: 0, late: 0, excused: 0 },
            ),
          );
        } else if (me.roles?.includes('STUDENT')) {
          const own = await request('/attendance/me');
          setSummary(own.summary);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load attendance.');
      }
    })();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await request('/attendance/daily', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          attendanceDate: date,
          records: rows.map(({ studentId, state, notes }) => ({
            studentId,
            state,
            notes: notes || undefined,
          })),
        }),
      });
      setMessage('Attendance recorded.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Attendance could not be recorded.');
    }
  }

  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        <WorkspaceNav />
        <header className="fade-in">
          <p className="eyebrow">School presence</p>
          <h1 className="page-title mt-2">Attendance</h1>
          <p className="page-copy mt-3">Daily presence, absence notes, and attendance summaries.</p>
        </header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        {isTeacher && (
          <form onSubmit={submit} className="app-card mt-8 p-6">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm font-medium">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="brand-focus mt-1 block rounded-xl border border-[#dce5f7] bg-white p-3"
                />
              </label>
              <p className="text-sm text-slate-500">
                Assigned class: {classId ? 'Ready to record' : 'Loading...'}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.studentId}
                  className="grid gap-3 rounded-xl border border-[#e6edf8] bg-[#fbfcff] p-4 sm:grid-cols-[1fr_150px_1fr] sm:items-center"
                >
                  <span className="font-medium">{row.name}</span>
                  <select
                    value={row.state}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, state: event.target.value as Row['state'] }
                            : item,
                        ),
                      )
                    }
                    className="brand-focus rounded-xl border border-[#dce5f7] bg-white p-3"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="EXCUSED">Excused</option>
                  </select>
                  <input
                    value={row.notes}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, notes: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Notes (optional)"
                    className="brand-focus rounded-xl border border-[#dce5f7] bg-white p-3"
                  />
                </div>
              ))}
            </div>
            <button
              disabled={!rows.length}
              className="brand-button brand-focus mt-6 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Save daily attendance
            </button>
          </form>
        )}
        {summary && (
          <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="metric-card text-center">
                <p className="text-2xl font-bold text-[#092d83]">{value}</p>
                <p className="mt-1 text-sm capitalize text-slate-500">{key}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
