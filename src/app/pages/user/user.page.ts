import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
  templateUrl: './user.page.html',
  styleUrl: './user.page.scss'
})
export class UserPage {
  user: User | null = this.auth.getUser();

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
