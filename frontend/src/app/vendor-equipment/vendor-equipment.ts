import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-vendor-equipment',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vendor-equipment.html',
  styleUrl: './vendor-equipment.css'
})
export class VendorEquipment implements OnInit {

  equipment: any[] = [];

  filteredEquipment: any[] = [];

  loading = true;

  saving = false;

  deletingId: number | null = null;

  errorMessage = '';

  successMessage = '';

  searchText = '';

  selectedCategory = '';

  showForm = false;

  editingEquipment: any = null;

  selectedImage: File | null = null;


  formData = {
    name: '',
    category: 'camera',
    description: '',
    price_per_day: '',
    quantity: 1,
    is_available: true
  };


  categories = [
    {
      value: 'camera',
      label: 'Camera'
    },
    {
      value: 'laptop',
      label: 'Laptop'
    },
    {
      value: 'projector',
      label: 'Projector'
    },
    {
      value: 'drone',
      label: 'Drone'
    },
    {
      value: 'other',
      label: 'Other'
    }
  ];


  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.loadEquipment();
  }


  loadEquipment(): void {

    this.loading = true;

    this.errorMessage = '';

    this.api.getEquipment().subscribe({

      next: (response: any) => {

        console.log(
          'Vendor equipment response:',
          response
        );

        this.equipment = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Vendor equipment loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load your equipment.';

        this.cdr.detectChanges();
      }
    });
  }


  applyFilters(): void {

    const search = this.searchText
      .trim()
      .toLowerCase();

    this.filteredEquipment =
      this.equipment.filter(item => {

        const matchesSearch =
          !search ||
          item.name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search);

        const matchesCategory =
          !this.selectedCategory ||
          item.category === this.selectedCategory;

        return matchesSearch && matchesCategory;
      });
  }


  onSearchChange(): void {
    this.applyFilters();
  }


  onCategoryChange(): void {
    this.applyFilters();
  }


  openAddForm(): void {

    this.editingEquipment = null;

    this.selectedImage = null;

    this.formData = {
      name: '',
      category: 'camera',
      description: '',
      price_per_day: '',
      quantity: 1,
      is_available: true
    };

    this.errorMessage = '';

    this.successMessage = '';

    this.showForm = true;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  openEditForm(item: any): void {

    this.editingEquipment = item;

    this.selectedImage = null;

    this.formData = {
      name: item.name || '',
      category: item.category || 'camera',
      description: item.description || '',
      price_per_day: item.price_per_day || '',
      quantity: Number(item.quantity || 1),
      is_available: item.is_available !== false
    };

    this.errorMessage = '';

    this.successMessage = '';

    this.showForm = true;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  closeForm(): void {

    if (this.saving) {
      return;
    }

    this.showForm = false;

    this.editingEquipment = null;

    this.selectedImage = null;

    this.errorMessage = '';
  }


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


  saveEquipment(): void {

    this.errorMessage = '';

    this.successMessage = '';


    if (!this.formData.name.trim()) {

      this.errorMessage =
        'Please enter equipment name.';

      return;
    }


    if (!this.formData.description.trim()) {

      this.errorMessage =
        'Please enter equipment description.';

      return;
    }


    if (
      !this.formData.price_per_day ||
      Number(this.formData.price_per_day) <= 0
    ) {

      this.errorMessage =
        'Please enter a valid price per day.';

      return;
    }


    if (
      !this.formData.quantity ||
      Number(this.formData.quantity) <= 0
    ) {

      this.errorMessage =
        'Please enter a valid quantity.';

      return;
    }


    const data = new FormData();

    data.append(
      'name',
      this.formData.name.trim()
    );

    data.append(
      'category',
      this.formData.category
    );

    data.append(
      'description',
      this.formData.description.trim()
    );

    data.append(
      'price_per_day',
      String(this.formData.price_per_day)
    );

    data.append(
      'quantity',
      String(this.formData.quantity)
    );

    data.append(
      'is_available',
      String(this.formData.is_available)
    );


    if (this.selectedImage) {

      data.append(
        'image',
        this.selectedImage
      );
    }


    this.saving = true;


    if (this.editingEquipment) {

      this.api.updateEquipment(
        this.editingEquipment.id,
        data
      ).subscribe({

        next: (response: any) => {

          console.log(
            'Equipment updated:',
            response
          );

          this.saving = false;

          this.showForm = false;

          this.editingEquipment = null;

          this.selectedImage = null;

          this.successMessage =
            'Equipment updated successfully.';

          this.loadEquipment();

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Equipment update error:',
            error
          );

          this.saving = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to update equipment.';

          this.cdr.detectChanges();
        }
      });

    } else {

      this.api.createEquipment(data).subscribe({

        next: (response: any) => {

          console.log(
            'Equipment created:',
            response
          );

          this.saving = false;

          this.showForm = false;

          this.selectedImage = null;

          this.successMessage =
            'Equipment added successfully.';

          this.loadEquipment();

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Equipment creation error:',
            error
          );

          this.saving = false;

          this.errorMessage =
            this.getApiErrorMessage(error) ||
            'Unable to add equipment.';

          this.cdr.detectChanges();
        }
      });
    }
  }


  deleteEquipment(item: any): void {

    if (!item?.id) {
      return;
    }


    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${item.name}"?`
      );


    if (!confirmed) {
      return;
    }


    this.errorMessage = '';

    this.successMessage = '';

    this.deletingId = item.id;


    this.api.deleteEquipment(item.id).subscribe({

      next: () => {

        this.deletingId = null;

        this.equipment =
          this.equipment.filter(
            equipment =>
              equipment.id !== item.id
          );

        this.applyFilters();

        this.successMessage =
          'Equipment deleted successfully.';

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Equipment delete error:',
          error
        );

        this.deletingId = null;

        this.errorMessage =
          this.getApiErrorMessage(error) ||
          'Unable to delete equipment.';

        this.cdr.detectChanges();
      }
    });
  }


  getImageUrl(image: string | null): string {

    if (!image) {
      return '';
    }

    if (image.startsWith('http')) {
      return image;
    }

    return `http://127.0.0.1:8000${image}`;
  }


  getEquipmentIcon(category: string): string {

    switch (category?.toLowerCase()) {

      case 'camera':
        return 'bi-camera';

      case 'laptop':
        return 'bi-laptop';

      case 'projector':
        return 'bi-projector';

      case 'drone':
        return 'bi-send';

      default:
        return 'bi-box-seam';
    }
  }


  formatCategory(category: string): string {

    if (!category) {
      return 'Other';
    }

    return category.charAt(0).toUpperCase()
      + category.slice(1);
  }


  getApiErrorMessage(error: any): string {

    if (!error?.error) {
      return '';
    }

    if (error.error.detail) {
      return error.error.detail;
    }

    const values =
      Object.values(error.error);

    return values.flat().join(' ');
  }
}