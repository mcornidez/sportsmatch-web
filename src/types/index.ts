export type Reservation = {
    id: number;
    field: string;
    date: string;
    time: string;
  };
  
  export type Field = {
    id: number;
    name: string;
    sport: string;
    schedule?: {
      [key: string]: string[];
    };
  };
  