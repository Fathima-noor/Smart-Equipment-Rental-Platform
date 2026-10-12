import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

import { Auth } from '../services/auth';
import { Router,RouterLink } from '@angular/router';
@Component({
  selector: 'app-login',
  imports: [FormsModule,RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private api: ApiService,
    private auth: Auth,
    private router: Router
  ) {}

  login() {

    const loginData = {
      username: this.username,
      password: this.password
    };

    this.api.login(loginData).subscribe({

      next: (response: any) => {

        console.log('Login successful');

        // Store JWT tokens
        this.auth.setTokens(
          response.access,
          response.refresh
        );

        // Get logged-in user's profile
        this.api.getProfile().subscribe({

          next: (user: any) => {

            console.log('User profile:', user);

            // Store user information
            localStorage.setItem(
              'user',
              JSON.stringify(user)
            );
            localStorage.setItem('userRole', user.role);

            // Redirect according to role
            if (user.role === 'admin') {

              this.router.navigate(['/admin']);

            } else if (user.role === 'vendor') {

              this.router.navigate(['/vendor']);

            } else if (user.role === 'operations_staff') {
              this.router.navigate(['/operations']);

            } else if (user.role === 'maintenance_staff') {
              this.router.navigate(['/maintenance']);

            } else {

              this.router.navigate(['/customer']); 

            }
          },

          error: (error) => {

            console.log('Profile error:', error);

            this.errorMessage =
              'Unable to load user profile.';
          }

        });

      },

      error: (error) => {

        console.log('Login error:', error);

        this.errorMessage =
          'Invalid username or password.';
      }

    });
  }
}