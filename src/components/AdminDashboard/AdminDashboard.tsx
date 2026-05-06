import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AcademyGroup, AppUser, Assignment, UserRole } from '../../domain/network/types';
import { readAssignments, readGroups, readUsers, writeAssignments, writeGroups, writeUsers } from '../../utils/storage';

type AdminTab = 'users' | 'groups' | 'assignments';

export function AdminDashboard() {
  const [users, setUsers] = useState(readUsers);
  const [groups, setGroups] = useState(readGroups);
  const [assignments, setAssignments] = useState(readAssignments);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingGroup, setEditingGroup] = useState<AcademyGroup | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.users(), adminApi.groups(), adminApi.assignments()])
      .then(([apiUsers, apiGroups, apiAssignments]: any[]) => {
        setUsers(apiUsers.map(mapApiUserToLocal));
        setGroups(apiGroups.map(mapApiGroupToLocal));
        setAssignments(apiAssignments.map(mapApiAssignmentToLocal));
        setApiError('');
      })
      .catch(() => setApiError('Backend недоступен: админка временно работает с локальными mock-данными.'));
  }, []);

  function saveUsers(next: AppUser[]) {
    setUsers(next);
    writeUsers(next);
  }

  function saveGroups(next: AcademyGroup[]) {
    setGroups(next);
    writeGroups(next);
  }

  function saveAssignments(next: Assignment[]) {
    setAssignments(next);
    writeAssignments(next);
  }

  const filteredUsers = users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <div className="admin-panel">
      <nav className="tabs">
        <button className={activeTab === 'users' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('users')}>Пользователи</button>
        <button className={activeTab === 'groups' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('groups')}>Группы</button>
        <button className={activeTab === 'assignments' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('assignments')}>Задания</button>
      </nav>

      {activeTab === 'users' ? (
        <section className="panel">
          <div className="panel__header panel__header--stacked">
            <div><h2>Пользователи</h2><p>Создание студентов, учителей и администраторов хранится в локальном хранилище браузера.</p></div>
            <div className="table-actions">
              <input placeholder="Поиск по ФИО/email" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}>
                <option value="all">Все роли</option><option value="student">Студент</option><option value="teacher">Учитель</option><option value="admin">Админ</option>
              </select>
              <button className="button button--primary" type="button" onClick={() => setEditingUser(emptyUser(groups[0]?.id))}>Добавить пользователя</button>
            </div>
          </div>
          {apiError ? <p className="form-error">{apiError}</p> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Группа</th><th>Статус</th><th></th></tr></thead>
              <tbody>{filteredUsers.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{roleLabel(user.role)}</td><td>{groupLabel(user, groups)}</td><td>{user.status === 'active' ? 'Активен' : 'Неактивен'}</td><td><button className="button button--ghost" type="button" onClick={() => setEditingUser(user)}>Редактировать</button><button className="button button--ghost danger" type="button" onClick={async () => { try { if (/^\d+$/.test(user.id)) await adminApi.deleteUser(user.id); setApiError(''); } catch { setApiError('Не удалось удалить пользователя на backend, удаление выполнено только локально.'); } saveUsers(users.filter((item) => item.id !== user.id)); }}>Удалить</button></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'groups' ? (
        <section className="panel">
          <div className="panel__header"><h2>Группы</h2><button className="button button--primary" type="button" onClick={() => setEditingGroup({ id: crypto.randomUUID(), title: 'Новая группа', teacherId: users.find((user) => user.role === 'teacher')?.id })}>Добавить группу</button></div>
          <div className="table-wrap">
            <table><thead><tr><th>Название группы</th><th>Учитель группы</th><th>Количество студентов</th><th></th></tr></thead><tbody>{groups.map((group) => <tr key={group.id}><td>{group.title}</td><td>{users.find((user) => user.id === group.teacherId)?.name ?? 'Не назначен'}</td><td>{users.filter((user) => user.groupId === group.id).length}</td><td><button className="button button--ghost" type="button" onClick={() => setEditingGroup(group)}>Редактировать группу</button></td></tr>)}</tbody></table>
          </div>
        </section>
      ) : null}

      {activeTab === 'assignments' ? (
        <section className="panel">
          <div className="panel__header"><h2>Задания</h2><button className="button button--primary" type="button" onClick={() => setEditingAssignment({ id: crypto.randomUUID(), title: 'Новое задание', description: 'Описание задания', groupId: groups[0]?.id ?? '', status: 'Черновик' })}>Добавить задание</button></div>
          <div className="table-wrap">
            <table><thead><tr><th>Название</th><th>Описание</th><th>Группа</th><th>Статус</th><th></th></tr></thead><tbody>{assignments.map((assignment) => <tr key={assignment.id}><td>{assignment.title}</td><td>{assignment.description}</td><td>{groups.find((group) => group.id === assignment.groupId)?.title}</td><td>{assignment.status}</td><td><button className="button button--ghost" type="button" onClick={() => setEditingAssignment(assignment)}>Редактировать</button></td></tr>)}</tbody></table>
          </div>
        </section>
      ) : null}

      {editingUser ? <UserForm user={editingUser} groups={groups} onCancel={() => setEditingUser(null)} onSave={async (user) => {
        try {
          const payload = toApiUserPayload(user);
          const saved: any = users.some((item) => item.id === user.id) && /^\d+$/.test(user.id)
            ? await adminApi.updateUser(user.id, payload)
            : await adminApi.createUser(payload);
          saveUsers(upsert(users, mapApiUserToLocal(saved)));
          setApiError('');
        } catch (error) {
          setApiError(error instanceof Error ? error.message : 'Не удалось сохранить пользователя на backend.');
          saveUsers(upsert(users, user));
        }
        setEditingUser(null);
      }} /> : null}
      {editingGroup ? <GroupForm group={editingGroup} users={users} onCancel={() => setEditingGroup(null)} onSave={(group) => { saveGroups(upsert(groups, group)); setEditingGroup(null); }} /> : null}
      {editingAssignment ? <AssignmentForm assignment={editingAssignment} groups={groups} onCancel={() => setEditingAssignment(null)} onSave={(assignment) => { saveAssignments(upsert(assignments, assignment)); setEditingAssignment(null); }} /> : null}
    </div>
  );
}

function UserForm({ user, groups, onCancel, onSave }: { user: AppUser; groups: AcademyGroup[]; onCancel: () => void; onSave: (user: AppUser) => void }) {
  const [draft, setDraft] = useState(user);
  return (
    <section className="panel modal-panel">
      <div className="panel__header"><h2>{user.name ? 'Редактировать пользователя' : 'Добавить пользователя'}</h2></div>
      <div className="form-grid">
        <label>ФИО<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Email<input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
        <label>Роль<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}><option value="student">Студент</option><option value="teacher">Учитель</option><option value="admin">Админ</option></select></label>
        <label>Группа<select value={draft.groupId ?? draft.groupIds?.[0] ?? ''} onChange={(event) => setDraft({ ...draft, groupId: event.target.value, groupIds: [event.target.value] })}>{groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
        <label>Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AppUser['status'] })}><option value="active">Активен</option><option value="inactive">Неактивен</option></select></label>
      </div>
      <div className="mock-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Отмена</button><button className="button button--primary" type="button" onClick={() => onSave(draft)}>Сохранить</button></div>
    </section>
  );
}

function GroupForm({ group, users, onCancel, onSave }: { group: AcademyGroup; users: AppUser[]; onCancel: () => void; onSave: (group: AcademyGroup) => void }) {
  const [draft, setDraft] = useState(group);
  return <section className="panel modal-panel"><div className="panel__header"><h2>Редактировать группу</h2></div><div className="form-grid"><label>Название группы<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Учитель<select value={draft.teacherId ?? ''} onChange={(event) => setDraft({ ...draft, teacherId: event.target.value })}>{users.filter((user) => user.role === 'teacher').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label></div><div className="mock-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Отмена</button><button className="button button--primary" type="button" onClick={() => onSave(draft)}>Сохранить</button></div></section>;
}

function AssignmentForm({ assignment, groups, onCancel, onSave }: { assignment: Assignment; groups: AcademyGroup[]; onCancel: () => void; onSave: (assignment: Assignment) => void }) {
  const [draft, setDraft] = useState(assignment);
  return <section className="panel modal-panel"><div className="panel__header"><h2>Редактировать задание</h2></div><div className="form-grid"><label>Название<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Описание<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Группа<select value={draft.groupId} onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}>{groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label><label>Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Assignment['status'] })}><option value="Активно">Активно</option><option value="Черновик">Черновик</option><option value="Архив">Архив</option></select></label></div><div className="mock-actions"><button className="button button--ghost" type="button" onClick={onCancel}>Отмена</button><button className="button button--primary" type="button" onClick={() => onSave(draft)}>Сохранить</button></div></section>;
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  return items.some((candidate) => candidate.id === item.id) ? items.map((candidate) => candidate.id === item.id ? item : candidate) : [...items, item];
}

function emptyUser(groupId?: string): AppUser {
  return { id: crypto.randomUUID(), name: '', email: '', role: 'student', groupId, status: 'active' };
}

function roleLabel(role: UserRole) {
  return role === 'student' ? 'Студент' : role === 'teacher' ? 'Учитель' : 'Админ';
}

function groupLabel(user: AppUser, groups: AcademyGroup[]) {
  if (user.role === 'student') return groups.find((group) => group.id === user.groupId)?.title ?? '-';
  if (user.role === 'teacher') return groups.filter((group) => user.groupIds?.includes(group.id)).map((group) => group.title).join(', ') || '-';
  return '-';
}

function mapApiUserToLocal(user: any): AppUser {
  return {
    id: String(user.id),
    name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
  };
}

function mapApiGroupToLocal(group: any): AcademyGroup {
  return {
    id: String(group.id),
    title: group.title,
    teacherId: group.teacher ? String(group.teacher) : undefined,
  };
}

function mapApiAssignmentToLocal(assignment: any): Assignment {
  return {
    id: String(assignment.id),
    title: assignment.title,
    description: assignment.description,
    groupId: String(assignment.group ?? assignment.group_id ?? ''),
    status: assignment.status === 'active' ? 'Активно' : assignment.status === 'archived' ? 'Архив' : 'Черновик',
  };
}

function toApiUserPayload(user: AppUser) {
  return {
    full_name: user.name,
    email: user.email,
    password: user.password || '12345678',
    role: user.role,
    group_id: user.role === 'student' ? user.groupId : undefined,
    group_ids: user.role === 'teacher' ? user.groupIds ?? (user.groupId ? [user.groupId] : []) : undefined,
    is_active: user.status === 'active',
  };
}
