import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-admin-equipment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-equipment.html',
  styleUrls: ['./admin-equipment.css']
})
export class AdminEquipment implements OnInit {

  equipment: any[] = [];
  filteredEquipment: any[] = [];

  vendors: any[] = [];

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedCategory = 'all';
  selectedAvailability = 'all';

  showEquipmentForm = false;
  editingEquipment: any = null;

  equipmentForm = {
    name: '',
    category: 'camera',
    description: '',
    price_per_day: '',
    quantity: 1,
    vendor: '',
    is_available: true
  };

  selectedImage: File | null = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEquipment();
    this.loadVendors();
  }

  // =========================
  // LOAD EQUIPMENT
  // =========================

  loadEquipment(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getAdminEquipment().subscribe({

      next: (response: any) => {

        this.equipment = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Admin equipment loading error:',
          error
        );

        this.equipment = [];
        this.filteredEquipment = [];

        this.loading = false;

        this.errorMessage =
          'Unable to load equipment. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }


  // =========================
  // LOAD VENDORS
  // =========================

  loadVendors(): void {

    this.api.getAdminUsers().subscribe({

      next: (response: any) => {

        const users = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.vendors = users.filter(
          (user: any) =>
            user.role?.toLowerCase() === 'vendor'
        );

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Vendor loading error:',
          error
        );

      }

    });
  }


  // =========================
  // FILTERS
  // =========================

  applyFilters(): void {

    const search =
      this.searchText.trim().toLowerCase();

    this.filteredEquipment =
      this.equipment.filter((item: any) => {

        const vendorName =
          this.getVendorName(item).toLowerCase();

        const matchesSearch =
          !search ||
          String(item.id).includes(search) ||
          item.name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search) ||
          vendorName.includes(search);

        const matchesCategory =
          this.selectedCategory === 'all' ||
          item.category?.toLowerCase() ===
          this.selectedCategory.toLowerCase();

        const matchesAvailability =
          this.selectedAvailability === 'all' ||
          String(item.is_available) ===
          this.selectedAvailability;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesAvailability
        );
      });
  }


  // =========================
  // ADD EQUIPMENT
  // =========================

  openAddEquipment(): void {

    this.editingEquipment = null;

    this.equipmentForm = {
      name: '',
      category: 'camera',
      description: '',
      price_per_day: '',
      quantity: 1,
      vendor: '',
      is_available: true
    };

    this.selectedImage = null;

    this.errorMessage = '';

    this.showEquipmentForm = true;

    this.cdr.detectChanges();
  }


  // =========================
  // EDIT EQUIPMENT
  // =========================

  openEditEquipment(item: any): void {

    this.editingEquipment = item;

    this.equipmentForm = {
      name: item.name || '',
      category: item.category || 'camera',
      description: item.description || '',
      price_per_day: item.price_per_day || '',
      quantity: item.quantity || 1,
      vendor: String(item.vendor || ''),
      is_available: item.is_available !== false
    };

    this.selectedImage = null;

    this.errorMessage = '';

    this.showEquipmentForm = true;

    this.cdr.detectChanges();
  }


  // =========================
  // CLOSE POPUP
  // =========================

  closeEquipmentForm(): void {

    if (this.processing) {
      return;
    }

    this.showEquipmentForm = false;
    this.editingEquipment = null;

    this.selectedImage = null;

    this.resetForm();

    this.errorMessage = '';
  }


  // =========================
  // RESET FORM
  // =========================

  resetForm(): void {

    this.equipmentForm = {
      name: '',
      category: 'camera',
      description: '',
      price_per_day: '',
      quantity: 1,
      vendor: '',
      is_available: true
    };

    this.selectedImage = null;
  }


  // =========================
  // IMAGE SELECT
  // =========================

  onImageSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    if (
      input.files &&
      input.files.length > 0
    ) {
      this.selectedImage = input.files[0];
    }
  }


  // =========================
  // SAVE EQUIPMENT
  // =========================

  saveEquipment(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.equipmentForm.name.trim()) {

      this.errorMessage =
        'Equipment name is required.';

      return;
    }

    if (!this.equipmentForm.description.trim()) {

      this.errorMessage =
        'Description is required.';

      return;
    }

    if (
      !this.equipmentForm.price_per_day ||
      Number(this.equipmentForm.price_per_day) <= 0
    ) {

      this.errorMessage =
        'Price per day must be greater than zero.';

      return;
    }

    if (
      !this.equipmentForm.quantity ||
      Number(this.equipmentForm.quantity) <= 0
    ) {

      this.errorMessage =
        'Quantity must be greater than zero.';

      return;
    }

    if (!this.equipmentForm.vendor) {

      this.errorMessage =
        'Please select a vendor.';

      return;
    }

    this.processing = true;

    const formData = new FormData();

    formData.append(
      'name',
      this.equipmentForm.name.trim()
    );

    formData.append(
      'category',
      this.equipmentForm.category
    );

    formData.append(
      'description',
      this.equipmentForm.description.trim()
    );

    formData.append(
      'price_per_day',
      String(this.equipmentForm.price_per_day)
    );

    formData.append(
      'quantity',
      String(this.equipmentForm.quantity)
    );

    formData.append(
      'vendor',
      String(this.equipmentForm.vendor)
    );

    formData.append(
      'is_available',
      String(this.equipmentForm.is_available)
    );

    if (this.selectedImage) {

      formData.append(
        'image',
        this.selectedImage
      );
    }


    // =========================
    // UPDATE
    // =========================

    if (this.editingEquipment) {

      this.api.updateAdminEquipment(
        this.editingEquipment.id,
        formData
      ).subscribe({

        next: (response: any) => {

          const index =
            this.equipment.findIndex(
              item =>
                item.id ===
                this.editingEquipment.id
            );

          if (index !== -1) {
            this.equipment[index] = response;
          }

          this.applyFilters();

          this.processing = false;
          this.showEquipmentForm = false;
          this.editingEquipment = null;

          this.resetForm();

          this.successMessage =
            'Equipment updated successfully.';

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Equipment update error:',
            error
          );

          this.processing = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to update equipment.';

          this.cdr.detectChanges();
        }

      });

    }


    // =========================
    // CREATE
    // =========================

    else {

      this.api.createAdminEquipment(
        formData
      ).subscribe({

        next: (response: any) => {

          this.equipment.unshift(response);

          this.applyFilters();

          this.processing = false;
          this.showEquipmentForm = false;

          this.resetForm();

          this.successMessage =
            'Equipment created successfully.';

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Equipment creation error:',
            error
          );

          this.processing = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to create equipment.';

          this.cdr.detectChanges();
        }

      });
    }
  }


  // =========================
  // DELETE
  // =========================

  deleteEquipment(item: any): void {

    if (!item?.id) {
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;

    this.errorMessage = '';
    this.successMessage = '';

    this.api.deleteAdminEquipment(
      item.id
    ).subscribe({

      next: () => {

        this.equipment =
          this.equipment.filter(
            equipment =>
              equipment.id !== item.id
          );

        this.applyFilters();

        this.processing = false;

        this.successMessage =
          'Equipment deleted successfully.';

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Equipment deletion error:',
          error
        );

        this.processing = false;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to delete equipment.';

        this.cdr.detectChanges();
      }

    });
  }


  // =========================
  // HELPERS
  // =========================

  getVendorName(item: any): string {

  if (
    item?.role?.toLowerCase() === 'vendor'
  ) {
    const fullName =
      `${item.first_name || ''} ${item.last_name || ''}`
        .trim();

    return fullName ||
      item.username ||
      'Unknown Vendor';
  }

  if (
    item.vendor_name &&
    typeof item.vendor_name === 'string'
  ) {
    return item.vendor_name;
  }

  const vendorId =
    Number(item.vendor);

  const vendor =
    this.vendors.find(
      user => Number(user.id) === vendorId
    );

  if (!vendor) {
    return 'Unknown Vendor';
  }

  const fullName =
    `${vendor.first_name || ''} ${vendor.last_name || ''}`
      .trim();

  return fullName ||
    vendor.username ||
    'Unknown Vendor';
}

  getCategoryName(category: string): string {

    const names: any = {
      camera: 'Camera',
      laptop: 'Laptop',
      projector: 'Projector',
      drone: 'Drone',
      other: 'Other'
    };

    return names[category] || category;
  }


  getImageUrl(image: string): string {

    if (!image) {
      return '';
    }

    if (
      image.startsWith('http://') ||
      image.startsWith('https://')
    ) {
      return image;
    }

    return `http://127.0.0.1:8000${image}`;
  }


  getApiErrorMessage(error: any): string {

    const data = error?.error;

    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data.detail) {
      return data.detail;
    }

    if (data.message) {
      return data.message;
    }

    const firstKey =
      Object.keys(data)[0];

    if (firstKey) {

      const value =
        data[firstKey];

      if (Array.isArray(value)) {
        return value[0];
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return '';
  }
}