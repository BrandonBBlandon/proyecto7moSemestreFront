import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';

import { LoginResponse, User } from '../models/user.model';
import { SmokeMonitoringApiService } from './smoke-monitoring-api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionKey = 'smoke_monitoring_session';

  constructor(private readonly api: SmokeMonitoringApiService) {}

  login(username: string, password: string): Observable<User> {
    return this.api.login(username, password).pipe(
      map((response: LoginResponse) => {
        if (!response.success || !response.user) {
          throw new Error('Usuario o contraseña incorrectos.');
        }

        return response.user;
      }),
      catchError((error) => this.localPrototypeLogin(username, password, error)),
      tap((user) => this.saveSession(user))
    );
  }

  logout(): void {
    localStorage.removeItem(this.sessionKey);
  }

  getUser(): User | null {
    const rawSession = localStorage.getItem(this.sessionKey);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as User;
    } catch {
      localStorage.removeItem(this.sessionKey);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getUser() !== null;
  }

  private saveSession(user: User): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(user));
  }

  private localPrototypeLogin(username: string, password: string, originalError: unknown): Observable<User> {
    if (originalError instanceof HttpErrorResponse && originalError.status !== 0 && originalError.status !== 404) {
      return throwError(() => new Error('Usuario o contraseña incorrectos.'));
    }

    const normalizedUser = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (normalizedUser === 'admin' && normalizedPassword === 'admin') {
      return of({
        id: 1,
        username: 'admin',
        name: 'Usuario IoT'
      });
    }

    if (originalError instanceof Error && originalError.message.includes('incorrectos')) {
      return throwError(() => originalError);
    }

    return throwError(() => new Error('No se pudo iniciar sesión. Para el prototipo local usa admin / admin.'));
  }
}
