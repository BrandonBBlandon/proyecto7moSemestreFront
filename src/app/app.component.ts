import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  barChartOutline,
  calendarNumberOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cloudDoneOutline,
  documentTextOutline,
  flameOutline,
  homeOutline,
  listOutline,
  lockClosedOutline,
  logOutOutline,
  personCircleOutline,
  personOutline,
  radioOutline,
  refreshOutline,
  saveOutline,
  searchOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  speedometerOutline,
  timeOutline,
  warningOutline,
  wifiOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>'
})
export class AppComponent {
  constructor() {
    addIcons({
      alertCircleOutline,
      barChartOutline,
      calendarNumberOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      cloudDoneOutline,
      documentTextOutline,
      flameOutline,
      homeOutline,
      listOutline,
      lockClosedOutline,
      logOutOutline,
      personCircleOutline,
      personOutline,
      radioOutline,
      refreshOutline,
      saveOutline,
      searchOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      speedometerOutline,
      timeOutline,
      warningOutline,
      wifiOutline
    });
  }
}
