import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';

@Component({
  selector: 'app-main-tabs',
  standalone: true,
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
  templateUrl: './main-tabs.page.html'
})
export class MainTabsPage {}
