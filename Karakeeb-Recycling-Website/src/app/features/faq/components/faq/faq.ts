import { Component, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

interface FaqItem {
  question: string;
  answer?: string;
  items?: { src: string; desc: string }[];
}

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf],
  templateUrl: './faq.html',
  styleUrl: './faq.scss'
})
export class FaqPageComponent {
  openIndex = signal<number | null>(null);
  faqs: FaqItem[] = [];

  constructor(public translation: TranslationService) {
    // Build FAQ list with the exact same questions/answers as the Next.js FAQ (messages/en.json -> faq)
    this.faqs = [
      {
        question: 'How does the material exchange process work?',
        answer:
          "It's simple! Sellers list their items on our platform with photos and descriptions. Buyers browse and select what they need. We handle quality verification, pickup from sellers, and delivery to buyers' doors. Everything is tracked through our platform for transparency."
      },
      {
        question: 'What types of materials do you accept?',
        answer:
          'We accept a wide variety of materials including furniture, building materials, textiles, books, appliances, and more. Items must be in good condition and pass our quality inspection. We focus on items that can be reused rather than disposed of.'
      },
      {
        question: 'What types of materials do you not accept?',
        items: [
          {
            src: '/public/foodwaste.jpg',
            desc:
              'Food scraps must be disposed of with your trash, or composted where composting programs are offered.'
          },
          {
            src: '/public/battery.avif',
            desc:
              'Electronics, batteries and light bulbs cannot go into your recycling container and require special handling.'
          },
          {
            src: '/public/needels.webp',
            desc:
              'Needles and other medical items cannot be recycled and may cause serious harm to workers. Dispose of them in proper medical waste containers.'
          },
          {
            src: '/public/diaper.png',
            desc:
              'Clean or dirty diapers cannot be recycled. Dispose of them in your trash.'
          }
        ]
      },
      {
        question: 'How do you ensure quality and hygiene?',
        answer:
          'Every item goes through our rigorous quality inspection process. We clean, sanitize, and test all materials before delivery. Our team checks for functionality, safety, and cleanliness. Items that don\'t meet our standards are responsibly recycled instead.'
      },
      {
        question: 'What areas do you deliver to?',
        answer:
          'We currently offer delivery services to major metropolitan areas and are rapidly expanding. Check our service area on the homepage or contact us to see if we deliver to your location. We\'re always looking to grow our network!'
      },
      {
        question: 'How much can I earn from selling my old items?',
        answer:
          'Earnings depend on the item\'s condition, demand, and market value. Our pricing algorithm considers these factors to give you a fair price. On average, sellers earn 60-80% of the item\'s assessed value, with payments processed within 48 hours of delivery confirmation.'
      },
      {
        question: 'Is there a cost for buyers?',
        answer:
          'Buyers pay for the items plus a small service fee that covers quality inspection, cleaning, and delivery. Our prices are typically 40-70% less than buying new, making quality second-hand materials affordable while supporting sustainability.'
      }
    ];
  }

  toggleAccordion(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}

