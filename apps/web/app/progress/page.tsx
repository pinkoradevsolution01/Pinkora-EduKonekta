'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Note = {
  id: string;
  kind: string;
  visibility: string;
  content: string;
  observedAt: string;
  acknowledged: boolean;
  student: { user: { displayName: string } };
  author: { displayName: string };
};
type Auth = { roles: string[] };
type ManageableStudent = {
  id: string;
  displayName: string;
  studentNumber: string | null;
  className: string | null;
};

export default function ProgressPage() {
  const [auth, setAuth] = useState<Auth>({ roles: [] });
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState<ManageableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const canWrite = auth.roles.some((role) =>
    ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role),
  );
  const isParent = auth.roles.includes('PARENT');
  async function load() {
    setLoading(true);
    try {
      const [me, data] = await Promise.all([
        fetch(`${api}/auth/me`, { credentials: 'include' }).then((response) => response.json()),
        fetch(`${api}/evaluations`, { credentials: 'include' }).then((response) => response.json()),
      ]);
      setAuth(me);
      setNotes(Array.isArray(data) ? data : []);
      if (
        Array.isArray(me?.roles) &&
        me.roles.some((role: string) =>
          ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role),
        )
      ) {
        const response = await fetch(`${api}/evaluations/manageable-students`, {
          credentials: 'include',
        });
        const availableStudents = await response.json();
        if (response.ok && Array.isArray(availableStudents)) {
          setStudents(availableStudents);
          setStudentId((current) => current || availableStudents[0]?.id || '');
        }
      }
    } catch {
      setError('Unable to load progress notes.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError('');
    setMessage('');
    const form = new FormData(formElement);
    const response = await fetch(`${api}/evaluations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentId,
        kind: form.get('kind'),
        visibility: form.get('visibility'),
        content: form.get('content'),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error?.message ?? 'Unable to save the progress note.');
      return;
    }
    setMessage('Progress note saved and audited.');
    formElement.reset();
    await load();
  }
  async function acknowledge(id: string) {
    const response = await fetch(`${api}/evaluations/${id}/acknowledge`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      setError('Acknowledgement could not be saved.');
      return;
    }
    setNotes((items) =>
      items.map((item) => (item.id === id ? { ...item, acknowledged: true } : item)),
    );
  }
  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        <WorkspaceNav />
        <header className="rounded-[1.5rem] bg-[#092d83] p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4c448]">
            Supportive learning
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Progress notes</h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/80">
            Respectful, factual observations that support learning. This area does not diagnose,
            risk-score, punish, or make automated decisions about students.
          </p>
        </header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        {canWrite && (
          <form onSubmit={create} className="app-card mt-7 grid gap-4 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="eyebrow">Educator entry</p>
              <h2 className="mt-1 text-xl font-bold text-[#092d83]">Add a factual progress note</h2>
            </div>
            <label className="text-sm font-semibold">
              Student
              <select
                required
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="brand-focus mt-2 w-full rounded-xl border border-[#dce5f7] p-3 font-normal"
                disabled={!students.length}
              >
                {!students.length && <option value="">No assigned students available</option>}
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.displayName}
                    {student.className ? ` — ${student.className}` : ''}
                    {student.studentNumber ? ` (${student.studentNumber})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Note type
              <select
                name="kind"
                className="brand-focus mt-2 w-full rounded-xl border border-[#dce5f7] p-3 font-normal"
              >
                <option value="ACADEMIC_PROGRESS">Academic progress</option>
                <option value="BEHAVIOR_OBSERVATION">Behavior observation</option>
                <option value="POSITIVE_ACHIEVEMENT">Positive achievement</option>
                <option value="TEACHER_FEEDBACK">Teacher feedback</option>
                <option value="INTERNAL_SAFEGUARDING">Internal safeguarding note</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Visibility
              <select
                name="visibility"
                className="brand-focus mt-2 w-full rounded-xl border border-[#dce5f7] p-3 font-normal"
              >
                <option value="PARENT_VISIBLE">Parent visible</option>
                <option value="INTERNAL_ONLY">Internal only</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Neutral observation
              <textarea
                name="content"
                required
                minLength={3}
                maxLength={5000}
                className="brand-focus mt-2 min-h-28 w-full rounded-xl border border-[#dce5f7] p-3 font-normal"
                placeholder="Describe observable progress, strengths, or support needed respectfully."
              />
            </label>
            <p className="md:col-span-2 text-sm leading-6 text-slate-500">
              Internal safeguarding notes must be marked internal-only. Only students assigned to
              you are listed. Use factual, respectful language; do not make diagnoses or
              disciplinary outcomes.
            </p>
            <button
              disabled={!studentId}
              className="brand-button brand-focus w-fit rounded-xl px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save audited note
            </button>
          </form>
        )}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">History</p>
              <h2 className="mt-1 text-2xl font-bold text-[#092d83]">
                Learning and progress timeline
              </h2>
            </div>
            <span className="status-pill bg-[#e8efff] text-[#092d83]">{notes.length} notes</span>
          </div>
          {loading && (
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div key={item} className="skeleton h-40" />
              ))}
            </div>
          )}
          <div className="space-y-4">
            {notes.map((note) => (
              <article key={note.id} className="app-card fade-in p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1455c0]">
                      {note.student.user.displayName} · {note.kind.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
                      {note.content}
                    </p>
                  </div>
                  <span
                    className={`status-pill ${note.visibility === 'INTERNAL_ONLY' ? 'bg-slate-100 text-slate-600' : 'bg-[#fff3d2] text-[#8a5d00]'}`}
                  >
                    {note.visibility === 'INTERNAL_ONLY' ? 'Internal' : 'Parent visible'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f8] pt-4 text-sm text-slate-500">
                  <span>
                    {new Date(note.observedAt).toLocaleDateString()} · {note.author.displayName}
                  </span>
                  {isParent && note.visibility === 'PARENT_VISIBLE' && (
                    <button
                      onClick={() => acknowledge(note.id)}
                      disabled={note.acknowledged}
                      className="brand-focus rounded-xl border border-[#dce5f7] px-3 py-2 font-bold text-[#092d83] disabled:opacity-60"
                    >
                      {note.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!loading && !notes.length && (
            <div className="app-card p-8 text-center">
              <p className="font-bold text-[#092d83]">No progress notes to show</p>
              <p className="mt-2 text-sm text-slate-500">
                Notes appear here only when they are available to your role and linked student
                relationships.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
