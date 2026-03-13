export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  field?: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  paper_count?: number;
}
