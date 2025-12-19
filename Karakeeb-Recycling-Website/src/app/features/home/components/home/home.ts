import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSection } from '../hero-section/hero-section';
import { FeaturesSection } from '../features-section/features-section';
import { StepsSection } from '../steps-section/steps-section';
import { SystemFlowSection } from '../system-flow-section/system-flow-section';
import { MarketplaceSection } from '../marketplace-section/marketplace-section';
import { CommunitySection } from '../community-section/community-section';
import { FloatingRecorderButtonComponent } from '../../../voice-recorder/components/floating-recorder-button/floating-recorder-button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroSection,
    FeaturesSection,
    StepsSection,
    SystemFlowSection,
    MarketplaceSection,
    CommunitySection,
    FloatingRecorderButtonComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
}
