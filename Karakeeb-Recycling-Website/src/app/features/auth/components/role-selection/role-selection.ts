import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationContextService, Role } from '../../../../core/services/authentication-context.service';
import { TranslationService } from '../../../../core/services/translation.service';

interface RoleConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: number;
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-selection.html',
  styleUrls: ['./role-selection.scss']
})
export class RoleSelectionComponent {
  roleConfig!: Record<Role, RoleConfig>;

  constructor(
    public authContext: AuthenticationContextService,
    private translation: TranslationService
  ) {
    this.roleConfig = {
      customer: {
        title: this.translation.t('auth.roles.customer.title') || 'Customer Registration',
        description: this.translation.t('auth.roles.customer.description') || 'Join our recycling community',
        icon: '👤',
        color: 'bg-green-500',
        steps: 2
      },
      delivery: {
        title: this.translation.t('auth.roles.delivery.title') || 'Delivery Partner Registration',
        description: this.translation.t('auth.roles.delivery.description') || 'Become a verified delivery partner',
        icon: '🚚',
        color: 'bg-blue-500',
        steps: 4
      },
      buyer: {
        title: this.translation.t('auth.roles.buyer.title') || 'Business Buyer Registration',
        description: this.translation.t('auth.roles.buyer.description') || 'Register your business to purchase recycled materials',
        icon: '🛒',
        color: 'bg-purple-500',
        steps: 2
      },
      none: {
        title: '',
        description: '',
        icon: '',
        color: '',
        steps: 0
      }
    };
  }

  roles: Role[] = ['customer', 'delivery', 'buyer'];

  getRoleConfig(role: string): RoleConfig {
    return this.roleConfig[role as Role];
  }

  handleSelectRole(role: string): void {
    this.authContext.setSelectedRole(role as Role);
    this.authContext.setStep(1);
    if (role === 'delivery') {
      // Delivery registration handled separately
      this.authContext.setMode('signup');
    } else {
      this.authContext.setMode('signup');
    }
  }

  t(key: string): string {
    return this.translation.t(key);
  }
}

