import { useOrg } from '../context/OrgContext';

export function OrgSwitcher() {
  const { organizations, loading, selectedOrgId, setSelectedOrgId } = useOrg();

  if (loading || organizations.length === 0) {
    return null;
  }

  return (
    <select
      aria-label="Organization"
      value={selectedOrgId ?? ''}
      onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
