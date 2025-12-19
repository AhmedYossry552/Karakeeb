import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-steps-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './steps-section.html',
  styleUrl: './steps-section.scss',
})
export class StepsSection {
  steps = [
    {
      stepNumber: 1,
      titleKey: 'indexPage.steps.step1.title',
      titleDefault: 'Sign Up',
      descKey: 'indexPage.steps.step1.desc',
      descDefault: 'Create your account in just 30 seconds',
      bgColor: 'bg-green-100',
      iconColor: 'bg-green-500',
      icon: 'user'
    },
    {
      stepNumber: 2,
      titleKey: 'indexPage.steps.step2.title',
      titleDefault: 'Select Type of Waste',
      descKey: 'indexPage.steps.step2.desc',
      descDefault: 'Choose from categories',
      bgColor: 'bg-blue-100',
      iconColor: 'bg-blue-500',
      icon: 'waste'
    },
    {
      stepNumber: 3,
      titleKey: 'indexPage.steps.step3.title',
      titleDefault: 'Connect & Recycle',
      descKey: 'indexPage.steps.step3.desc',
      descDefault: 'Find nearby centers or schedule pickup',
      bgColor: 'bg-yellow-100',
      iconColor: 'bg-yellow-500',
      icon: 'recycle'
    }
  ];

  constructor(public translation: TranslationService) {}
}
