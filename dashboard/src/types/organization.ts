export interface Organization {
  id: number;
  name: string;
  slug: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
}

export interface Team {
  id: number;
  organization_id: number;
  name: string;
  members: TeamMember[];
  created_at: string;
}
