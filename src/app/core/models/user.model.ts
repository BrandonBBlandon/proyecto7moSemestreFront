export interface User {
  id: number;
  username: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
}
