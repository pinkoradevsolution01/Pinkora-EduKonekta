'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Assignment = {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  instructions: string;
  dueAt: string;
  state: string;
  isLate: boolean;
  submissionCount: number;
  attachmentName?: string | null;
  class: { name: string };
  subject: { name: string };
  submissions: Array<{
    id?: string;
    content?: string | null;
    feedback?: string | null;
    completedAt?: string | null;
    isLate?: boolean;
    attachmentName?: string | null;
  }>;
};
type Auth = { roles: string[] };
type TeacherClass = {
  id: string;
  name: string;
  assignments: Array<{ subject: { id: string; name: string } }>;
};
type SubmissionReview = {
  id: string;
  content?: string | null;
  feedback?: string | null;
  isLate: boolean;
  attachmentName?: string | null;
  student?: { user?: { displayName?: string } };
};
type UploadPayload = { name: string; mime: string; size: number; data: string };
type AssignmentDraft = {
  classId: string;
  subjectId: string;
  title: string;
  instructions: string;
  dueAt: string;
};
type Filter = 'ALL' | 'UPCOMING' | 'COMPLETED';

const safeMimes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const emptyDraft = (): AssignmentDraft => ({
  classId: '',
  subjectId: '',
  title: '',
  instructions: '',
  dueAt: '',
});

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

async function encodeFile(file: File): Promise<UploadPayload> {
  if (!safeMimes.has(file.type) || file.size > 10 * 1024 * 1024)
    throw new Error('Use a PDF, JPG, PNG, TXT, or DOCX file no larger than 10 MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
  return { name: file.name, mime: file.type, size: file.size, data: dataUrl.split(',')[1] ?? '' };
}

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [auth, setAuth] = useState<Auth>({ roles: [] });
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submission, setSubmission] = useState<Record<string, string>>({});
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File | undefined>>({});
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AssignmentDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignmentFile, setAssignmentFile] = useState<File>();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviews, setReviews] = useState<SubmissionReview[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const canCreate = auth.roles.some((role) =>
    ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role),
  );
  const isStudent = auth.roles.includes('STUDENT');

  async function load(showInitialLoader = false) {
    if (showInitialLoader) setLoading(true);
    try {
      const me = (await request('/auth/me')) as Auth;
      const [assignments, teacherClasses] = await Promise.all([
        request('/assignments'),
        me.roles.some((role) => ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role))
          ? request('/structure/classes').catch(() => [])
          : Promise.resolve([]),
      ]);
      setAuth(me);
      setClasses(Array.isArray(teacherClasses) ? teacherClasses : []);
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
      if (showInitialLoader) setLoading(false);
    }
  }
  useEffect(() => {
    void load(true);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const saved = await request(`/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ content: submission[assignmentId] ?? '', completed: true }),
      });
      const file = submissionFiles[assignmentId];
      if (file)
        await request(`/assignments/submissions/${saved.id}/attachment`, {
          method: 'POST',
          body: JSON.stringify(await encodeFile(file)),
        });
      setMessage('Submission saved successfully.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Submission failed.');
    }
  }
  function changeClass(classId: string) {
    const subject = classes.find((item) => item.id === classId)?.assignments[0]?.subject;
    setDraft((current) => ({ ...current, classId, subjectId: subject?.id ?? '' }));
  }
  function resetEditor() {
    setDraft(emptyDraft());
    setEditingId(null);
    setAssignmentFile(undefined);
  }
  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const body = { ...draft, dueAt: new Date(draft.dueAt).toISOString() };
      const item = editingId
        ? await request(`/assignments/${editingId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await request('/assignments', { method: 'POST', body: JSON.stringify(body) });
      if (assignmentFile)
        await request(`/assignments/${item.id}/attachment`, {
          method: 'POST',
          body: JSON.stringify(await encodeFile(assignmentFile)),
        });
      setMessage(editingId ? 'Assignment updated.' : 'Assignment saved as a draft.');
      resetEditor();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Assignment could not be saved.');
    }
  }
  async function publish(id: string) {
    try {
      await request(`/assignments/${id}/publish`, { method: 'POST' });
      setMessage('Assignment published. Authorized students and linked parents will be notified.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Assignment could not be published.');
    }
  }
  async function removeAssignmentAttachment(id: string) {
    try {
      await request(`/assignments/${id}/attachment`, { method: 'DELETE' });
      setMessage('Assignment attachment deleted.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Attachment could not be deleted.');
    }
  }
  async function download(kind: 'assignment' | 'submission', id: string) {
    try {
      const signed = await request(`/assignments/attachments/${kind}/${id}/sign`, {
        method: 'POST',
      });
      window.open(`${api}${signed.url}`, '_blank', 'noopener,noreferrer');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Attachment could not be opened.');
    }
  }
  async function loadReviews(id: string) {
    try {
      const rows = await request(`/assignments/${id}/submissions`);
      const parsed = Array.isArray(rows) ? rows : [];
      setReviewing(id);
      setReviews(parsed);
      setFeedback(
        Object.fromEntries(parsed.map((row: SubmissionReview) => [row.id, row.feedback ?? ''])),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Submissions could not be loaded.');
    }
  }
  async function saveFeedback(id: string) {
    try {
      await request(`/assignments/submissions/${id}/feedback`, {
        method: 'PATCH',
        body: JSON.stringify({ feedback: feedback[id] ?? '' }),
      });
      setMessage('Feedback saved.');
      if (reviewing) await loadReviews(reviewing);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Feedback could not be saved.');
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
  const selectedClass = classes.find((item) => item.id === draft.classId);

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
          <section className="app-card mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#092d83]">
                  {editingId ? 'Edit assignment' : 'Create an assignment'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Classes and subjects are limited to your authorized teaching assignments.
                </p>
              </div>
              {editingId && (
                <button
                  onClick={resetEditor}
                  className="brand-focus rounded-xl px-3 py-2 text-sm font-bold text-[#092d83]"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <form onSubmit={saveAssignment} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Class
                <select
                  value={draft.classId}
                  onChange={(event) => changeClass(event.target.value)}
                  required
                  className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                >
                  <option value="">Select a class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Subject
                <select
                  value={draft.subjectId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, subjectId: event.target.value }))
                  }
                  required
                  disabled={!selectedClass}
                  className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal disabled:bg-slate-100"
                >
                  <option value="">Select a subject</option>
                  {selectedClass?.assignments.map(({ subject }) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Title
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                  maxLength={200}
                  className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Due date and time
                <input
                  type="datetime-local"
                  value={draft.dueAt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dueAt: event.target.value }))
                  }
                  required
                  className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Instructions
                <textarea
                  value={draft.instructions}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, instructions: event.target.value }))
                  }
                  required
                  maxLength={100000}
                  className="brand-focus mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Attachment <span className="font-normal text-slate-500">(optional, max 10 MB)</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,application/pdf,image/jpeg,image/png,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setAssignmentFile(event.target.files?.[0])}
                  className="brand-focus mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                />
              </label>
              <button className="brand-button brand-focus w-fit rounded-xl px-5 py-3 font-bold text-white">
                {editingId ? 'Save changes' : 'Save draft'}
              </button>
            </form>
          </section>
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
                {item.attachmentName && (
                  <button
                    onClick={() => download('assignment', item.id)}
                    className="brand-focus mt-3 text-sm font-bold text-[#1455c0]"
                  >
                    Download: {item.attachmentName}
                  </button>
                )}
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
                    <label className="mt-3 block text-sm font-semibold text-slate-700">
                      Attachment (optional)
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,application/pdf,image/jpeg,image/png,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) =>
                          setSubmissionFiles((current) => ({
                            ...current,
                            [item.id]: event.target.files?.[0],
                          }))
                        }
                        className="brand-focus mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 font-normal"
                      />
                    </label>
                    <button className="brand-button brand-focus mt-3 rounded-xl px-4 py-2.5 text-sm font-bold text-white">
                      Submit work
                    </button>
                  </form>
                )}
                {canCreate && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setDraft({
                          classId: item.classId,
                          subjectId: item.subjectId,
                          title: item.title,
                          instructions: item.instructions,
                          dueAt: new Date(item.dueAt).toISOString().slice(0, 16),
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="brand-focus rounded-xl border border-[#dce5f7] px-3 py-2 text-sm font-bold text-[#092d83]"
                    >
                      Edit
                    </button>
                    {item.state === 'DRAFT' && (
                      <button
                        onClick={() => publish(item.id)}
                        className="brand-button brand-focus rounded-xl px-3 py-2 text-sm font-bold text-white"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => loadReviews(item.id)}
                      className="brand-focus rounded-xl border border-[#dce5f7] px-3 py-2 text-sm font-bold text-[#092d83]"
                    >
                      Review submissions ({item.submissionCount})
                    </button>
                    {item.attachmentName && (
                      <button
                        onClick={() => removeAssignmentAttachment(item.id)}
                        className="brand-focus rounded-xl px-3 py-2 text-sm font-bold text-red-700"
                      >
                        Delete attachment
                      </button>
                    )}
                  </div>
                )}
                {!isStudent && !canCreate && (
                  <p className="mt-4 text-sm text-slate-500">
                    Submissions received: {item.submissionCount}
                  </p>
                )}
              </article>
            );
          })}
        </section>
        {reviewing && (
          <section className="app-card mt-7 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#092d83]">Review submissions</h2>
              <button
                onClick={() => setReviewing(null)}
                className="brand-focus rounded-xl px-3 py-2 text-sm font-bold text-[#092d83]"
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {reviews.map((row) => (
                <article key={row.id} className="rounded-xl border border-[#e6edf8] p-4">
                  <p className="font-bold text-[#092d83]">
                    {row.student?.user?.displayName ?? 'Student'} {row.isLate ? '(late)' : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {row.content || 'No written response.'}
                  </p>
                  {row.attachmentName && (
                    <button
                      onClick={() => download('submission', row.id)}
                      className="brand-focus mt-2 text-sm font-bold text-[#1455c0]"
                    >
                      Download: {row.attachmentName}
                    </button>
                  )}
                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Feedback
                    <textarea
                      value={feedback[row.id] ?? ''}
                      onChange={(event) =>
                        setFeedback((current) => ({ ...current, [row.id]: event.target.value }))
                      }
                      className="brand-focus mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 font-normal"
                    />
                  </label>
                  <button
                    onClick={() => saveFeedback(row.id)}
                    className="brand-button brand-focus mt-2 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  >
                    Save feedback
                  </button>
                </article>
              ))}
              {!reviews.length && (
                <p className="text-sm text-slate-500">No student submissions yet.</p>
              )}
            </div>
          </section>
        )}
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
