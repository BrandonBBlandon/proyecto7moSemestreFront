import { Component, Input } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [IonSpinner],
  templateUrl: './loading-state.component.html',
  styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  @Input() message = 'Cargando información...';
}
