import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

import { CurrentStatus } from '../../../core/models/reading.model';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonIcon, NgClass],
  templateUrl: './status-card.component.html',
  styleUrl: './status-card.component.scss'
})
export class StatusCardComponent {
  @Input({ required: true }) current!: CurrentStatus;

  statusLabel(): string {
    const labels = {
      normal: 'NORMAL',
      warning: 'ADVERTENCIA',
      alarm: 'ALARMA'
    };

    return labels[this.current.status];
  }

  deviceLabel(): string {
    const labels = {
      connected: 'Conectado',
      disconnected: 'Desconectado',
      error: 'Fallo de comunicación'
    };

    return labels[this.current.deviceStatus];
  }

  iconName(): string {
    if (this.current.status === 'alarm') {
      return 'flame-outline';
    }

    if (this.current.status === 'warning') {
      return 'warning-outline';
    }

    return 'shield-checkmark-outline';
  }
}
