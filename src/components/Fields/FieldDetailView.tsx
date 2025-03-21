import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import apiClient from "@/apiClients";
import { Field } from "@/types/fields";
import { TimeSlot } from "@/types/timeslot.ts";
import { ChevronLeft } from "lucide-react";
import dayjs from "dayjs";
import { DAYS_OF_WEEK } from "../../utils/constants.ts";
import styles from './Fields.module.css';

export const FieldDetailView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const apiKey = localStorage.getItem("c-api-key");

    const [field, setField] = useState<Field | null>(null);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchFieldDetails = async () => {
            try {
                const response = await apiClient.get(`/fields/${id}`, {
                    headers: { "c-api-key": apiKey },
                });

                const fieldData = response.data;

                setField({
                    ...fieldData,
                    cost: fieldData.cost_per_slot, 
                });
                setError(null);
            } catch (error) {
                console.error("❌ Error obteniendo la cancha:", error);
                setError("No se pudo cargar la información de la cancha");
            }
        };

        const fetchTimeSlots = async () => {
            try {
                const nextWeekStart = dayjs().add(7, "day").startOf("week"); // Lunes de la próxima semana
                const nextWeekEnd = nextWeekStart.add(6, "day"); // Domingo de la próxima semana

                const response = await apiClient.get(`/fields/${id}/availability`, {
                    headers: { "c-api-key": apiKey },
                    params: {
                        startDate: nextWeekStart.format("YYYY-MM-DD"),
                        endDate: nextWeekEnd.format("YYYY-MM-DD"),
                    },
                });

                const formattedSlots = response.data.map((slot: any) => ({
                    id: slot.id,
                    fieldId: slot.field_id,
                    availabilityDate: slot.availability_date,
                    startTime: slot.start_time,
                    endTime: slot.end_time,
                    slotStatus: slot.slotStatus,
                }));

                formattedSlots.sort((a: { availabilityDate: string; startTime: string; }, b: { availabilityDate: any; startTime: any; }) => {
                    const dateComparison = a.availabilityDate.localeCompare(b.availabilityDate);
                    if (dateComparison !== 0) return dateComparison;
                    return a.startTime.localeCompare(b.startTime);
                });

                setTimeSlots(formattedSlots);
            } catch (error) {
                console.error("❌ Error obteniendo los horarios:", error);
                setTimeSlots([]);
            }
        };

        setLoading(true);
        Promise.all([fetchFieldDetails(), fetchTimeSlots()])
            .catch(error => {
                console.error("Error fetching data:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    const getOpeningHours = (dayIndex: number) => {
        const referenceDate = dayjs()
            .add(7, "day") // Ir a la próxima semana
            .startOf("week") // Comenzando en domingo
            .add(dayIndex, "day"); // Ajustar correctamente al día

        const formattedDate = referenceDate.format("YYYY-MM-DD");

        const slotsForDay = timeSlots.filter((slot) => slot.availabilityDate === formattedDate);

        if (!slotsForDay.length) return "Cerrado";

        const validSlots = slotsForDay.filter(slot => slot.startTime && slot.endTime);
        if (!validSlots.length) return "Cerrado";

        validSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

        return `${validSlots[0].startTime.substring(0, 5)} - ${validSlots[validSlots.length - 1].endTime.substring(0, 5)}`;
    };


    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8 flex justify-center">
            <div className="max-w-3xl w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/fields")}
                    className="flex items-center text-[#000066] hover:text-[#000088] mb-4"
                >
                    <ChevronLeft className="h-5 w-5 mr-2" /> Volver
                </Button>

                {loading ? (
                    <div className={styles.loadingSpinner}>
                        <p className={styles.loadingText}>Cargando detalles de la cancha</p>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-600 p-4">{error}</div>
                ) : field ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold text-[#000066]">{field.name}</h1>
                            <Button
                                className="bg-[#000066] hover:bg-[#000088] text-white px-4 py-2 rounded-lg shadow-md"
                                onClick={() => navigate(`/fields/${id}/edit`)}
                            >
                                Modificar Cancha
                            </Button>
                        </div>
                        <p className="text-gray-600 mb-2">
                            <strong>Descripción:</strong> {field.description}
                        </p>
                        <p className="text-gray-600 mb-2">
                            <strong>Deportes permitidos:</strong>{" "}
                            {field.sports.length > 0
                                ? field.sports.map((s) => s.name).join(", ")
                                : "No especificado"}
                        </p>
                        <p className="text-gray-600 mb-2">
                            <strong>Costo por reserva:</strong> ${field.cost}
                        </p>
                        <p className="text-gray-600 mb-2">
                            <strong>Capacidad:</strong> {field.capacity} personas
                        </p>
                        <p className="text-gray-600 mb-4">
                            <strong>Duración:</strong> {field.slot_duration} minutos
                        </p>

                        <h2 className="text-xl font-semibold text-[#000066] mt-6 mb-4">Horarios de la semana</h2>
                        <div className="border rounded-lg shadow p-4 bg-gray-50">
                            {DAYS_OF_WEEK.map((day, index) => (
                                <div key={day} className="flex justify-between border-b py-2 last:border-none">
                                    <span className="font-medium">{day}:</span>
                                    <span>{getOpeningHours(index)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>No se encontró la cancha.</div>
                )}
            </div>
        </div>
    );
};