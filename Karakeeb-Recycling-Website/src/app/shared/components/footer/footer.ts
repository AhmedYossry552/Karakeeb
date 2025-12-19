import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent implements OnInit {
  currentYear = new Date().getFullYear();
  darkMode = false;

  constructor(
    public translation: TranslationService,
    private themeService: ThemeService
  ) {
    // Use effect to react to theme changes
    effect(() => {
      const theme = this.themeService.actualTheme();
      this.darkMode = theme === 'dark';
    });
  }

  ngOnInit(): void {
    // Initialize dark mode state
    this.darkMode = this.themeService.actualTheme() === 'dark';
  }
}

