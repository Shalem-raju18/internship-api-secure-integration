export interface Internship {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  type: 'Remote' | 'Hybrid' | 'On-site';
  category: 'Software Engineering' | 'Data Science' | 'Product Design' | 'Marketing' | 'DevOps' | 'Cybersecurity';
  stipend: string;
  deadline: string;
  description: string;
  requirements: string[]; // parsed from JSON string in DB
  created_at?: string;
}

export interface Application {
  id: string;
  internship_id: string;
  name: string;
  email: string;
  message: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  created_at: string;
  internship_title?: string;
  company?: string;
}

export interface ApplicationInput {
  internship_id: string;
  name: string;
  email: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
