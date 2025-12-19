import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';

interface Material {
  name: { en: string; ar: string } | string;
  image: string;
  totalRecycled: number;
  totalPoints: number;
  unit: string;
}

@Component({
  selector: 'app-top-materials',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './top-materials.html',
  styleUrl: './top-materials.scss'
})
export class TopMaterialsComponent implements OnInit {
  materials = signal<Material[]>([]);
  isLoading = signal(false);

  constructor(
    private apiService: ApiService,
    public translation: TranslationService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.isLoading.set(true);
    this.apiService.get<any>('/top-materials-recycled').subscribe({
      next: (response) => {
        try {
          // Handle different response formats
          let materialsData: any[] = [];
          
          if (response?.success && response.data) {
            // Format: { success: true, data: [...] }
            materialsData = Array.isArray(response.data) ? response.data : [];
          } else if (response?.data?.data) {
            // Format: { data: { data: [...] } }
            materialsData = Array.isArray(response.data.data) ? response.data.data : [];
          } else if (Array.isArray(response)) {
            // Format: [...]
            materialsData = response;
          } else if (Array.isArray(response.data)) {
            // Format: { data: [...] }
            materialsData = response.data;
          }

          if (materialsData.length > 0) {
            const formattedMaterials = materialsData.map((item: any) => ({
              name: item.name || { en: '', ar: '' },
              image: item.image || '',
              totalRecycled: item.totalQuantity || 0,
              totalPoints: item.totalPoints || 0,
              unit: item.unit || 'kg'
            }));
            this.materials.set(formattedMaterials);
          } else {
            this.materials.set([]);
          }
        } catch (error) {
          console.error('Error parsing materials response:', error);
          this.materials.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading materials:', error);
        this.materials.set([]);
        this.isLoading.set(false);
      }
    });
  }

  getMaterialName(material: Material): string {
    if (typeof material.name === 'string') {
      return material.name;
    }
    const locale = this.translation.getLocale();
    return locale === 'ar' ? material.name.ar : material.name.en;
  }

  getUnitText(unit: string): string {
    if (unit === 'pieces') {
      return this.translation.t('common.piece') || 'piece';
    }
    return this.translation.t('common.kg') || 'kg';
  }

  markFromMarketplace(): void {
    const user = this.authService.getUser();
    if (user?.role === 'buyer') {
      if (localStorage.getItem('fromMarketPlace') === 'true') {
        localStorage.removeItem('fromMarketPlace');
      }
    } else {
      localStorage.setItem('fromMarketPlace', 'true');
    }
  }
}

