import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core/services/translation.service';
import { AddressService, Address } from '../../../../core/services/address.service';
import { ToastrService } from 'ngx-toastr';

const cityAreas: Record<string, string[]> = {
  'Cairo': ['Nasr City', 'Heliopolis', 'Maadi', 'Zamalek', 'Downtown'],
  'Giza': ['Dokki', 'Mohandessin', '6th October', 'Agouza'],
  'Alexandria': ['Stanley', 'Smouha', 'Gleem', 'Sporting', 'El-Mansheya'],
  'Mansoura': ['Talkha', 'Sherbin', 'New Mansoura'],
  'Aswan': ['El-Sahel', 'El-Nuba']
};

const egyptCities = ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Aswan'];

@Component({
  selector: 'app-address-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address-step.html',
  styleUrls: ['./address-step.scss']
})
export class AddressStepComponent implements OnInit {
  @Input() form!: FormGroup;
  @Output() next = new EventEmitter<void>();
  @Output() selectedAddressChange = new EventEmitter<Address>();

  cities = egyptCities;
  availableAreas: string[] = [];
  
  savedAddresses = signal<Address[]>([]);
  selectedAddressId = signal<string | null>(null);
  showSavedAddresses = signal(true);
  showAddressForm = signal(false);
  isCreatingNew = signal(false);
  loading = signal(false);
  expandedAddressId = signal<string | null>(null);

  constructor(
    public translation: TranslationService,
    private addressService: AddressService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSavedAddresses();
    
    // Initially disable area control if no city is selected
    const cityControl = this.form.get('city');
    const areaControl = this.form.get('area');
    
    if (!cityControl?.value) {
      areaControl?.disable();
    }
    
    // Watch for city changes
    cityControl?.valueChanges.subscribe(city => {
      if (city) {
        areaControl?.enable();
      } else {
        areaControl?.disable();
        this.form.patchValue({ area: '' });
      }
    });
  }

  /**
   * Load user's saved addresses from backend
   */
  async loadSavedAddresses(): Promise<void> {
    this.loading.set(true);
    try {
      console.log('🏠 [AddressStep] Starting to load saved addresses...');
      const addresses = await this.addressService.loadUserAddresses();
      console.log('🏠 [AddressStep] Received addresses:', addresses);
      this.savedAddresses.set(addresses);
      
      // If user has addresses, show them. Otherwise show form for new address
      if (addresses.length > 0) {
        console.log('🏠 [AddressStep] User has', addresses.length, 'saved address(es)');
        this.showSavedAddresses.set(true);
        this.showAddressForm.set(false);
        // Pre-select and set the first address as default
        const firstAddress = addresses[0];
        console.log('🏠 [AddressStep] Setting first address as default:', firstAddress);
        this.selectSavedAddress(firstAddress);
        // Also emit it as the selected address for parent components
        this.selectedAddressChange.emit(firstAddress);
      } else {
        console.log('🏠 [AddressStep] No saved addresses found, showing form for new address');
        this.showSavedAddresses.set(false);
        this.showAddressForm.set(true);
        this.isCreatingNew.set(true);
      }
    } catch (error) {
      console.error('🏠 [AddressStep] Error loading addresses:', error);
      this.showAddressForm.set(true);
      this.isCreatingNew.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Select a saved address and populate the form
   */
  selectSavedAddress(address: Address): void {
    const addressId = address.id || address.Id || address._id;
    console.log('🏠 [AddressStep] selectSavedAddress called:', { address, addressId });
    if (addressId) {
      this.selectedAddressId.set(addressId);
      console.log('🏠 [AddressStep] Selected address ID set to:', addressId);
      this.populateFormWithAddress(address);
      this.selectedAddressChange.emit(address);
      this.showAddressForm.set(false);
      this.isCreatingNew.set(false);
    } else {
      console.error('🏠 [AddressStep] Address has no ID:', address);
    }
  }

  /**
   * Toggle address details expansion
   */
  toggleAddressDetails(address: Address): void {
    const addressId = address.id || address.Id || address._id;
    if (this.expandedAddressId() === addressId) {
      this.expandedAddressId.set(null);
    } else {
      this.expandedAddressId.set(addressId || null);
    }
  }

  /**
   * Populate form fields with address data
   */
  private populateFormWithAddress(address: Address): void {
    this.form.patchValue({
      city: (address.City || address.city) || '',
      area: (address.Area || address.area) || '',
      street: (address.Street || address.street) || '',
      building: (address.Building || address.building) || '',
      floor: (address.Floor || address.floor) || '',
      apartment: (address.Apartment || address.apartment) || '',
      landmark: (address.Landmark || address.landmark) || '',
      notes: (address.Notes || address.notes) || ''
    });
    
    // Trigger city change to update available areas
    const city = (address.City || address.city);
    if (city) {
      this.availableAreas = cityAreas[city] || [];
      const areaControl = this.form.get('area');
      if (areaControl) {
        areaControl.enable();
      }
    }
  }

  /**
   * Show form to create a new address
   */
  createNewAddress(): void {
    this.isCreatingNew.set(true);
    this.selectedAddressId.set(null);
    this.form.reset();
    this.showAddressForm.set(true);
  }

  /**
   * Edit the selected address (show form with current values)
   */
  editSelectedAddress(): void {
    // Prevent editing while loading
    if (this.loading()) {
      return;
    }

    const selectedId = this.selectedAddressId();
    if (selectedId) {
      const address = this.savedAddresses().find(a => (a.id || a.Id || a._id) === selectedId);
      if (address) {
        this.populateFormWithAddress(address);
        this.showAddressForm.set(true);
        this.isCreatingNew.set(false);
      } else {
        this.toastr.error(
          this.translation.t('address.notFound') || 'Address not found',
          this.translation.t('common.error') || 'Error'
        );
      }
    } else {
      this.toastr.error(
        this.translation.t('address.selectAddress') || 'Please select an address first',
        this.translation.t('common.error') || 'Error'
      );
    }
  }

  /**
   * Cancel editing and go back to saved addresses list
   */
  cancelEdit(): void {
    if (this.savedAddresses().length > 0) {
      this.showAddressForm.set(false);
      const currentId = this.selectedAddressId();
      const address = this.savedAddresses().find(a => (a.Id || a._id) === currentId);
      if (address) {
        this.populateFormWithAddress(address);
      }
    }
  }

  /**
   * Save address (create new or update existing)
   */
  async saveAddress(): Promise<void> {
    if (this.form.invalid) {
      this.toastr.error(
        this.translation.t('common.fillAllFields') || 'Please fill all required fields',
        this.translation.t('common.error') || 'Error'
      );
      return;
    }

    this.loading.set(true);
    try {
      const addressData: Address = {
        City: this.form.get('city')?.value,
        Area: this.form.get('area')?.value,
        Street: this.form.get('street')?.value,
        Building: this.form.get('building')?.value || '',
        Floor: this.form.get('floor')?.value || '',
        Apartment: this.form.get('apartment')?.value || '',
        Landmark: this.form.get('landmark')?.value || '',
        Notes: this.form.get('notes')?.value || ''
      };

      let savedAddress: Address | null = null;

      if (this.isCreatingNew()) {
        // Create new address
        savedAddress = await this.addressService.createAddress(addressData);
        if (savedAddress) {
          this.toastr.success(
            this.translation.t('address.savedSucc') || 'Address saved successfully',
            this.translation.t('common.success') || 'Success'
          );
          await this.loadSavedAddresses();
          // The newly created address will be auto-selected by loadSavedAddresses
          this.showAddressForm.set(false);
          savedAddress = this.savedAddresses().find(a => 
            (a.Street || a.street) === addressData.Street &&
            (a.City || a.city) === addressData.City
          ) || savedAddress;
        }
      } else {
        // Update existing address
        const addressId = this.selectedAddressId();
        if (addressId) {
          savedAddress = await this.addressService.updateAddress(addressId, addressData);
          if (savedAddress) {
            this.toastr.success(
              this.translation.t('address.updatedSucc') || 'Address updated successfully',
              this.translation.t('common.success') || 'Success'
            );
            await this.loadSavedAddresses();
            // Re-select the updated address
            const updatedAddress = this.savedAddresses().find(a => (a.Id || a._id) === addressId);
            if (updatedAddress) {
              this.selectedAddressId.set(addressId);
              this.selectedAddressChange.emit(updatedAddress);
            }
            this.showAddressForm.set(false);
          }
        }
      }

      // If address was saved/updated, emit it and proceed to next step
      if (savedAddress) {
        this.selectedAddressChange.emit(savedAddress);
      }
    } catch (error: any) {
      console.error('Error saving address:', error);
      const errorMessage = error.error?.message || 
        this.translation.t('address.saveFailed') || 
        'Failed to save address';
      this.toastr.error(errorMessage, this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  onCityChange(): void {
    const city = this.form.get('city')?.value;
    const areaControl = this.form.get('area');
    this.availableAreas = cityAreas[city] || [];
    this.form.patchValue({ area: '' });
    
    // Enable/disable area control based on city selection
    if (city) {
      areaControl?.enable();
    } else {
      areaControl?.disable();
    }
  }

  onNext(): void {
    console.log('🏠 [AddressStep] onNext called', {
      loading: this.loading(),
      showAddressForm: this.showAddressForm(),
      formValid: this.form.valid,
      selectedAddressId: this.selectedAddressId()
    });

    // Prevent multiple clicks while loading
    if (this.loading()) {
      console.log('🏠 [AddressStep] Loading, ignoring click');
      return;
    }

    // If form is being shown and is valid, save it first
    if (this.showAddressForm() && this.form.valid) {
      console.log('🏠 [AddressStep] Form is shown and valid, saving and proceeding');
      this.saveAddressAndProceed();
      return;
    }

    // Otherwise, proceed with selected address
    const selectedId = this.selectedAddressId();
    console.log('🏠 [AddressStep] Selected ID:', selectedId);
    if (selectedId) {
      const selectedAddr = this.savedAddresses().find(a => (a.id || a.Id || a._id) === selectedId);
      console.log('🏠 [AddressStep] Found address:', selectedAddr);
      if (selectedAddr) {
        this.selectedAddressChange.emit(selectedAddr);
        this.next.emit();
        console.log('🏠 [AddressStep] Emitted next event');
      } else {
        console.error('🏠 [AddressStep] Address not found for ID:', selectedId);
        this.toastr.error(
          this.translation.t('address.selectAddress') || 'Please select an address',
          this.translation.t('common.error') || 'Error'
        );
      }
    } else {
      console.error('🏠 [AddressStep] No address selected');
      this.toastr.error(
        this.translation.t('address.selectAddress') || 'Please select an address',
        this.translation.t('common.error') || 'Error'
      );
    }
  }

  /**
   * Save address and proceed to next step
   */
  private async saveAddressAndProceed(): Promise<void> {
    if (this.form.invalid) {
      this.toastr.error(
        this.translation.t('common.fillAllFields') || 'Please fill all required fields',
        this.translation.t('common.error') || 'Error'
      );
      return;
    }

    this.loading.set(true);
    try {
      const addressData: Address = {
        City: this.form.get('city')?.value,
        Area: this.form.get('area')?.value,
        Street: this.form.get('street')?.value,
        Building: this.form.get('building')?.value || '',
        Floor: this.form.get('floor')?.value || '',
        Apartment: this.form.get('apartment')?.value || '',
        Landmark: this.form.get('landmark')?.value || '',
        Notes: this.form.get('notes')?.value || ''
      };

      let savedAddress: Address | null = null;

      if (this.isCreatingNew()) {
        // Create new address
        savedAddress = await this.addressService.createAddress(addressData);
        if (savedAddress) {
          await this.loadSavedAddresses();
          // Find the newly created address
          savedAddress = this.savedAddresses().find(a => 
            (a.Street || a.street) === addressData.Street &&
            (a.City || a.city) === addressData.City
          ) || savedAddress;
        }
      } else {
        // Update existing address
        const addressId = this.selectedAddressId();
        if (addressId) {
          savedAddress = await this.addressService.updateAddress(addressId, addressData);
          if (savedAddress) {
            await this.loadSavedAddresses();
            // Re-select the updated address
            const updatedAddress = this.savedAddresses().find(a => (a.Id || a._id) === addressId);
            if (updatedAddress) {
              this.selectedAddressId.set(addressId);
              savedAddress = updatedAddress;
            }
          }
        }
      }

      // If address was saved/updated, emit it and proceed to next step
      if (savedAddress) {
        this.selectedAddressChange.emit(savedAddress);
        this.showAddressForm.set(false);
        this.next.emit();
      }
    } catch (error: any) {
      console.error('Error saving address:', error);
      const errorMessage = error.error?.message || 
        this.translation.t('address.saveFailed') || 
        'Failed to save address';
      this.toastr.error(errorMessage, this.translation.t('common.error') !== 'common.error' ? this.translation.t('common.error') : 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  get cityControl() {
    return this.form.get('city');
  }

  get areaControl() {
    return this.form.get('area');
  }

  get streetControl() {
    return this.form.get('street');
  }

  get buildingControl() {
    return this.form.get('building');
  }

  get floorControl() {
    return this.form.get('floor');
  }

  get apartmentControl() {
    return this.form.get('apartment');
  }
}

