import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationContextService, Role } from '../../../../core/services/authentication-context.service';

@Component({
  selector: 'app-role-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-stepper.html',
  styleUrls: ['./role-stepper.scss']
})
export class RoleStepperComponent {
  @Input() role!: Role;
  @Input() step!: number;

  constructor(public authContext: AuthenticationContextService) {}

  getIcons(): number[] {
    const googleUser = this.authContext.googleUser();
    const role = this.role;
    
    if (googleUser) {
      const googleSteps: Record<Role, number> = {
        customer: 1,
        delivery: 3,
        buyer: 1,
        none: 0
      };
      return Array.from({ length: googleSteps[role] || 0 }, (_, i) => i + 1);
    } else {
      const steps: Record<Role, number> = {
        customer: 2,
        delivery: 4,
        buyer: 2,
        none: 0
      };
      return Array.from({ length: steps[role] || 0 }, (_, i) => i + 1);
    }
  }

  isCompleted(index: number): boolean {
    return index + 1 < this.step;
  }

  isActive(index: number): boolean {
    return index + 1 === this.step;
  }
}

