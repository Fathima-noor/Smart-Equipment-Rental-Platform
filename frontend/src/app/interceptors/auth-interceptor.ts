import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';
import { ApiService } from '../services/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(Auth);
  const api = inject(ApiService);

  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(

    catchError((error: HttpErrorResponse) => {

      if (
        error.status === 401 &&
        !req.url.includes('/auth/login/') &&
        !req.url.includes('/auth/token/refresh/')
      ) {

        const refresh = auth.getRefreshToken();

        if (refresh) {

          return api.refreshToken(refresh).pipe(

            switchMap((response: any) => {

              auth.setAccessToken(response.access);

              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.access}`
                }
              });

              return next(retryReq);

            }),

            catchError((refreshError) => {

              auth.logout();

              return throwError(() => refreshError);

            })

          );

        }

        auth.logout();

      }

      return throwError(() => error);

    })

  );

};