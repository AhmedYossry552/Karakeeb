import { Component, signal } from '@angular/core';
import { LayoutWrapperComponent } from './shared/components/layout-wrapper/layout-wrapper';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LayoutWrapperComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('recycling-system-angular');
}
