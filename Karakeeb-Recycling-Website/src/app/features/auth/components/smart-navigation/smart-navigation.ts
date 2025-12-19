import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationContextService } from '../../../../core/services/authentication-context.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-smart-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-navigation.html',
  styleUrls: ['./smart-navigation.scss'],
  host: {
    class: 'smart-navigation-wrapper'
  }
})
export class SmartNavigationComponent {
  @Input() nextStep?: () => void | Promise<void>;
  @Input() prevStep?: () => void;
  @Input() onSubmit?: () => void | Promise<void>;
  @Input() disableNext?: boolean;
  @Input() forceSubmit?: boolean = false;
  @Input() showPrevButton: boolean = true;

  constructor(
    public authContext: AuthenticationContextService,
    private translation: TranslationService
  ) {}

  get isLastStep(): boolean {
    // If forceSubmit is true, always show submit button
    if (this.forceSubmit) {
      return true;
    }
    const role = this.authContext.selectedRole();
    const step = this.authContext.step();
    const roleConfig: Record<string, number> = {
      customer: 2,
      delivery: 4,
      buyer: 2
    };
    return step >= (roleConfig[role] || 2);
  }

  t(key: string): string {
    return this.translation.t(key);
  }
}

