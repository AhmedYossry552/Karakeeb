import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ApiService } from '../../../../core/services/api';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.scss']
})
export class EditProfileComponent implements OnInit {
  editForm!: FormGroup;
  user = signal<User | null>(null);
  imageFile: File | null = null;
  previewUrl = signal<string>('');
  isSaving = signal<boolean>(false);
  imageError = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public translation: TranslationService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Initialize form with empty values first
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(20)]],
      // Allow 9–11 digits; we normalize to +20 and 10 digits internally
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9,11}$/)]],
      image: [null]
    });

    // Subscribe to user
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user) {
        this.initializeForm(user);
      }
    });
  }

  private initializeForm(user: User): void {
    const phoneNumber = user.phoneNumber?.replace('+20', '').padStart(10, '0') || '';

    // For delivery, prefer deliveryImage; for customer/buyer, prefer imgUrl, then attachments.profileImage
    const imageUrl = user.role === 'delivery' 
      ? user.attachments?.deliveryImage || user.imgUrl || ''
      : user.imgUrl || user.attachments?.profileImage || '';

    this.previewUrl.set(imageUrl);

    if (this.editForm) {
      this.editForm.patchValue({
        name: user.name || '',
        phoneNumber: phoneNumber,
        image: null
      });
    }
  }

  get nameControl() {
    return this.editForm.get('name');
  }

  get phoneControl() {
    return this.editForm.get('phoneNumber');
  }

  get isChanged(): boolean {
    const user = this.user();
    if (!user || !this.editForm) return false;

    // Normalize and compare name
    const currentName = (this.nameControl?.value || '').trim();
    const userName = (user.name || '').trim();
    const nameChanged = currentName !== userName;

    // Normalize and compare phone
    const currentPhone = (this.phoneControl?.value || '').trim();
    let userPhone = user.phoneNumber || '';
    // Remove +20 prefix and normalize
    if (userPhone.startsWith('+20')) {
      userPhone = userPhone.substring(3);
    }
    // Remove leading zeros and pad to 10 digits
    userPhone = userPhone.replace(/^0+/, '').padStart(10, '0');
    const normalizedCurrentPhone = currentPhone.replace(/^0+/, '').padStart(10, '0');
    const phoneChanged = normalizedCurrentPhone !== userPhone;

    // Check image change
    const imageChanged = this.imageFile !== null;

    return nameChanged || phoneChanged || imageChanged;
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      this.imageError.set(this.translation.t('editProfile.validation.imageFormat') || 'Invalid image format. Please use JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > maxSize) {
      this.imageError.set(this.translation.t('editProfile.validation.imageSize') || 'Image size must be less than 2MB.');
      return;
    }

    this.imageError.set('');
    this.imageFile = file;

    // Use Data URL (base64) so it can be sent as imgUrl without changing backend
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.previewUrl.set(result);
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    if (this.editForm) {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
    }

    // Check if form is valid
    if (!this.editForm || this.editForm.invalid) {
      const errors: string[] = [];
      if (this.nameControl?.hasError('required')) {
        errors.push('Name is required');
      }
      if (this.nameControl?.hasError('maxlength')) {
        errors.push('Name must be less than 20 characters');
      }
      if (this.phoneControl?.hasError('required')) {
        errors.push('Phone number is required');
      }
      if (this.phoneControl?.hasError('pattern')) {
        errors.push('Invalid phone number format');
      }
      this.toastr.error(errors.join(', ') || 'Please fill in all required fields correctly');
      return;
    }

    // Check if there are actual changes
    if (!this.isChanged) {
      this.toastr.info('No changes to save');
      return;
    }

    this.isSaving.set(true);

    // Prepare update data (match backend UpdateProfileRequest)
    const updateData: any = {
      name: (this.nameControl?.value || '').trim(),
      phoneNumber: `+20${this.phoneControl?.value}`
    };

    // Now that backend ImgUrl column is nvarchar(max), we can safely send the image (base64 or URL)
    if (this.imageFile && this.previewUrl()) {
      updateData.imgUrl = this.previewUrl();
    }

    // Use the single supported endpoint from backend: PUT /api/profile
    const endpoints = ['/profile'];
    let endpointIndex = 0;

    const tryUpdate = (endpoint: string) => {
      this.api.put(endpoint, updateData).subscribe({
        next: (response: any) => {
          // Handle different response formats
          const userData = response?.data || response;
          
          if (userData) {
            // Map response to Angular User format (handle both PascalCase and camelCase)
            const user: User = {
              _id: userData.Id || userData.id || userData._id || this.user()?._id,
              name: userData.Name || userData.name || updateData.name,
              email: userData.Email || userData.email || this.user()?.email,
              phoneNumber: userData.PhoneNumber || userData.phoneNumber || updateData.phoneNumber,
              role: userData.Role || userData.role || this.user()?.role,
              imgUrl: userData.ImgUrl || userData.imgUrl || this.user()?.imgUrl,
              isApproved: userData.IsApproved !== undefined ? userData.IsApproved : (userData.isApproved !== undefined ? userData.isApproved : this.user()?.isApproved),
              provider: userData.Provider || userData.provider || this.user()?.provider || 'none',
              createdAt: userData.CreatedAt || userData.createdAt || this.user()?.createdAt,
              updatedAt: userData.UpdatedAt || userData.updatedAt,
              lastActiveAt: userData.LastActiveAt || userData.lastActiveAt || this.user()?.lastActiveAt,
              attachments: userData.Attachments || userData.attachments || this.user()?.attachments
            };

            // If user selected a new image, override imgUrl (and profileImage attachment) locally
            if (this.imageFile && this.previewUrl()) {
              const img = this.previewUrl();
              (user as any).imgUrl = img;
              const attachments = (user as any).attachments || {};
              attachments.profileImage = img;
              (user as any).attachments = attachments;
            }
            
            this.authService.setUser(user);
            this.toastr.success('Profile updated successfully');
            
            // Reset form state
            this.imageFile = null;
            
            // Role-based navigation
            setTimeout(() => {
              if (user.role === 'delivery') {
                this.router.navigate(['/deliverydashboard']);
              } else {
                this.router.navigate(['/profile']);
              }
            }, 500);
          } else {
            // If response doesn't have user data, just update locally
            const currentUser = this.user();
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                name: updateData.name,
                phoneNumber: updateData.phoneNumber,
                updatedAt: new Date().toISOString()
              };

              // Ensure local imgUrl / profileImage are updated even if backend doesn't return them
              if (this.imageFile && this.previewUrl()) {
                const img = this.previewUrl();
                (updatedUser as any).imgUrl = img;
                const attachments = (updatedUser as any).attachments || {};
                attachments.profileImage = img;
                (updatedUser as any).attachments = attachments;
              }

              // Ensure local imgUrl is updated even if backend doesn't return it
              if (this.imageFile && this.previewUrl()) {
                (updatedUser as any).imgUrl = this.previewUrl();
              }
              this.authService.setUser(updatedUser);
              this.toastr.success('Profile updated successfully');
              setTimeout(() => {
                if (updatedUser.role === 'delivery') {
                  this.router.navigate(['/deliverydashboard']);
                } else {
                  this.router.navigate(['/profile']);
                }
              }, 500);
            }
          }
          this.isSaving.set(false);
        },
        error: (error: any) => {
          console.error(`Error updating profile via ${endpoint}:`, error);
          
          // Try next endpoint if available
          endpointIndex++;
          if (endpointIndex < endpoints.length) {
            tryUpdate(endpoints[endpointIndex]);
          } else {
            // All endpoints failed
            const errorMessage = error?.error?.message || error?.message || 'Failed to update profile. Please try again.';
            this.toastr.error(errorMessage);
            this.isSaving.set(false);
          }
        }
      });
    };

    // Start with first endpoint
    tryUpdate(endpoints[0]);
  }

  onCancel(): void {
    const user = this.user();
    if (user?.role === 'delivery') {
      this.router.navigate(['/deliverydashboard']);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  getUserInitials(): string {
    const name = this.user()?.name || 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
}

