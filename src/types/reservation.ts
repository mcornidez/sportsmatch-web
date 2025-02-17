export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: number;
  courtId: number;
  date: string;
  time: string;
  status: ReservationStatus;
}