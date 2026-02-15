export type ProfileRole = "admin" | "chef" | "staff";

export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Review Pending"
  | "Completed";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  role: ProfileRole;
  hire_date: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  department: string | null;
  temporary_password?: string | null;
  temp_password_expires_at?: string | null;
  is_password_forced_change?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigner_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  wiki_article_id?: string | null;
  revision_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  department: string | null;
  lead_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  team_id: string;
  profile_id: string;
}

export interface TaskAssignment {
  task_id: string;
  profile_id: string;
}

export interface TaskWatcher {
  task_id: string;
  profile_id: string;
}

export type WikiCategory = "Network" | "Server" | "Software" | "Electrical";

export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category: WikiCategory;
  author_id: string;
  media_urls: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ApiConfiguration {
  key_name: string;
  key_value: string;
  is_secret: boolean;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      api_configurations: {
        Row: ApiConfiguration;
        Insert: Omit<ApiConfiguration, "updated_at"> & { updated_at?: string };
        Update: Partial<Omit<ApiConfiguration, "key_name">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id"> & { id?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id"> & { id?: string };
        Update: Partial<Omit<Task, "id">>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, "id"> & { id?: string };
        Update: Partial<Omit<Team, "id">>;
      };
      team_members: { Row: TeamMember; Insert: TeamMember; Update: Partial<TeamMember> };
      task_assignments: { Row: TaskAssignment; Insert: TaskAssignment; Update: Partial<TaskAssignment> };
      task_watchers: { Row: TaskWatcher; Insert: TaskWatcher; Update: Partial<TaskWatcher> };
      wiki_articles: {
        Row: WikiArticle;
        Insert: Omit<WikiArticle, "id"> & { id?: string };
        Update: Partial<Omit<WikiArticle, "id">>;
      };
    };
  };
}
