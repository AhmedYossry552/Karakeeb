import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-category.html',
  styleUrl: './edit-category.scss'
})
export class EditCategoryComponent implements OnInit {
  categoryForm: FormGroup;
  categoryName = signal<string>('');
  originalCategoryName = '';
  imageUrl = signal<string>('');
  imageFile: File | null = null;
  previewUrl = signal<string | null>(null);
  isLoading = signal(true);
  isUploading = signal(false);
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      description: ['', Validators.required],
      descriptionAr: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const name = decodeURIComponent(params['name']);
      this.originalCategoryName = name;
      this.categoryName.set(name);
      this.loadCategory();
    });
  }

  loadCategory(): void {
    this.isLoading.set(true);
    const locale = this.translation.getLocale();
    
    this.adminService.getCategoryByName(this.originalCategoryName, locale).subscribe({
      next: (response) => {
        const category = response.data || response;
        this.categoryForm.patchValue({
          name: category.name?.en || '',
          nameAr: category.name?.ar || '',
          description: category.description?.en || '',
          descriptionAr: category.description?.ar || ''
        });
        this.imageUrl.set(category.image || '');
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading category:', error);
        this.toastr.error('Failed to load category');
        this.isLoading.set(false);
        this.router.navigate(['/admin/categories']);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.imageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImageToCloudinary(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.imageFile) {
        resolve(this.imageUrl());
        return;
      }

      this.isUploading.set(true);
      const formData = new FormData();
      formData.append('file', this.imageFile);
      formData.append('upload_preset', 'unsigned_recycle');

      fetch('https://api.cloudinary.com/v1_1/dyz4a4ume/image/upload', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.secure_url) {
            this.isUploading.set(false);
            resolve(data.secure_url);
          } else {
            throw new Error('Upload failed');
          }
        })
        .catch(err => {
          this.isUploading.set(false);
          reject(err);
        });
    });
  }

  async onSubmit(): Promise<void> {
    if (this.categoryForm.invalid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.isSubmitting.set(true);

    try {
      let imageUrl = this.imageUrl();

      if (this.imageFile) {
        imageUrl = await this.uploadImageToCloudinary();
      }

      const updateData = {
        name: this.categoryForm.value.name,
        nameAr: this.categoryForm.value.nameAr,
        description: this.categoryForm.value.description,
        descriptionAr: this.categoryForm.value.descriptionAr,
        image: imageUrl
      };

      this.adminService.updateCategory(this.originalCategoryName, updateData).subscribe({
        next: () => {
          this.toastr.success('Category updated successfully');
          this.router.navigate(['/admin/categories']);
        },
        error: (error) => {
          console.error('Error updating category:', error);
          const errorMessage = error?.error?.message || 'Failed to update category';
          this.toastr.error(errorMessage);
          this.isSubmitting.set(false);
        }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      this.toastr.error('Failed to upload image');
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/categories']);
  }
}

