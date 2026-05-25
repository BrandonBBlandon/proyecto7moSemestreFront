import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() icon = 'document-text-outline';
  @Input() title = 'Sin datos';
  @Input() message = 'No hay información disponible.';
}
