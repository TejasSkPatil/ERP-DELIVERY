export type ActivityAction = 'LOGIN' | 'LOGOUT' | 'SIGNUP';

export interface ActivityItem {
  id: string;
  action: ActivityAction;
  userName: string;
  userRole: 'ADMIN' | 'DELIVERY_PERSON';
  description: string;
  timestamp: string;
  ip?: string;
}
