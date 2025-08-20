import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<Toast | null>(null);
  toast$ = this.toastSubject.asObservable();

  show(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    this.toastSubject.next({ message, type });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      this.hide();
    }, 4000);
  }

  hide(): void {
    this.toastSubject.next(null);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  info(message: string): void {
    this.show(message, 'info');
  }
} 