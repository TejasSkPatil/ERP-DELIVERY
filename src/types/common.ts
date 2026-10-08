export interface NavItem {
  id: string;
  label: string;
  path: string;
  active?: boolean;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}
