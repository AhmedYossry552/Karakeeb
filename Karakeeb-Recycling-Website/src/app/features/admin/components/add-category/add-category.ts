import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss'
})
export class AddCategoryComponent implements OnInit {
  categoryForm: FormGroup;
  imageFile: File | null = null;
  previewUrl = signal<string | null>(null);
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      description: ['', Validators.required],
      descriptionAr: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

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

  removeImage(): void {
    this.imageFile = null;
    this.previewUrl.set(null);
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) input.value = '';
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    if (!this.imageFile) {
      this.toastr.error('Please select an image for the category');
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('name', this.categoryForm.value.name);
    formData.append('nameAr', this.categoryForm.value.nameAr);
    formData.append('description', this.categoryForm.value.description);
    formData.append('descriptionAr', this.categoryForm.value.descriptionAr);
    formData.append('image', this.imageFile);

    this.adminService.createCategory(formData).subscribe({
      next: () => {
        this.toastr.success('Category created successfully');
        this.router.navigate(['/admin/categories']);
      },
      error: (error) => {
        console.error('Error creating category:', error);
        const errorMessage = error?.error?.message || 'Failed to create category';
        this.toastr.error(errorMessage);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/categories']);
  }
}

