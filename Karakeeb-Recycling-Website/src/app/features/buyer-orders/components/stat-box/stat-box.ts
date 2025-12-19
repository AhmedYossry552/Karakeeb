import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-box.html',
  styleUrls: ['./stat-box.scss']
})
export class StatBoxComponent {
  @Input() label!: string;
  @Input() value!: number;
  @Input() loading = false;
}

