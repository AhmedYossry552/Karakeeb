import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api';

export interface Address {
  id?: string;
  Id?: string;
  _id?: string;
  City?: string;
  city?: string;
  Area?: string;
  area?: string;
  Street?: string;
  street?: string;
  Building?: string;
  building?: string;
  Floor?: string;
  floor?: string;
  Apartment?: string;
  apartment?: string;
  Landmark?: string;
  landmark?: string;
  Notes?: string;
  notes?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private addressesSubject = new BehaviorSubject<Address[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  addresses$ = this.addressesSubject.asObservable();
  isLoading$ = this.loadingSubject.asObservable();

  constructor(private api: ApiService) {}

  get addresses(): Address[] {
    return this.addressesSubject.value;
  }

  /**
   * Load all user addresses from backend
   */
  async loadUserAddresses(): Promise<Address[]> {
    this.loadingSubject.next(true);
    try {
      console.log('🔄 Fetching addresses from /addresses endpoint...');
      const response = await firstValueFrom(
        this.api.get<any>('/addresses')
      );
      console.log('📨 Raw API Response:', response);
      
      // Handle both direct array and wrapped response
      let addresses: Address[] = [];
      if (Array.isArray(response)) {
        addresses = response;
        console.log('✅ Response is array:', addresses.length, 'addresses');
      } else if (response?.data && Array.isArray(response.data)) {
        addresses = response.data;
        console.log('✅ Response.data is array:', addresses.length, 'addresses');
      } else if (response?.addresses && Array.isArray(response.addresses)) {
        addresses = response.addresses;
        console.log('✅ Response.addresses is array:', addresses.length, 'addresses');
      } else {
        addresses = response || [];
        console.log('⚠️ Response format unknown, treating as array:', addresses.length, 'addresses');
      }
      
      console.log('📦 Final addresses array:', addresses);
      if (addresses.length === 0) {
        console.warn('⚠️ No addresses returned from backend. User may not have saved any addresses yet.');
      } else {
        console.log('✨ Loaded', addresses.length, 'address(es):');
        addresses.forEach((addr, idx) => {
          console.log(`  [${idx}] ${addr.Street}, ${addr.Building} - ${addr.Area}, ${addr.City}`);
        });
      }
      
      this.addressesSubject.next(addresses);
      return addresses;
    } catch (error: any) {
      console.error('❌ Error loading addresses:', error);
      console.error('📋 Error status:', error?.status);
      console.error('📝 Error message:', error?.message);
      console.error('📄 Error response:', error?.error);
      return [];
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get a specific address by ID
   */
  async getAddress(addressId: string): Promise<Address | null> {
    try {
      const address = await firstValueFrom(
        this.api.get<Address>(`/addresses/${addressId}`)
      );
      return address || null;
    } catch (error) {
      console.error('Error loading address:', error);
      return null;
    }
  }

  /**
   * Create a new address
   */
  async createAddress(address: Address): Promise<Address | null> {
    try {
      const response = await firstValueFrom(
        this.api.post<Address>('/addresses', address)
      );
      
      if (response) {
        // Reload addresses to get the updated list
        await this.loadUserAddresses();
        return response;
      }
      return null;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, address: Address): Promise<Address | null> {
    try {
      const response = await firstValueFrom(
        this.api.put<Address>(`/addresses/${addressId}`, address)
      );
      
      if (response) {
        // Reload addresses to get the updated list
        await this.loadUserAddresses();
        return response;
      }
      return null;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.api.delete(`/addresses/${addressId}`)
      );
      
      // Reload addresses to get the updated list
      await this.loadUserAddresses();
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      return false;
    }
  }

  /**
   * Get the first (default) address if it exists
   */
  getDefaultAddress(): Address | null {
    const addresses = this.addresses;
    return addresses.length > 0 ? addresses[0] : null;
  }

  /**
   * Check if user has any addresses
   */
  hasAddresses(): boolean {
    return this.addresses.length > 0;
  }
}
