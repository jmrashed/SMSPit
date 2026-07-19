export interface Template {
  id: number;
  name: string;
  body: string;
  variables: string[];
  org_id: number | null;
  created_at: string;
  updated_at: string;
}
