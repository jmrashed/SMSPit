import { useOrg } from '../context/OrgContext';
import './OrgSwitcher.css';

export function OrgSwitcher() {
  const { organizations, loading, selectedOrgId, setSelectedOrgId } = useOrg();

  if (loading || organizations.length === 0) {
    return null;
  }

  return (
    <select
      className="org-switcher"
      aria-label="Organization"
      value={selectedOrgId ?? ''}
      onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
