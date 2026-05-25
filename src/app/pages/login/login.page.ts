import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonInput, IonItem, IonLabel, IonSpinner],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Ingresa usuario y contraseña.';
      return;
    }

    this.loading = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message || 'No se pudo iniciar sesión.';
      }
    });
  }
}
