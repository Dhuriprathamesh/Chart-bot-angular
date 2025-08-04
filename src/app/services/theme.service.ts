import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  theme = signal<'light' | 'dark'>(
    localStorage.getItem('themePreference') === 'light' ? 'light' : 'dark',
  );

  toggleTheme(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
    localStorage.setItem('themePreference', this.theme());
    document.body.classList.toggle('light-theme', this.theme() === 'light');
  }
}