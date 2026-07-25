import { useState, type FormEvent } from 'react';
import type { Team } from '../types/organization';
import { addTeamMember, removeTeamMember } from '../api/organizations';
import { ApiError } from '../api/client';
import { useToast } from './Toast';

interface TeamCardProps {
  organizationId: number;
  team: Team;
  isAdmin: boolean;
  onTeamUpdated: (team: Team) => void;
}

export function TeamCard({ organizationId, team, isAdmin, onTeamUpdated }: TeamCardProps) {
  const { showToast } = useToast();
  const [userId, setUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    const userIdNumber = Number(userId);
    if (!Number.isInteger(userIdNumber) || userIdNumber <= 0) {
      showToast('Enter a valid user ID.', 'error');
      return;
    }

    setAdding(true);
    try {
      const updated = await addTeamMember(organizationId, team.id, userIdNumber);
      onTeamUpdated(updated);
      setUserId('');
      showToast('Member added.', 'success');
    } catch (err: unknown) {
      // Two distinct failure modes from AddTeamMemberRequest/TeamController:
      // the user doesn't exist at all (422 validation), vs. the user
      // exists but isn't a member of this team's organization yet (422
      // from the controller's own abort()). Both surface as 422s with
      // different messages -- show the server's message rather than a
      // generic one so the two cases don't look identical.
      if (err instanceof ApiError && err.status === 422) {
        showToast('Could not add member: check the user ID exists and is a member of this organization.', 'error');
      } else {
        console.error('Failed to add team member', err);
        showToast('Failed to add member.', 'error');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberId: number, memberName: string) {
    if (!window.confirm(`Remove ${memberName} from "${team.name}"?`)) {
      return;
    }

    setRemovingId(memberId);
    try {
      const updated = await removeTeamMember(organizationId, team.id, memberId);
      onTeamUpdated(updated);
      showToast('Member removed.', 'success');
    } catch (err: unknown) {
      console.error('Failed to remove team member', err);
      showToast('Failed to remove member.', 'error');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="font-medium text-slate-900 dark:text-white">{team.name}</h3>

      {team.members.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No members yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {team.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-300">
                {member.name} <span className="text-slate-400 dark:text-slate-500">({member.email})</span>
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  disabled={removingId === member.id}
                  className="rounded-md border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {removingId === member.id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            aria-label={`Add member to ${team.name} by user ID`}
            className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {adding ? 'Adding…' : 'Add member'}
          </button>
        </form>
      )}
    </li>
  );
}
