import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Organization } from '../types/organization';
import { listOrganizations } from '../api/organizations';

const STORAGE_KEY = 'smspit_selected_org_id';

interface OrgContextValue {
  organizations: Organization[];
  loading: boolean;
  selectedOrgId: number | null;
  setSelectedOrgId: (id: number | null) => void;
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

  useEffect(() => {
    let cancelled = false;

    listOrganizations()
      .then((response) => {
        if (cancelled) return;
        setOrganizations(response.organizations);
        setLoading(false);

        // The previously-selected org may no longer exist/be a member
        // of -- fall back to the first available one, or none.
        const stored = readStoredOrgId();
        const stillValid = stored !== null && response.organizations.some((org) => org.id === stored);
        if (!stillValid) {
          setSelectedOrgIdState(response.organizations[0]?.id ?? null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load organizations', err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function setSelectedOrgId(id: number | null) {
    setSelectedOrgIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  return (
    <OrgContext.Provider value={{ organizations, loading, selectedOrgId, setSelectedOrgId }}>
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
