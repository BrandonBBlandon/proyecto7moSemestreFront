import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import { SmokeMonitoringApiService } from '../../core/services/smoke-monitoring-api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPage {
  apiUrl = this.api.getApiUrl();
  refreshSeconds = Number(localStorage.getItem('smoke_refresh_ms') || 5000) / 1000;
  ssid = '';
  wifiPassword = '';
  checking = false;
  savingWifi = false;
  backendStatus = 'Sin verificar';
  backendOk: boolean | null = null;
  message = '';

  constructor(private readonly api: SmokeMonitoringApiService) {}

  saveGeneral(): void {
    this.api.setApiUrl(this.apiUrl);
    const intervalMs = Math.max(Number(this.refreshSeconds || 5), 1) * 1000;
    localStorage.setItem('smoke_refresh_ms', String(intervalMs));
    this.message = 'Configuración guardada.';
  }

  checkConnection(): void {
    this.saveGeneral();
    this.checking = true;
    this.backendStatus = 'Verificando...';
    this.backendOk = null;
    this.message = '';

    this.api.checkHealth().subscribe({
      next: (response) => {
        this.checking = false;
        this.backendOk = response.ok;
        this.backendStatus = response.ok ? 'Backend conectado' : 'Backend sin respuesta válida';
      },
      error: (error: Error) => {
        this.checking = false;
        this.backendOk = false;
        this.backendStatus = error.message || 'No hay comunicación con el backend.';
      }
    });
  }

  saveWifi(): void {
    if (!this.ssid.trim()) {
      this.message = 'Ingresa el SSID de la red.';
      return;
    }

    this.savingWifi = true;
    this.message = '';
    this.api.saveWifiConfig(this.ssid, this.wifiPassword).subscribe({
      next: (response) => {
        this.savingWifi = false;
        this.message = response.message || (response.success ? 'Configuración Wi-Fi guardada.' : 'No se pudo guardar Wi-Fi.');
      },
      error: (error: Error) => {
        this.savingWifi = false;
        this.message = error.message || 'No se pudo guardar la configuración Wi-Fi.';
      }
    });
  }
}
