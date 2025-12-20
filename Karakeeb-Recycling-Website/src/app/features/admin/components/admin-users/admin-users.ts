import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, User } from '../../../../core/services/admin.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss'
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  searchTerm = signal('');
  selectedRole: string = '';
  private searchSubject = new Subject<string>();
  selectedUser: User | null = null;
  showRoleModal = signal(false);
  newRole = signal<string>('');

  constructor(
    private adminService: AdminService,
    public translation: TranslationService,
    private toastr: ToastrService
  ) {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
      this.loadUsers();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    
    this.adminService.getUsers(
      this.currentPage(),
      this.itemsPerPage(),
      this.selectedRole || undefined,
      this.searchTerm() || undefined
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users.set(response.data);
          if (response.pagination) {
            this.totalPages.set(response.pagination.totalPages || 1);
            this.totalItems.set(response.pagination.totalUsers || 0);
          }
        } else {
          this.users.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error.message || 'Failed to load users';
        this.toastr.error(errorMessage);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onPageChange(page: number): void {
    if (this.currentPage() === page) return; // Prevent unnecessary reload
    this.currentPage.set(page);
    this.loadUsers();
  }

  onItemsPerPageChange(items: number): void {
    if (this.itemsPerPage() === items) return; // Prevent unnecessary reload
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onEdit(user: User): void {
    this.selectedUser = user;
    this.newRole.set(user.role);
    this.showRoleModal.set(true);
  }

  onDelete(user: User): void {
    if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      this.adminService.deleteUser(user._id).subscribe({
        next: () => {
          this.toastr.success('User deleted successfully');
          // Clear cache and reload
          this.adminService.clearCache();
          this.loadUsers();
        },
        error: (error) => {
          const errorMessage = error?.error?.message || 'Failed to delete user';
          this.toastr.error(errorMessage);
        }
      });
    }
  }

  saveRole(): void {
    if (!this.selectedUser) return;

    this.adminService.updateUserRole(this.selectedUser._id, this.newRole()).subscribe({
      next: () => {
        this.toastr.success('Role updated successfully');
        this.showRoleModal.set(false);
        this.selectedUser = null;
        // Clear cache and reload
        this.adminService.clearCache();
        this.loadUsers();
      },
      error: (error) => {
        const errorMessage = error?.error?.message || 'Failed to update role';
        this.toastr.error(errorMessage);
      }
    });
  }

  filterByRole(role: string): void {
    if (this.selectedRole === role) return; // Prevent unnecessary reload
    this.selectedRole = role;
    this.currentPage.set(1);
    this.loadUsers();
  }

  getUserImage(user: User): string {
    if (user.imgUrl) return user.imgUrl;
    if (user.role === 'delivery' && user.attachments?.deliveryImage) {
      return user.attachments.deliveryImage;
    }
    return '';
  }

  getUserStatus(user: User): { text: string; class: string } {
    const lastActive = new Date(user.lastActiveAt || 0);
    const FIVE_MINUTES = 5 * 60 * 1000;
    const isOnline = Date.now() - lastActive.getTime() < FIVE_MINUTES;
    return {
      text: isOnline ? 'Online' : 'Offline',
      class: isOnline ? 'status-online' : 'status-offline'
    };
  }
}
