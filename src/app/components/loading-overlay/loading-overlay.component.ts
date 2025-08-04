import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.css'],
})
export class LoadingOverlayComponent {
  isActive = input<boolean>(false);
  progress = input<number>(0);
  message = input<string>('Processing SQL Query...');
}