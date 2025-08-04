import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Toast {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent {
  toast = signal<Toast | null>(null);

  show(message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.hide(), 4000);
  }

  hide(): void {
    this.toast.set(null);
  }
}