import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Organization } from '../types/organization';
import { listOrganizations } from '../api/organizations';

const STORAGE_KEY = 'smspit_selected_org_id';

interface OrgContextValue {
  organizations: Organization[];
  loading: boolean;
  selectedOrgId: number | null;
  setSelectedOrgId: (id: number | null) => void;
  // Re-fetches the org list -- needed after any create/update/delete
  // mutation (Day 101), since the initial fetch only ever runs once on
  // mount. `selectId` lets a caller pin the selection to a specific org
  // (e.g. the one just created) instead of falling back to "first in
  // the list", which isn't necessarily the new one.
  refetch: (selectId?: number | null) => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

function readStoredOrgId(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : null;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgIdState] = useState<number | null>(readStoredOrgId);

  function setSelectedOrgId(id: number | null) {
    setSelectedOrgIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  async function refetch(selectId?: number | null): Promise<void> {
    setLoading(true);
    try {
      const response = await listOrganizations();
      setOrganizations(response.organizations);

      if (selectId !== undefined) {
        setSelectedOrgId(selectId !== null && response.organizations.some((org) => org.id === selectId) ? selectId : null);
        return;
      }

      // The previously-selected org may no longer exist/be a member
      // of -- fall back to the first available one, or none.
      const stored = readStoredOrgId();
      const stillValid = stored !== null && response.organizations.some((org) => org.id === stored);
      if (!stillValid) {
        setSelectedOrgId(response.organizations[0]?.id ?? null);
      }
    } catch (err: unknown) {
      console.error('Failed to load organizations', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, []);

  return (
    <OrgContext.Provider value={{ organizations, loading, selectedOrgId, setSelectedOrgId, refetch }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
