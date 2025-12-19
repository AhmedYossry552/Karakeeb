import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-waiting-for-approval',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './waiting-for-approval.html',
  styleUrl: './waiting-for-approval.scss'
})
export class WaitingForApprovalComponent {
  constructor(
    public authService: AuthService,
    public translation: TranslationService
  ) {}
}


