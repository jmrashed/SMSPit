import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../types/organization';
import { listTeams } from '../api/organizations';
import { useOrg } from '../context/OrgContext';
import { OrgSwitcher } from '../components/OrgSwitcher';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import './OrganizationsPage.css';

export function OrganizationsPage() {
  const { organizations, loading: loadingOrgs, selectedOrgId } = useOrg();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null;

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

  return (
    <main className="organizations-page">
      <Link to="/" className="organizations-page__back">
        ← Back to inbox
      </Link>
      <header className="organizations-page__header">
        <h1>Organizations</h1>
        <p>Switch organizations and see their teams.</p>
      </header>

      {loadingOrgs && <Spinner label="Loading organizations…" />}

      {!loadingOrgs && organizations.length === 0 && (
        <p className="organizations-page__empty">
          You're not a member of any organization yet. Create one via <code>POST /api/organizations</code>.
        </p>
      )}

      {!loadingOrgs && organizations.length > 0 && (
        <>
          <div className="organizations-page__switcher-row">
            <OrgSwitcher />
            {selectedOrg && <span className="organizations-page__role">Role: {selectedOrg.role}</span>}
          </div>

          {loadingTeams && <Spinner label="Loading teams…" />}

          {error && <ErrorBanner message="Couldn't load teams." onRetry={() => setRetryToken((t) => t + 1)} />}

          {!loadingTeams && !error && (
            <ul className="organizations-page__teams">
              {teams.length === 0 && <li className="organizations-page__empty">No teams yet.</li>}
              {teams.map((team) => (
                <li key={team.id} className="organizations-page__team">
                  <h3>{team.name}</h3>
                  <p className="organizations-page__members">
                    {team.members.length === 0
                      ? 'No members yet.'
                      : team.members.map((member) => member.name).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
