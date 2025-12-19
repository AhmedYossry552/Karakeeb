import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-tab-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-navigation.html',
  styleUrls: ['./tab-navigation.scss']
})
export class TabNavigationComponent {
  @Input() tabs: string[] = [];
  @Input() activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  constructor(public translation: TranslationService) {}

  onTabClick(tab: string): void {
    this.tabChange.emit(tab);
  }

  getTabLabel(tab: string): string {
    return this.translation.t(`profile.tabs.${tab}`) || tab;
  }
}

