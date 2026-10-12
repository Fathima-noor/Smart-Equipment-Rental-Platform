import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-equipment',
  imports: [FormsModule, DecimalPipe, RouterLink],
  templateUrl: './equipment.html',
  styleUrl: './equipment.css'
})
export class Equipment implements OnInit {

  equipmentList: any[] = [];
  filteredEquipment: any[] = [];

  searchText = '';
  selectedCategory = 'all';

  loading = true;
  errorMessage = '';

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

        console.log('Equipment API response:', response);

        this.equipmentList = Array.isArray(response)
          ? response
          : (response?.results || []);

        this.filteredEquipment = [...this.equipmentList];

        this.loading = false;

        // Force Angular to update the page immediately
        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error('Equipment loading error:', error);

        this.errorMessage = 'Unable to load equipment.';
        this.loading = false;

        // Force Angular to show the error immediately
        this.cdr.detectChanges();

      }

    });
  }

  filterEquipment(): void {

    const search = this.searchText.trim().toLowerCase();
    const category = this.selectedCategory.toLowerCase();

    this.filteredEquipment = this.equipmentList.filter(
      (equipment: any) => {

        const matchesSearch =
          !search ||
          equipment.name?.toLowerCase().includes(search) ||
          equipment.description?.toLowerCase().includes(search);

        const matchesCategory =
          category === 'all' ||
          equipment.category?.toLowerCase() === category;

        return matchesSearch && matchesCategory;
      }
    );

    // Update UI immediately
    this.cdr.detectChanges();
  }

  selectCategory(category: string): void {

    if (this.selectedCategory === category) {
      return;
    }

    this.selectedCategory = category;

    this.filterEquipment(); 
  }

  getCategoryName(category: string): string {

    if (!category) {
      return 'Equipment';
    }

    return category.charAt(0).toUpperCase() + category.slice(1);
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

  getImageUrl(image: string | null): string {

    if (!image) {
      return '';
    }

    if (image.startsWith('http')) {
      return image;
    }

    return `http://127.0.0.1:8000${image}`;
  }
}