import React, { createContext, useContext, useState, useEffect } from 'react';

export type ReservationStatus = 'pending' | 'accepted' | 'rejected';
export type TimeSlotStatus = 'Disponible' | 'Ocupado' | 'Pendiente' | 'No disponible';

export interface Reservation {
  id: number;
  courtId: number;
  date: string;
  time: string;
  status: ReservationStatus;
}

export interface SlotStatus {
  date: string;
  time: string;
  status: TimeSlotStatus;
}

export interface Court {
  id: number;
  name: string;
  sport: string;
  material: string;
  covered: 'cubierta' | 'descubierta';
  price: string;
  schedule: Record<string, {
    start: string;
    end: string;
    closed: boolean;
  }>;
  reservations: Reservation[];
  slotStatuses: SlotStatus[];
}

interface CourtsContextType {
  courts: Court[];
  addCourt: (court: Omit<Court, 'id'>) => void;
  updateCourt: (id: number, court: Omit<Court, 'id'>) => void;
  deleteCourt: (id: number) => void;
  getCourtById: (id: number) => Court | undefined;
  updateReservationStatus: (courtId: number, reservationId: number, status: ReservationStatus) => boolean;
  isTimeSlotAvailable: (courtId: number, date: string, time: string) => boolean;
  updateSlotStatus: (courtId: number, date: string, time: string, status: TimeSlotStatus) => void;
  addReservation: (courtId: number, date: string, time: string) => void;
}

const CourtsContext = createContext<CourtsContextType | undefined>(undefined);

const initialCourts: Court[] = [
  {
    id: 1,
    name: 'Cancha 1',
    sport: 'Tenis',
    material: 'Césped sintético',
    covered: 'descubierta',
    price: '5000',
    schedule: {
      'Lunes': { start: '08:00', end: '21:00', closed: false },
      'Martes': { start: '08:00', end: '21:00', closed: false },
      'Miércoles': { start: '08:00', end: '21:00', closed: false },
      'Jueves': { start: '08:00', end: '21:00', closed: false },
      'Viernes': { start: '08:00', end: '21:00', closed: false },
      'Sábado': { start: '08:00', end: '21:00', closed: false },
      'Domingo': { start: '08:00', end: '21:00', closed: false },
    },
    reservations: [],
    slotStatuses: []
  }
];

export const CourtsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courts, setCourts] = useState<Court[]>(() => {
    const savedCourts = localStorage.getItem('courts');
    if (savedCourts) {
      try {
        const parsed = JSON.parse(savedCourts);
        return parsed.map((court: any) => ({
          ...court,
          slotStatuses: Array.isArray(court.slotStatuses) ? court.slotStatuses : []
        }));
      } catch (error) {
        console.error('Error parsing courts from localStorage:', error);
        return initialCourts;
      }
    }
    return initialCourts;
  });

  useEffect(() => {
    localStorage.setItem('courts', JSON.stringify(courts));
  }, [courts]);

  const addCourt = (newCourt: Omit<Court, 'id'>) => {
    const nextId = Math.max(0, ...courts.map(c => c.id)) + 1;
    setCourts(prev => [
      ...prev,
      {
        ...newCourt,
        id: nextId,
        reservations: [],
        slotStatuses: []
      }
    ]);
  };

  const updateCourt = (id: number, updatedCourt: Omit<Court, 'id'>) => {
    setCourts(prev => prev.map(court => 
      court.id === id ? {
        ...updatedCourt,
        id,
        reservations: court.reservations,
        slotStatuses: Array.isArray(court.slotStatuses) ? court.slotStatuses : []
      } : court
    ));
  };

  const deleteCourt = (id: number) => {
    setCourts(prev => prev.filter(court => court.id !== id));
  };

  const getCourtById = (id: number) => {
    return courts.find(court => court.id === id);
  };

  const isTimeSlotAvailable = (courtId: number, date: string, time: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return false;

    const dayOfWeek = new Date(date).toLocaleDateString('es-ES', { weekday: 'long' });
    const daySchedule = court.schedule[dayOfWeek];
    
    if (!daySchedule || daySchedule.closed) return false;

    const timeHour = parseInt(time.split(':')[0]);
    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const endHour = parseInt(daySchedule.end.split(':')[0]);

    if (timeHour < startHour || timeHour >= endHour) return false;

    // Check manual status first
    const manualStatus = court.slotStatuses.find(
      slot => slot.date === date && slot.time === time
    );
    if (manualStatus) {
      return manualStatus.status === 'Disponible';
    }

    // Then check reservations
    return !court.reservations.some(
      reservation => 
        reservation.status === 'accepted' &&
        reservation.date === date &&
        reservation.time === time
    );
  };

  const updateReservationStatus = (
    courtId: number,
    reservationId: number,
    status: ReservationStatus
  ): boolean => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return false;

    const reservation = court.reservations.find(r => r.id === reservationId);
    if (!reservation) return false;

    if (status === 'accepted') {
      const isAvailable = isTimeSlotAvailable(courtId, reservation.date, reservation.time);
      if (!isAvailable) return false;
    }

    setCourts(prevCourts => 
      prevCourts.map(c => {
        if (c.id === courtId) {
          return {
            ...c,
            reservations: c.reservations.map(r => 
              r.id === reservationId ? { ...r, status } : r
            )
          };
        }
        return c;
      })
    );

    return true;
  };

  const updateSlotStatus = (
    courtId: number,
    date: string,
    time: string,
    status: TimeSlotStatus
  ) => {
    setCourts(prevCourts =>
      prevCourts.map(court => {
        if (court.id === courtId) {
          const currentSlotStatuses = Array.isArray(court.slotStatuses) ? court.slotStatuses : [];
          const existingIndex = currentSlotStatuses.findIndex(
            slot => slot.date === date && slot.time === time
          );

          let newSlotStatuses;
          if (existingIndex >= 0) {
            newSlotStatuses = [...currentSlotStatuses];
            newSlotStatuses[existingIndex] = { date, time, status };
          } else {
            newSlotStatuses = [...currentSlotStatuses, { date, time, status }];
          }

          return {
            ...court,
            slotStatuses: newSlotStatuses
          };
        }
        return court;
      })
    );
  };

  const addReservation = (courtId: number, date: string, time: string) => {
    setCourts(prevCourts => prevCourts.map(court => {
      if (court.id === courtId) {
        const nextId = Math.max(0, ...court.reservations.map(r => r.id)) + 1;
        return {
          ...court,
          reservations: [
            ...court.reservations,
            {
              id: nextId,
              courtId,
              date,
              time,
              status: 'accepted'
            }
          ]
        };
      }
      return court;
    }));
  };

  return (
    <CourtsContext.Provider value={{
      courts,
      addCourt,
      updateCourt,
      deleteCourt,
      getCourtById,
      updateReservationStatus,
      isTimeSlotAvailable,
      updateSlotStatus,
      addReservation
    }}>
      {children}
    </CourtsContext.Provider>
  );
};

export const useCourts = () => {
  const context = useContext(CourtsContext);
  if (context === undefined) {
    throw new Error('useCourts must be used within a CourtsProvider');
  }
  return context;
};