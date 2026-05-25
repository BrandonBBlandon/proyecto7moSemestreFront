import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

import { Reading } from '../../../core/models/reading.model';

@Component({
  selector: 'app-reading-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonIcon, NgClass],
  templateUrl: './reading-card.component.html',
  styleUrl: './reading-card.component.scss'
})
export class ReadingCardComponent {
  @Input({ required: true }) reading!: Reading;

  label(): string {
    if (this.reading.status === 'alarm') {
      return 'Alarma';
    }

    if (this.reading.status === 'warning') {
      return 'Advertencia';
    }

    return 'Normal';
  }

  iconName(): string {
    return this.reading.status === 'normal' ? 'checkmark-circle-outline' : 'alert-circle-outline';
  }
}
