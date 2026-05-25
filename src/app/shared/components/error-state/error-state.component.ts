import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss'
})
export class ErrorStateComponent {
  @Input() message = 'No se pudo cargar la información.';
  @Output() retry = new EventEmitter<void>();
}
