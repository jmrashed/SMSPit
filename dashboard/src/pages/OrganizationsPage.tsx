import { useEffect, useState, type FormEvent } from 'react';
import type { Team } from '../types/organization';
import {
  createOrganization,
  createTeam,
  deleteOrganization,
  listTeams,
  updateOrganization,
} from '../api/organizations';
import { useOrg } from '../context/OrgContext';
import { TeamCard } from '../components/TeamCard';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

const NAME_MAX_LENGTH = 255;

const inputClasses =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function OrganizationsPage() {
  const { organizations, loading: loadingOrgs, selectedOrgId, refetch } = useOrg();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null;
  const isAdmin = selectedOrg?.role === 'admin';

  // Re-fetches whenever the switcher changes selectedOrgId -- the whole
  // point of Day 60's "refetch data on org switch" requirement.
  useEffect(() => {
    if (selectedOrgId === null) {
      setTeams([]);
      setLoadingTeams(false);
      return;
    }

    let cancelled = false;
    setLoadingTeams(true);
    setError(false);

    listTeams(selectedOrgId)
      .then((response) => {
        if (cancelled) return;
        setTeams(response.teams);
        setLoadingTeams(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load teams', err);
        setError(true);
        setLoadingTeams(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrgId, retryToken]);

  function handleTeamUpdated(updated: Team) {
    setTeams((current) => current.map((team) => (team.id === updated.id ? updated : team)));
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Organizations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Switch organizations and manage their teams.</p>
      </header>

      {loadingOrgs && <Spinner label="Loading organizations…" />}

      {!loadingOrgs && organizations.length === 0 && <CreateOrganizationForm onCreated={(id) => refetch(id)} />}

      {!loadingOrgs && organizations.length > 0 && selectedOrg && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedOrg.name}</h2>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Role: {selectedOrg.role}
            </span>
            <div className="ml-auto flex gap-2">
              <NewOrganizationButton onCreated={(id) => refetch(id)} />
              {isAdmin && (
                <EditOrganizationControls
                  // Forces a remount (resetting the form's local `name`
                  // state) whenever the selected org changes, so an
                  // edit form left open across a switch can't submit
                  // stale text against the new org's id.
                  key={selectedOrg.id}
                  organization={selectedOrg}
                  onSaved={() => refetch(selectedOrg.id)}
                />
              )}
            </div>
          </div>

          {isAdmin && (
            <DeleteOrganizationControl
              key={selectedOrg.id}
              organization={selectedOrg}
              // No selectId: let refetch fall back to whatever org is
              // next available (or null if that was the last one),
              // rather than force-nulling the selection while other
              // orgs the user belongs to still exist.
              onDeleted={() => refetch()}
            />
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Teams</h2>
            </div>

            {isAdmin && (
              <CreateTeamForm
                organizationId={selectedOrg.id}
                onCreated={(team) => setTeams((current) => [...current, team])}
              />
            )}

            {loadingTeams && <Spinner label="Loading teams…" />}

            {error && <ErrorBanner message="Couldn't load teams." onRetry={() => setRetryToken((t) => t + 1)} />}

            {!loadingTeams && !error && (
              <ul className="flex flex-col gap-3">
                {teams.length === 0 && <li className="text-sm text-slate-500 dark:text-slate-400">No teams yet.</li>}
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    organizationId={selectedOrg.id}
                    team={team}
                    isAdmin={isAdmin}
                    onTeamUpdated={handleTeamUpdated}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CreateOrganizationForm({ onCreated }: { onCreated: (id: number) => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > NAME_MAX_LENGTH) {
      showToast(`Enter a name up to ${NAME_MAX_LENGTH} characters.`, 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createOrganization({ name: trimmed });
      onCreated(created.id);
      setName('');
      showToast('Organization created.', 'success');
    } catch (err: unknown) {
      console.error('Failed to create organization', err);
      showToast('Failed to create organization.', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        You're not a member of any organization yet. Create one to get started.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          aria-label="Organization name"
          className={`flex-1 ${inputClasses}`}
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
        >
          {creating ? 'Creating…' : 'Create organization'}
        </button>
      </form>
    </div>
  );
}

function NewOrganizationButton({ onCreated }: { onCreated: (id: number) => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > NAME_MAX_LENGTH) {
      showToast(`Enter a name up to ${NAME_MAX_LENGTH} characters.`, 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createOrganization({ name: trimmed });
      onCreated(created.id);
      setName('');
      setOpen(false);
      showToast('Organization created.', 'success');
    } catch (err: unknown) {
      console.error('Failed to create organization', err);
      showToast('Failed to create organization.', 'error');
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        + New organization
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Organization name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={NAME_MAX_LENGTH}
        aria-label="New organization name"
        autoFocus
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={creating}
        className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
      >
        {creating ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
    </form>
  );
}

function EditOrganizationControls({
  organization,
  onSaved,
}: {
  organization: { id: number; name: string };
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(organization.name);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > NAME_MAX_LENGTH) {
      showToast(`Enter a name up to ${NAME_MAX_LENGTH} characters.`, 'error');
      return;
    }

    setSaving(true);
    try {
      await updateOrganization(organization.id, { name: trimmed });
      onSaved();
      setOpen(false);
      showToast('Organization updated.', 'success');
    } catch (err: unknown) {
      console.error('Failed to update organization', err);
      showToast('Failed to update organization.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(organization.name);
          setOpen(true);
        }}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={NAME_MAX_LENGTH}
        aria-label="Organization name"
        autoFocus
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
    </form>
  );
}

function DeleteOrganizationControl({
  organization,
  onDeleted,
}: {
  organization: { id: number; name: string };
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteOrganization(organization.id);
      showToast('Organization deleted.', 'success');
      setOpen(false);
      setConfirmText('');
      onDeleted();
    } catch (err: unknown) {
      console.error('Failed to delete organization', err);
      showToast('Failed to delete organization.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete organization
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm text-red-900 dark:text-red-300">
        This permanently deletes <strong>{organization.name}</strong> and its teams, API keys, and messages. Type the
        organization name to confirm.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={organization.name}
          aria-label="Type the organization name to confirm deletion"
          className={inputClasses}
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || confirmText !== organization.name}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmText('');
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CreateTeamForm({
  organizationId,
  onCreated,
}: {
  organizationId: number;
  onCreated: (team: Team) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > NAME_MAX_LENGTH) {
      showToast(`Enter a name up to ${NAME_MAX_LENGTH} characters.`, 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createTeam(organizationId, { name: trimmed });
      onCreated(created);
      setName('');
      showToast('Team created.', 'success');
    } catch (err: unknown) {
      console.error('Failed to create team', err);
      showToast('Failed to create team.', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={NAME_MAX_LENGTH}
        aria-label="New team name"
        className={`flex-1 ${inputClasses}`}
      />
      <button
        type="submit"
        disabled={creating}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {creating ? 'Creating…' : '+ New team'}
      </button>
    </form>
  );
}
