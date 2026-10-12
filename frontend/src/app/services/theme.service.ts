import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  isDarkMode = false;

  constructor(
    @Inject(DOCUMENT) private document: Document
  ) {
    const savedTheme = localStorage.getItem('theme');

    this.isDarkMode = savedTheme === 'dark';

    this.applyTheme();
  }

  setLightTheme(): void {
    this.isDarkMode = false;

    localStorage.setItem('theme', 'light');

    this.applyTheme();
  }

  setDarkTheme(): void {
    this.isDarkMode = true;

    localStorage.setItem('theme', 'dark');

    this.applyTheme();
  }

  private applyTheme(): void {
    this.document.documentElement.classList.toggle(
      'dark-theme',
      this.isDarkMode
    );
  }
}