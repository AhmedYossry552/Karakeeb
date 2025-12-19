import { Injectable, signal, effect } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark' | 'system';
export type ActualTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSignal = signal<Theme>('system');
  private actualThemeSignal = signal<ActualTheme>('light');

  theme = this.themeSignal.asReadonly();
  actualTheme = this.actualThemeSignal.asReadonly();

  constructor(private storage: StorageService) {
    this.initializeTheme();
    this.setupThemeEffect();
  }

  private initializeTheme(): void {
    const storedTheme = this.storage.getItem<Theme>('theme');
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      this.themeSignal.set(storedTheme);
    } else {
      this.themeSignal.set('system');
    }
    this.applyTheme();
  }

  private setupThemeEffect(): void {
    effect(() => {
      const theme = this.themeSignal();
      this.applyTheme();
      this.storage.setItem('theme', theme);
    });
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
  }

  toggleTheme(): void {
    const current = this.themeSignal();
    if (current === 'system') {
      this.themeSignal.set('dark');
    } else if (current === 'dark') {
      this.themeSignal.set('light');
    } else {
      this.themeSignal.set('dark');
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme: ActualTheme;

    if (this.themeSignal() === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = this.themeSignal() as ActualTheme;
    }

    root.classList.add(effectiveTheme);
    this.actualThemeSignal.set(effectiveTheme);
  }

  isDarkMode(): boolean {
    return this.actualThemeSignal() === 'dark';
  }
}

