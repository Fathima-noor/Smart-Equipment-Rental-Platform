import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface BookingChange {
  booking: Record<string, any>;
  created?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private readonly changesSubject = new Subject<BookingChange>();
  readonly bookingChanges$ = this.changesSubject.asObservable();

  publish(change: BookingChange): void {
    this.changesSubject.next(change);
  }

  applyChange(bookings: any[], change: BookingChange): any[] {
    const bookingId = Number(change.booking['id']);
    const index = bookings.findIndex(
      booking => Number(booking.id) === bookingId
    );

    if (index >= 0) {
      return bookings.map((booking, currentIndex) =>
        currentIndex === index
          ? { ...booking, ...change.booking }
          : booking
      );
    }

    return change.created
      ? [change.booking, ...bookings].sort(
          (first, second) =>
            Number(second.id) - Number(first.id)
        )
      : bookings;
  }
}