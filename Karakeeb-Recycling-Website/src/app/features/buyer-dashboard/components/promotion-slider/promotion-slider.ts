import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';

interface Slide {
  id: string;
  titleKey: string;
  descriptionKey: string;
  image: string;
  ctaTextKey: string;
  ctaLink: string;
  learnMoreLinkKey: string;
  isStatistic?: boolean;
  badgeKey: string;
}

@Component({
  selector: 'app-promotion-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './promotion-slider.html',
  styleUrl: './promotion-slider.scss',
})
export class PromotionSliderComponent implements OnInit, OnDestroy {
  currentSlide = signal(0);
  isHovered = signal(false);
  private autoSlideInterval?: any;

  slides: Slide[] = [
    {
      id: '1',
      titleKey: 'slider.phoneRecycling.title',
      descriptionKey: 'slider.phoneRecycling.description',
      image: '/image1.jpeg',
      ctaTextKey: 'slider.phoneRecycling.cta',
      ctaLink: '/marketplace',
      learnMoreLinkKey: 'slider.phoneRecycling.learnMore',
      badgeKey: 'slider.badges.limitedOffer'
    },
    {
      id: '2',
      titleKey: 'slider.deviceChallenge.title',
      descriptionKey: 'slider.deviceChallenge.description',
      image: '/image2.jpg',
      ctaTextKey: 'slider.deviceChallenge.cta',
      ctaLink: '/marketplace',
      learnMoreLinkKey: 'slider.deviceChallenge.learnMore',
      isStatistic: true,
      badgeKey: 'slider.badges.communityChallenge'
    },
    {
      id: '3',
      titleKey: 'slider.fashionRecycling.title',
      descriptionKey: 'slider.fashionRecycling.description',
      image: '/image3.jpg',
      ctaTextKey: 'slider.fashionRecycling.cta',
      ctaLink: '/profile/rewarding',
      learnMoreLinkKey: 'slider.fashionRecycling.learnMore',
      badgeKey: 'slider.badges.limitedOffer'
    }
  ];

  constructor(public translation: TranslationService) {}

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      if (!this.isHovered()) {
        this.nextSlide();
      }
    }, 5000);
  }

  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide.update(prev => (prev === this.slides.length - 1 ? 0 : prev + 1));
  }

  prevSlide(): void {
    this.currentSlide.update(prev => (prev === 0 ? this.slides.length - 1 : prev - 1));
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
  }

  get isRTL(): boolean {
    return this.translation.getLocale() === 'ar';
  }
}

