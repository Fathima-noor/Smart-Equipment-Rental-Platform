import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  constructor() {}

  setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }
  setAccessToken(access: string) {
    localStorage.setItem('access_token', access);
  }
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  isLoggedIn() {
    return !!this.getAccessToken();
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}