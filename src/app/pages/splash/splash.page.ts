import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [IonContent, IonIcon],
  templateUrl: './splash.page.html',
  styleUrl: './splash.page.scss'
})
export class SplashPage implements OnInit {
  fading = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.fading = true;
      setTimeout(() => {
        const target = this.auth.isLoggedIn() ? '/app/dashboard' : '/login';
        void this.router.navigateByUrl(target, { replaceUrl: true });
      }, 450);
    }, 1200);
  }
}
