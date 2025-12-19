import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features-section.html',
  styleUrl: './features-section.scss',
})
export class FeaturesSection {
  features = [
    {
      icon: 'ai',
      titleKey: 'AI-Powered Assistant',
      titleDefault: 'AI-Powered Assistant',
      descriptionKey: 'Identify recyclable materials using voice, text, or images fast and accurate recycling with AI.',
      descriptionDefault: 'Identify recyclable materials using voice commands, text descriptions, or image uploads. Our intelligent AI makes recycling effortless and accurate.',
      colorClass: 'text-green-600'
    },
    {
      icon: 'calendar',
      titleKey: 'indexPage.features.pickupScheduling',
      titleDefault: 'Pickup Scheduling',
      descriptionKey: 'indexPage.features.schedule',
      descriptionDefault: 'Choose a Date and Time',
      colorClass: 'text-blue-600'
    },
    {
      icon: 'dollar',
      titleKey: 'indexPage.features.earnorshare',
      titleDefault: 'Earn or Share',
      descriptionKey: 'indexPage.features.earn',
      descriptionDefault: 'Get Paid or Donate',
      colorClass: 'text-yellow-600'
    }
  ];

  constructor(public translation: TranslationService) {}
}
