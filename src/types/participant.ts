export interface Participant {
    userId: string;
    firstname: string;
    lastname: string;
    email: string;
    participantStatus: boolean;
    phoneNumber: string;
    rating: {
        rate: number,
        count: number
    };
    isRated: boolean;
} 