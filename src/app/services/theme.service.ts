import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  theme = signal<'light' | 'dark' | 'pro'>(
    (localStorage.getItem('themePreference') as 'light' | 'dark' | 'pro') || 'dark'
  );

  setTheme(theme: 'light' | 'dark' | 'pro') {
    this.theme.set(theme);
    localStorage.setItem('themePreference', theme);
    document.body.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('pro-theme', theme === 'pro');
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : (this.theme() === 'dark' ? 'pro' : 'light');
    this.setTheme(nextTheme);
  }
}