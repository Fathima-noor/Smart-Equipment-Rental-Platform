
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {

  username = '';
  email = '';
  first_name = '';
  last_name = '';
  password = '';
  confirm_password = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  register() {

    this.errorMessage = '';
    this.successMessage = '';

    // Check password matching
    if (this.password !== this.confirm_password) {

      this.errorMessage = 'Passwords do not match.';
      return;

    }

    // Check password length
    if (this.password.length < 8) {

      this.errorMessage =
        'Password must contain at least 8 characters.';

      return;

    }

    const registerData = {

      username: this.username,
      email: this.email,
      password: this.password,
      first_name: this.first_name,
      last_name: this.last_name

    };

    this.isLoading = true;

    this.api.register(registerData).subscribe({

      next: (response: any) => {

        console.log('Registration successful:', response);

        this.isLoading = false;

        this.successMessage =
          'Registration successful! Redirecting to login...';

        setTimeout(() => {

          this.router.navigate(['/login']);

        }, 1500);

      },

      error: (error) => {

        console.log('Registration error:', error);

        this.isLoading = false;

        if (error.error) {

          if (typeof error.error === 'object') {

            const errors = error.error;

            this.errorMessage = Object.keys(errors)
              .map(key => `${key}: ${errors[key]}`)
              .join(' ');

          } else {

            this.errorMessage =
              'Registration failed. Please check your details.';

          }

        } else {

          this.errorMessage =
            'Unable to connect to the server.';

        }

      }

    });

  }

}