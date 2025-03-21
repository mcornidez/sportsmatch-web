import {useEffect, useState} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select } from "@/components/ui/select";
import {ChevronDown, ChevronLeft, Copy} from 'lucide-react';
import apiClient from '@/apiClients';
import {DAYS_OF_WEEK} from "../../utils/constants.ts";
import {GetTimeSlot, TimeSlot} from "../../types/timeslot.ts";
import { useAuth } from '@/context/AppContext';

interface ScheduleSlot {
    day: string;
    startTime: string;
    endTime: string;
    slots: TimeSlot[];
    closed: boolean;
    error: string;
}

export const AssignSchedule = () => {
    const { id } = useParams<{ id: string }>();
    const { clubId } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const source = location.state?.source || 'new'; 

    const apiKey = localStorage.getItem('c-api-key');
    const [isLoading, setIsLoading] = useState(false);
    const [slotDuration, setSlotDuration] = useState<number | null>(null);
    const [schedule, setSchedule] = useState<ScheduleSlot[]>(
        DAYS_OF_WEEK.map(day => ({ day, startTime: "", endTime: "", slots: [], closed: false, error: "" }))
    );
    const [copyFromDay, setCopyFromDay] = useState<string | null>(null);
    const [copyToDays, setCopyToDays] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<string[]>([]);

    
    const today = new Date();
    const startDate = new Date(today);
    if (source === 'modify') {
        startDate.setDate(today.getDate() + 15); 
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 18);

    /*
    const formatDateForDisplay = (date: Date): string => {
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };


    const dateRangeMessage = source === 'new' 
        ? `Estás cargando los horarios desde hoy hasta ${formatDateForDisplay(endDate)}`
        : `Estás actualizando los horarios desde ${formatDateForDisplay(startDate)} hasta ${formatDateForDisplay(endDate)}.<br /> Si quieres actualizar los horarios dentro de los siguientes 14 días, puedes hacerlo sobre el calendario de la cancha.`;

     */
    const dateRangeMessage = source === 'new'
        ? `Estás cargando los horarios desde hoy hasta el 20 de mayo de 2025`
        : `Estás actualizando los horarios desde el 3 de abril de 2025 hasta 3 de junio de 2025.<br /> Si quieres actualizar los horarios dentro de los siguientes 14 días, puedes hacerlo sobre el calendario de la cancha.`;

    useEffect(() => {
        const fetchExistingTimeSlots = async () => {
            try {
                const response = await apiClient.get(`/fields/${id}/availability`, {
                    headers: { "c-api-key": apiKey },
                });

                const existingSlots: TimeSlot[] = response.data;

                const updatedSchedule = DAYS_OF_WEEK.map(day => {
                    const dayNameToJsDay: Record<string, number> = {
                        'Lunes': 1,      
                        'Martes': 2,     
                        'Miércoles': 3,  
                        'Jueves': 4,     
                        'Viernes': 5,    
                        'Sábado': 6,     
                        'Domingo': 0     
                    };
                    
                    const jsDateIndex = dayNameToJsDay[day];
                    
                    const slotsForDay = existingSlots.filter(slot => {
                        const slotDate = new Date(slot.availabilityDate);
                        return slotDate.getDay() === jsDateIndex;
                    });

                    if (slotsForDay.length > 0) {
                        slotsForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));

                        return {
                            day,
                            startTime: formatTime(slotsForDay[0].startTime),
                            endTime: formatTime(slotsForDay[slotsForDay.length - 1].endTime),
                            slots: slotsForDay,
                            closed: false,
                            error: "",
                        };
                    } else {
                        return { day, startTime: "", endTime: "", slots: [], closed: false, error: "" };
                    }
                });

                setSchedule(updatedSchedule);
            } catch (error) {
                console.error("❌ Error obteniendo timeSlots existentes:", error);
            }
        };

        fetchExistingTimeSlots();
    }, [id]);


    useEffect(() => {
        const fetchFieldData = async () => {
            try {
                const response = await apiClient.get(`/fields/${id}`, {headers: {'c-api-key': apiKey}})
                setSlotDuration(response.data.slot_duration);
            } catch (error) {
                console.error("Error obteniendo slot duration:", error);
            }
        };
        fetchFieldData();
    }, [id]);


    const generateTimeSlots = (startTime: string, endTime: string, interval: number) => {
        const slots = [];
        let [hours, minutes] = startTime.split(":").map(Number);
        let [endHours, endMinutes] = endTime.split(":").map(Number);

        while (hours < endHours || (hours === endHours && minutes < endMinutes)) {
            let newHours = hours;
            let newMinutes = minutes + interval;
            if (newMinutes >= 60) {
                newHours += Math.floor(newMinutes / 60);
                newMinutes %= 60;
            }

            if (newHours > endHours || (newHours === endHours && newMinutes > endMinutes)) {
                break;
            }

            slots.push({
                startTime: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
                endTime: `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`,
                slotStatus: "available",
            });

            hours = newHours;
            minutes = newMinutes;
        }

        return slots;
    };

    const handleCopySchedule = () => {
        if (!copyFromDay || copyToDays.length === 0) return;

        const referenceSlot = schedule.find((slot) => slot.day === copyFromDay);
        if (!referenceSlot) return;

        setSchedule((prev) =>
            prev.map((slot) =>
                copyToDays.includes(slot.day)
                    ? { ...slot, startTime: referenceSlot.startTime, endTime: referenceSlot.endTime, closed: referenceSlot.closed }
                    : slot
            )
        );

        setCopyFromDay(null);
        setCopyToDays([]);
        setShowDropdown(null);
    };

    const handleBack = async () => {
        if (source === 'new') {
            try {
                setIsLoading(true);
                
                // First fetch the field data to preserve the values
                const fieldResponse = await apiClient.get(`/fields/${id}`, {
                    headers: { 'c-api-key': apiKey }
                });
                
                const fieldData = fieldResponse.data;
                
                // Then delete the field
                await apiClient.delete(`/fields/${id}`, {
                    headers: { 'c-api-key': apiKey },
                    params: { clubId }
                });
                
                // Navigate back with the field data as state
                navigate('/fields/new', { 
                    state: { 
                        preservedData: {
                            name: fieldData.name,
                            description: fieldData.description,
                            cost: fieldData.cost_per_slot,
                            capacity: fieldData.capacity,
                            slot_duration: fieldData.slot_duration,
                            sports: fieldData.sports || []
                        } 
                    } 
                });
            } catch (error) {
                console.error("❌ Error al procesar la cancha:", error);
                alert("No se pudo completar la operación. Inténtalo de nuevo.");
            } finally {
                setIsLoading(false);
            }
        } else {
            navigate(`/fields/${id}/edit`);
        }
    };

    const handleTimeChange = (index: number, key: "startTime" | "endTime", value: string) => {
        setSchedule(prev => prev.map((slot, i) => {
            if (i !== index) return slot;

            let newSlot = { ...slot, [key]: value, error: "" };

            if (key === "startTime" && newSlot.endTime && value >= newSlot.endTime) {
                newSlot.error = "La hora de apertura debe ser menor a la de cierre.";
            }

            if (key === "endTime" && newSlot.startTime && value <= newSlot.startTime) {
                newSlot.error = "La hora de cierre debe ser mayor a la de apertura.";
            }

            return newSlot;
        }));
    };

    const handleClosedChange = (index: number) => {
        setSchedule(prev => prev.map((slot, i) =>
            i === index ? { ...slot, closed: !slot.closed, startTime: "", endTime: "", error: "" } : slot
        ));
    };

    const getNextDatesForDay = (dayName: string): string[] => {
        
        const dayNameToJsDay: Record<string, number> = {
            'Lunes': 1,      
            'Martes': 2,     
            'Miércoles': 3,  
            'Jueves': 4,     
            'Viernes': 5,    
            'Sábado': 6,     
            'Domingo': 0     
        };
        
        const targetDayNumber = dayNameToJsDay[dayName];
        if (targetDayNumber === undefined) {
            throw new Error(`Día inválido: ${dayName}`);
        }
                
        const baseDate = new Date(startDate);
        baseDate.setHours(12, 0, 0, 0);
        
        const currentDayNumber = baseDate.getDay();
        
        let daysToAdd = (targetDayNumber - currentDayNumber + 7) % 7;
        if (source === 'new' && daysToAdd === 0) {
            daysToAdd = 0;
        } else if (daysToAdd === 0) {
            daysToAdd = 7;
        }
        
        const dates = [];
        for (let i = 0; i < 12; i++) {
            const targetDate = new Date(baseDate);
            targetDate.setHours(12, 0, 0, 0); 
            targetDate.setDate(baseDate.getDate() + daysToAdd + (i * 7));
            
            if (targetDate > endDate) break;
            
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const verifyDate = new Date(`${dateStr}T12:00:00`);
            const verifyDayNumber = verifyDate.getDay();
                        
            if (verifyDayNumber !== targetDayNumber) {
                console.error(`ERROR: Day mismatch! Expected day ${targetDayNumber} but got ${verifyDayNumber} for date ${dateStr}`);
                continue; 
            }
            
            dates.push(dateStr);
        }
        
        return dates;
    };

    const timeOptions = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2)
            .toString()
            .padStart(2, "0");
        const minutes = i % 2 === 0 ? "00" : "30";
        return `${hours}:${minutes}`;
    });

    const getEndTimeOptions = (startTime: string, slotDuration: number | null): string[] => {
        if (!startTime || !slotDuration) return [];
        
        const [hours, minutes] = startTime.split(":").map(Number);
        const startTimeMinutes = hours * 60 + minutes;
        
        return timeOptions.filter(time => {
            const [endHours, endMinutes] = time.split(":").map(Number);
            const endTimeMinutes = endHours * 60 + endMinutes;
            
            if (endTimeMinutes <= startTimeMinutes) return false;
            
            const diffMinutes = endTimeMinutes - startTimeMinutes;
            return diffMinutes % slotDuration === 0;
        });
    };

    const formatTime = (time: string): string => {
        return time ? time.slice(0, 5) : "";
    };

    const fetchExistingTimeSlots = async (): Promise<GetTimeSlot[]> => {
        try {
            const response = await apiClient.get(`/fields/${id}/availability`, {
                headers: { "c-api-key": apiKey },
            });
            return response.data as GetTimeSlot[];
        } catch (error) {
            console.error("❌ Error obteniendo timeSlots existentes:", error);
            return [];
        }
    };


    const syncTimeSlots = async () => {
        try {
            const existingSlots: GetTimeSlot[] = await fetchExistingTimeSlots();

            const today = new Date();
            const twoWeeksFromToday = new Date();
            twoWeeksFromToday.setDate(today.getDate() + 15); 

            const slotsToDelete = existingSlots.filter(slot => {
                const slotDate = new Date(slot.availability_date);
                return slotDate > twoWeeksFromToday;
            });

            if (slotsToDelete.length > 0) {
                const batchSize = 10;
                for (let i = 0; i < slotsToDelete.length; i += batchSize) {
                    const batch = slotsToDelete.slice(i, i + batchSize);

                    await Promise.allSettled(
                        batch.map(slot =>
                            apiClient.delete(`/fields/${id}/availability/${slot.id}`, {
                                headers: { "c-api-key": apiKey },
                            })
                        )
                    );
                }
            }

            const newSlots: Omit<TimeSlot, "id">[] = [];
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            const todayStr = currentTime.toISOString().split('T')[0];

            for (const slot of schedule) {
                if (slot.closed || !slot.startTime || !slot.endTime) continue;

                const slotsToCreate = generateTimeSlots(slot.startTime, slot.endTime, slotDuration!);
                const availabilityDates = getNextDatesForDay(slot.day);

                for (const date of availabilityDates) {
                    for (const timeSlot of slotsToCreate) {
                        if (date === todayStr) {
                            const [slotHour, slotMinute] = timeSlot.startTime.split(':').map(Number);
                            if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
                                continue;
                            }
                        }
                        
                        newSlots.push({
                            availabilityDate: date,
                            startTime: formatTime(timeSlot.startTime),
                            endTime: formatTime(timeSlot.endTime),
                            slotStatus: "available",
                        });
                    }
                }
            }

            if (newSlots.length === 0) {
                console.error("⚠️ No se generaron nuevos time slots.");
                return;
            }

            const batchSize = 10;
            for (let i = 0; i < newSlots.length; i += batchSize) {
                const batch = newSlots.slice(i, i + batchSize);

                await Promise.allSettled(
                    batch.map(slot =>
                        apiClient.post(`/fields/${id}/availability`, slot, {
                            headers: { "c-api-key": apiKey },
                        })
                    )
                );
            }

            console.log("🚀 Todos los time slots han sido creados exitosamente.");
        } catch (error) {
            console.error("❌ Error al sincronizar time slots:", error);
            throw error;
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const errors: string[] = [];
        schedule.forEach((slot, index) => {
            if (!slot.closed && (!slot.startTime || !slot.endTime)) {
                errors[index] = "⚠️ Por favor complete este horario.";
            }
        });

        if (errors.length > 0) {
            setFormErrors(errors);
            setIsLoading(false);
            return;
        }


        try {
            await syncTimeSlots();
            navigate('/fields');
        } catch (error) {
            console.error("❌ Error al actualizar horarios:", error);
            alert("No se pudo actualizar los horarios. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="p-4">
                <Button variant="ghost" onClick={handleBack} className="mb-4">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 mt-[-40px]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl">Asignar horarios</h1>
                    <Button type="submit" className="bg-[#000066] hover:bg-[#000088]" disabled={isLoading}>
                        {isLoading ? "Guardando horarios..." : "Guardar horarios"}
                    </Button>
                </div>

                {isLoading && (
                    <div className="text-center text-blue-600 font-medium my-4">
                        ⏳ Por favor aguarde, se están actualizando los horarios...
                    </div>
                )}

                <div className="max-w-2xl mx-auto mb-4">
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                        <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: dateRangeMessage }}></p>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 rounded-lg shadow-sm">
                    <div className="space-y-4">
                        {schedule.map((slot, index) => (
                            <div key={slot.day} className="p-4 border rounded-lg shadow-sm bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <label className="font-medium">{slot.day}</label>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 border-blue-600 hover:bg-blue-50 flex items-center"
                                            onClick={() => {
                                                setCopyFromDay(slot.day);
                                                setShowDropdown(prev => (prev === slot.day ? null : slot.day));
                                            }}
                                            type="button"
                                        >
                                            <Copy className="w-4 h-4 mr-2"/> Copiar <ChevronDown
                                            className="w-4 h-4 ml-1"/>
                                        </Button>
                                        {showDropdown === slot.day && (
                                            <div
                                                className="absolute top-10 right-0 bg-white border rounded-lg shadow-lg p-4 z-10 w-48">
                                                <label className="block font-medium mb-2 text-sm">
                                                    Copiar a:
                                                </label>
                                                {DAYS_OF_WEEK.filter((day) => day !== slot.day).map((day) => (
                                                    <div key={day} className="flex items-center space-x-2">
                                                        <input type="checkbox" onChange={(e) => {
                                                            setCopyToDays(e.target.checked
                                                                ? [...copyToDays, day]
                                                                : copyToDays.filter(d => d !== day)
                                                            );
                                                        }}/>
                                                        <span>{day}</span>
                                                    </div>
                                                ))}
                                                <Button
                                                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={handleCopySchedule}
                                                    type="button"
                                                >
                                                    Confirmar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={slot.closed}
                                        onChange={() => handleClosedChange(index)}
                                        className="cursor-pointer"
                                    />
                                    <span>No disponible</span>
                                </div>
                                {!slot.closed && (
                                    <div className="flex space-x-4">
                                        <div className="w-1/2">
                                            <label className="block text-sm text-gray-600 mb-1">Hora de apertura</label>
                                            <Select value={slot.startTime}
                                                    onChange={(e) => handleTimeChange(index, "startTime", e.target.value)}>
                                                <option value="">Seleccione...</option>
                                                {timeOptions.map((time) => (
                                                    <option key={time} value={time}>
                                                        {time}
                                                    </option>
                                                ))}
                                            </Select>
                                            {formErrors[index] &&
                                                <p className="text-red-600 text-sm mt-1">{formErrors[index]}</p>}
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-sm text-gray-600 mb-1">Hora de cierre</label>
                                            <Select value={slot.endTime}
                                                    onChange={(e) => handleTimeChange(index, "endTime", e.target.value)}>
                                                <option value="">Seleccione...</option>
                                                {getEndTimeOptions(slot.startTime, slotDuration).map((time) => (
                                                    <option key={time} value={time}>
                                                        {time}
                                                    </option>
                                                ))}
                                            </Select>
                                            {formErrors[index] &&
                                                <p className="text-red-600 text-sm mt-1">{formErrors[index]}</p>}
                                        </div>
                                    </div>
                                )}
                                {slot.error && <p className="text-red-600 text-sm mt-1">{slot.error}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
};