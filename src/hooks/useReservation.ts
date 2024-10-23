import { useState, useEffect } from 'react';
import { Reservation } from '@/types';

export const useReservations = () => {
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    // Fetch reservations from API
    setPendingReservations([
      { id: 1, court: "Cancha 6", time: "17:30hs", date: "21 de Diciembre 2024" },
      { id: 2, court: "Cancha 1", time: "17:45hs", date: "21 de Diciembre 2024" }
    ]);

    setUpcomingReservations([
      { id: 3, court: "Cancha 3", time: "11:30hs", date: "27 de Noviembre 2024" },
      { id: 4, court: "Cancha 1", time: "19:00hs", date: "01 de Diciembre 2024" },
      { id: 5, court: "Cancha 2", time: "20:00hs", date: "24 de Noviembre 2024" }
    ]);
  }, []);

  return { pendingReservations, upcomingReservations };
};