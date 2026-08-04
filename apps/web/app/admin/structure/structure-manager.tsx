'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type UserMembership = {
  userId: string;
  isActive: boolean;
  role: { code: 'STUDENT' | 'TEACHER' | 'PARENT' | string };
  user: { displayName: string; email: string; status: 'ACTIVE' | 'INACTIVE' };
};
type Option = { id: string; name?: string; user?: { displayName: string; email: string } };
type Overview = {
  schoolYears: Array<{ id: string; name: string; startsOn: string; endsOn: string }>;
  subjects: Array<{ id: string; code: string; name: string }>;
  classes: Array<{
    id: string;
    name: string;
    gradeLevel?: string | null;
    schoolYearId: string;
    schoolYear: { name: string };
  }>;
  students: Array<Option & { studentNumber?: string | null }>;
  teachers: Array<Option & { employeeNumber?: string | null }>;
  parents: Option[];
  enrollments: Array<{
    id: string;
    student: Option;
    class: { name: string };
    schoolYear: { name: string };
  }>;
  teacherAssignments: Array<{
    id: string;
    teacher: Option;
    class: { name: string };
    subject: { name: string };
  }>;
  parentLinks: Array<{ id: string; status: string; parent: Option; student: Option }>;
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

const name = (item: Option) => item.user?.displayName ?? item.name ?? 'Unnamed record';

export function StructureManager() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<UserMembership[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(showInitialLoader = false) {
    if (showInitialLoader) setLoading(true);
    try {
      const [nextOverview, nextMembers] = await Promise.all([
        request('/structure/administration-overview'),
        request('/auth/users'),
      ]);
      setOverview(nextOverview);
      setMembers(Array.isArray(nextMembers) ? nextMembers : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load school structure.');
    } finally {
      if (showInitialLoader) setLoading(false);
    }
  }
  useEffect(() => {
    void load(true);
  }, []);

  async function submit(
    path: string,
    data: Record<string, unknown>,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await request(path, { method: 'POST', body: JSON.stringify(data) });
      setMessage('Saved successfully. The change is tenant-scoped and audited.');
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed.');
    }
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInviteCode('');
    try {
      const result = await request('/schools/invitations', {
        method: 'POST',
        body: JSON.stringify(form(event, ['email', 'role', 'expiresAt'])),
      });
      event.currentTarget.reset();
      setInviteCode(result.code);
      setMessage(
        `Invitation created for ${result.email}. Copy the activation code now; it is shown only once.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invitation could not be created.');
    }
  }
  async function setAccountStatus(userId: string, status: 'ACTIVE' | 'INACTIVE') {
    setError('');
    try {
      await request(`/auth/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMessage(
        `Account ${status === 'ACTIVE' ? 'activated' : 'deactivated'}. Existing sessions are no longer valid after a status change.`,
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account status could not be updated.');
    }
  }

  const unprofiled = useMemo(
    () => ({
      STUDENT: members.filter(
        (member) =>
          member.role.code === 'STUDENT' &&
          !overview?.students.some((item) => item.user?.email === member.user.email),
      ),
      TEACHER: members.filter(
        (member) =>
          member.role.code === 'TEACHER' &&
          !overview?.teachers.some((item) => item.user?.email === member.user.email),
      ),
      PARENT: members.filter(
        (member) =>
          member.role.code === 'PARENT' &&
          !overview?.parents.some((item) => item.user?.email === member.user.email),
      ),
    }),
    [members, overview],
  );

  if (loading)
    return <div className="app-card mt-8 p-8 text-slate-600">Loading school structure…</div>;
  if (!overview)
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
        {error || 'School structure is unavailable.'}
      </p>
    );

  return (
    <>
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel title="School year">
          <form
            onSubmit={(event) =>
              submit('/structure/school-years', form(event, ['name', 'startsOn', 'endsOn']), event)
            }
            className="space-y-3"
          >
            <Field label="Name" name="name" placeholder="2026–2027" />
            <Field label="Starts" name="startsOn" type="date" />
            <Field label="Ends" name="endsOn" type="date" />
            <Save label="Create school year" />
          </form>
        </Panel>
        <Panel title="Subject">
          <form
            onSubmit={(event) =>
              submit('/structure/subjects', form(event, ['code', 'name']), event)
            }
            className="space-y-3"
          >
            <Field label="Code" name="code" placeholder="MATH-7" />
            <Field label="Name" name="name" placeholder="Mathematics" />
            <Save label="Create subject" />
          </form>
        </Panel>
        <Panel title="Class">
          <form
            onSubmit={(event) =>
              submit(
                '/structure/classes',
                form(event, ['schoolYearId', 'name', 'gradeLevel']),
                event,
              )
            }
            className="space-y-3"
          >
            <Select
              label="School year"
              name="schoolYearId"
              options={overview.schoolYears}
              empty="Select a school year"
            />
            <Field label="Class name" name="name" placeholder="Grade 7 – Sapphire" />
            <Field label="Grade level" name="gradeLevel" placeholder="Grade 7" required={false} />
            <Save label="Create class" />
          </form>
        </Panel>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <Panel title="Invite a school user">
          <form onSubmit={invite} className="space-y-3">
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="family@example.test"
            />
            <label className="block text-sm font-semibold text-slate-700">
              Role
              <select
                name="role"
                required
                className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="PARENT">Parent</option>
                <option value="GUIDANCE">Guidance</option>
                <option value="SCHOOL_ADMIN">School administrator</option>
              </select>
            </label>
            <Field
              label="Expires on (optional)"
              name="expiresAt"
              type="datetime-local"
              required={false}
            />
            <Save label="Create invitation" />
          </form>
          {inviteCode && (
            <div className="mt-4 rounded-xl bg-[#fff8e5] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a5d00]">
                One-time activation code
              </p>
              <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-slate-700">
                {inviteCode}
              </code>
            </div>
          )}
        </Panel>
        <section className="app-card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-[#092d83]">School user accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Deactivate access without changing a person’s role from the browser.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8faff] text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Account action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-t border-slate-100">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{member.user.displayName}</p>
                      <p className="text-xs text-slate-500">{member.user.email}</p>
                    </td>
                    <td className="px-5 py-3">{member.role.code.replace('_', ' ')}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`status-pill ${member.isActive && member.user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {member.isActive && member.user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          setAccountStatus(
                            member.userId,
                            member.user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          )
                        }
                        className="brand-focus rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#092d83]"
                      >
                        {member.user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!members.length && (
            <p className="p-5 text-sm text-slate-500">
              No invited users have activated accounts yet.
            </p>
          )}
        </section>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <ProfilePanel
          title="Student profile"
          role="STUDENT"
          members={unprofiled.STUDENT}
          field="studentNumber"
          onSubmit={submit}
        />
        <ProfilePanel
          title="Teacher profile"
          role="TEACHER"
          members={unprofiled.TEACHER}
          field="employeeNumber"
          onSubmit={submit}
        />
        <ProfilePanel
          title="Parent profile"
          role="PARENT"
          members={unprofiled.PARENT}
          onSubmit={submit}
        />
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel title="Enroll a student">
          <form
            onSubmit={(event) =>
              submit(
                '/structure/enrollments',
                form(event, ['schoolYearId', 'classId', 'studentProfileId']),
                event,
              )
            }
            className="space-y-3"
          >
            <Select
              label="School year"
              name="schoolYearId"
              options={overview.schoolYears}
              empty="Select a school year"
            />
            <Select
              label="Class"
              name="classId"
              options={overview.classes}
              empty="Select a class"
              render={(item) => `${item.name} — ${item.schoolYear.name}`}
            />
            <Select
              label="Student"
              name="studentProfileId"
              options={overview.students}
              empty="Select a student"
              render={name}
            />
            <Save
              label="Enroll student"
              disabled={!overview.students.length || !overview.classes.length}
            />
          </form>
        </Panel>
        <Panel title="Assign a teacher">
          <form
            onSubmit={(event) =>
              submit(
                '/structure/assignments',
                form(event, ['classId', 'subjectId', 'teacherProfileId']),
                event,
              )
            }
            className="space-y-3"
          >
            <Select
              label="Class"
              name="classId"
              options={overview.classes}
              empty="Select a class"
              render={(item) => item.name}
            />
            <Select
              label="Subject"
              name="subjectId"
              options={overview.subjects}
              empty="Select a subject"
              render={(item) => `${item.code} — ${item.name}`}
            />
            <Select
              label="Teacher"
              name="teacherProfileId"
              options={overview.teachers}
              empty="Select a teacher"
              render={name}
            />
            <Save
              label="Assign teacher"
              disabled={!overview.teachers.length || !overview.classes.length}
            />
          </form>
        </Panel>
        <Panel title="Link a parent and student">
          <form
            onSubmit={(event) =>
              submit(
                '/structure/parent-links',
                form(event, ['parentProfileId', 'studentProfileId']),
                event,
              )
            }
            className="space-y-3"
          >
            <Select
              label="Parent"
              name="parentProfileId"
              options={overview.parents}
              empty="Select a parent"
              render={name}
            />
            <Select
              label="Student"
              name="studentProfileId"
              options={overview.students}
              empty="Select a student"
              render={name}
            />
            <p className="text-xs leading-5 text-slate-500">
              This creates an approved, auditable family link.
            </p>
            <Save
              label="Approve parent link"
              disabled={!overview.parents.length || !overview.students.length}
            />
          </form>
        </Panel>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <RecordTable
          title="Classes"
          headers={['Class', 'Year', 'Grade']}
          rows={overview.classes.map((item) => [
            item.name,
            item.schoolYear.name,
            item.gradeLevel || '—',
          ])}
        />
        <RecordTable
          title="Subjects"
          headers={['Code', 'Name']}
          rows={overview.subjects.map((item) => [item.code, item.name])}
        />
        <RecordTable
          title="Enrollments"
          headers={['Student', 'Class', 'Year']}
          rows={overview.enrollments.map((item) => [
            name(item.student),
            item.class.name,
            item.schoolYear.name,
          ])}
        />
        <RecordTable
          title="Teacher assignments"
          headers={['Teacher', 'Class', 'Subject']}
          rows={overview.teacherAssignments.map((item) => [
            name(item.teacher),
            item.class.name,
            item.subject.name,
          ])}
        />
        <RecordTable
          title="Approved family links"
          headers={['Parent', 'Student', 'Status']}
          rows={overview.parentLinks.map((item) => [
            name(item.parent),
            name(item.student),
            item.status,
          ])}
        />
        <RecordTable
          title="Profiles"
          headers={['Role', 'Name', 'Identifier']}
          rows={[
            ...overview.students.map((item) => ['Student', name(item), item.studentNumber || '—']),
            ...overview.teachers.map((item) => ['Teacher', name(item), item.employeeNumber || '—']),
            ...overview.parents.map((item) => ['Parent', name(item), '—']),
          ]}
        />
      </section>
    </>
  );
}

function form(event: FormEvent<HTMLFormElement>, keys: string[]) {
  const data = new FormData(event.currentTarget);
  return Object.fromEntries(keys.map((key) => [key, data.get(key) || undefined]));
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="app-card min-w-0 p-5">
      <h2 className="text-lg font-bold text-[#092d83]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
      />
    </label>
  );
}
function Select<T extends { id: string }>({
  label,
  name,
  options,
  empty,
  render = (item: T) => (item as { name?: string }).name || item.id,
}: {
  label: string;
  name: string;
  options: T[];
  empty: string;
  render?: (item: T) => string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        required
        className="brand-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
      >
        <option value="">{empty}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {render(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Save({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="brand-button brand-focus w-full rounded-xl p-3 text-sm font-bold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
function ProfilePanel({
  title,
  role,
  members,
  field,
  onSubmit,
}: {
  title: string;
  role: string;
  members: UserMembership[];
  field?: string;
  onSubmit: (
    path: string,
    data: Record<string, unknown>,
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
}) {
  const path =
    role === 'STUDENT'
      ? '/structure/profiles/student'
      : role === 'TEACHER'
        ? '/structure/profiles/teacher'
        : '/structure/profiles/parent';
  return (
    <Panel title={title}>
      <form
        onSubmit={(event) =>
          onSubmit(path, form(event, ['userId', ...(field ? [field] : [])]), event)
        }
        className="space-y-3"
      >
        <Select
          label="Invited user"
          name="userId"
          options={members.map((member) => ({
            id: member.userId,
            name: `${member.user.displayName} — ${member.user.email}`,
          }))}
          empty={members.length ? 'Select a user' : `No unprofiled ${role.toLowerCase()} users`}
        />
        {field && (
          <Field
            label={field === 'studentNumber' ? 'Student number' : 'Employee number'}
            name={field}
            required={false}
          />
        )}
        <Save label={`Create ${role.toLowerCase()} profile`} disabled={!members.length} />
      </form>
    </Panel>
  );
}
function RecordTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h2 className="font-bold text-[#092d83]">{title}</h2>
        <span className="status-pill bg-[#e8efff] text-[#092d83]">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8faff] text-slate-600">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-5 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, index) => (
              <tr key={`${row.join('-')}-${index}`} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-3 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 100 && (
        <p className="border-t p-4 text-sm text-slate-500">Showing the first 100 records.</p>
      )}
      {!rows.length && <p className="p-5 text-sm text-slate-500">No records yet.</p>}
    </section>
  );
}
