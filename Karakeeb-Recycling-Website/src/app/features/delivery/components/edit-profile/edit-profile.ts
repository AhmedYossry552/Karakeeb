import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faArrowLeft, 
  faSave, 
  faCamera,
  faUser,
  faEnvelope,
  faPhone,
  faTruck
} from '@fortawesome/free-solid-svg-icons';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.scss']
})
export class EditProfileComponent implements OnInit {
  // Icons
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faCamera = faCamera;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faPhone = faPhone;
  faTruck = faTruck;

  // State
  profileForm!: FormGroup;
  user = signal<User | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  imagePreview = signal<string>('');
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: ApiService,
    private authService: AuthService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.authService.user$.subscribe(user => {
      this.user.set(user);
      if (user) {
        this.initForm(user);
        this.loading.set(false);
      }
    });
  }

  initForm(user: User): void {
    this.profileForm = this.fb.group({
      name: [user?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      phoneNumber: [user?.phoneNumber || '', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]+$/)]],
      bio: [user?.bio || '', [Validators.maxLength(500)]]
    });

    if (user?.attachments?.deliveryImage) {
      this.imagePreview.set(user.attachments.deliveryImage);
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async saveProfile(): Promise<void> {
    // Mark all fields as touched to show validation errors
    if (this.profileForm) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
    }

    if (this.profileForm.invalid) {
      this.toastr.error('Please fill in all required fields correctly');
      return;
    }

    this.saving.set(true);

    try {
      // Prepare JSON body similar to customer/buyer edit profile
      const updateData: any = {
        name: (this.profileForm.get('name')?.value || '').trim(),
        phoneNumber: this.profileForm.get('phoneNumber')?.value || ''
      };

      if (this.profileForm.get('bio')?.value) {
        updateData.bio = this.profileForm.get('bio')?.value;
      }

      // Use the same single endpoint as customer/buyer: PUT /api/profile
      const response = await this.api.put<any>('/profile', updateData).toPromise();

      const userData = response?.data || response;
      const currentUser = this.user();

      if (userData && currentUser) {
        const user: User = {
          _id: userData.Id || userData.id || userData._id || currentUser._id,
          name: userData.Name || userData.name || updateData.name,
          email: userData.Email || userData.email || currentUser.email,
          phoneNumber: userData.PhoneNumber || userData.phoneNumber || updateData.phoneNumber,
          role: userData.Role || userData.role || currentUser.role,
          imgUrl: userData.ImgUrl || userData.imgUrl || currentUser.imgUrl,
          isApproved: userData.IsApproved !== undefined ? userData.IsApproved :
            (userData.isApproved !== undefined ? userData.isApproved : currentUser.isApproved),
          provider: userData.Provider || userData.provider || currentUser.provider || 'none',
          createdAt: userData.CreatedAt || userData.createdAt || currentUser.createdAt,
          updatedAt: userData.UpdatedAt || userData.updatedAt,
          lastActiveAt: userData.LastActiveAt || userData.lastActiveAt || currentUser.lastActiveAt,
          attachments: userData.Attachments || userData.attachments || currentUser.attachments,
          bio: userData.Bio || userData.bio || (updateData.bio ?? (currentUser as any).bio)
        };

        // If image changed, upload it via backend endpoint (Cloudinary) then update local user with returned ImgUrl.
        if (this.selectedFile) {
          const fd = new FormData();
          fd.append('image', this.selectedFile);
          try {
            const p = await this.api.post<any>('/profile/upload-image', fd).toPromise();
            const imgUrl = p?.ImgUrl || p?.imgUrl;
            if (imgUrl) {
              (user as any).imgUrl = imgUrl;
              const attachments = (user as any).attachments || {};
              attachments.deliveryImage = imgUrl;
              (user as any).attachments = attachments;
            }
          } catch {
            // ignore upload errors; profile data update already succeeded
          }
        }

        this.authService.setUser(user);
      } else if (currentUser) {
        // Fallback: update locally if backend didn't return user
        const updatedUser: User = {
          ...currentUser,
          name: this.profileForm.get('name')?.value,
          phoneNumber: this.profileForm.get('phoneNumber')?.value,
          bio: this.profileForm.get('bio')?.value,
          updatedAt: new Date().toISOString()
        };

        if (this.selectedFile) {
          const fd = new FormData();
          fd.append('image', this.selectedFile);
          try {
            const p = await this.api.post<any>('/profile/upload-image', fd).toPromise();
            const imgUrl = p?.ImgUrl || p?.imgUrl;
            if (imgUrl) {
              (updatedUser as any).imgUrl = imgUrl;
              const attachments = (updatedUser as any).attachments || {};
              attachments.deliveryImage = imgUrl;
              (updatedUser as any).attachments = attachments;
            }
          } catch {
            // ignore
          }
        }

        this.authService.setUser(updatedUser);
      }

      this.toastr.success('Profile updated successfully');

      setTimeout(() => {
        this.router.navigate(['/deliveryprofile']);
      }, 500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.error?.message || error?.message || 'Error updating profile';
      this.toastr.error(errorMessage);
    } finally {
      this.saving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/deliveryprofile']);
  }

  goToDashboard(): void {
    this.router.navigate(['/deliverydashboard']);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
