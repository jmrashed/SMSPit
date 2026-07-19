export interface ApiKey {
  id: number;
  name: string;
  // The lookup-only identifier (e.g. "sms_live_ab12cd34") in list/revoke
  // responses; the full plaintext "lookup.secret" key in the create
  // response only, shown once and never retrievable again.
  key: string;
  owner_id: number;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
