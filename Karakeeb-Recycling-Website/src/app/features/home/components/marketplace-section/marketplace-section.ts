import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-marketplace-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './marketplace-section.html',
  styleUrl: './marketplace-section.scss',
})
export class MarketplaceSection {
  marketplaceCards = [
    {
      type: 'buyers',
      icon: 'shopping',
      gradientFrom: 'from-green-400',
      gradientTo: 'to-emerald-500',
      bgGradient: 'from-green-50/50 to-emerald-50/30',
      dotColor: 'bg-green-400',
      titleKey: 'indexPage.marketplace.buyers.title',
      descriptionKey: 'indexPage.marketplace.buyers.description',
      feature1Key: 'indexPage.marketplace.buyers.feature1',
      feature2Key: 'indexPage.marketplace.buyers.feature2',
      feature3Key: 'indexPage.marketplace.buyers.feature3'
    },
    {
      type: 'crafters',
      icon: 'craft',
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-indigo-500',
      bgGradient: 'from-blue-50/50 to-indigo-50/30',
      dotColor: 'bg-blue-400',
      titleKey: 'indexPage.marketplace.crafters.title',
      descriptionKey: 'indexPage.marketplace.crafters.description',
      feature1Key: 'indexPage.marketplace.crafters.feature1',
      feature2Key: 'indexPage.marketplace.crafters.feature2',
      feature3Key: 'indexPage.marketplace.crafters.feature3'
    },
    {
      type: 'rawMaterials',
      icon: 'materials',
      gradientFrom: 'from-amber-400',
      gradientTo: 'to-orange-500',
      bgGradient: 'from-amber-50/50 to-orange-50/30',
      dotColor: 'bg-amber-400',
      titleKey: 'indexPage.marketplace.rawMaterials.title',
      descriptionKey: 'indexPage.marketplace.rawMaterials.description',
      feature1Key: 'indexPage.marketplace.rawMaterials.feature1',
      feature2Key: 'indexPage.marketplace.rawMaterials.feature2',
      feature3Key: 'indexPage.marketplace.rawMaterials.feature3'
    }
  ];

  constructor(public translation: TranslationService) {}
}
