import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-plastic-we-recycle-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plastic-we-recycle.html',
  styleUrl: './plastic-we-recycle.scss'
})
export class PlasticWeRecyclePageComponent {
  constructor(public translation: TranslationService) {}
}


