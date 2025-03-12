import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ChevronLeft } from 'lucide-react';
import apiClient from '@/apiClients';
import { useAuth } from '@/context/AppContext';

export const NewFieldsForm = () => {
  const navigate = useNavigate();
  const { clubId } = useAuth();
  const apiKey = localStorage.getItem('c-api-key');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    description: '',
    capacity: '',
    slot_duration: '',
    sports: [] as { id: number; name: string }[],
  });

  const [sports, setSports] = useState<{ id: number; name: string }[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await apiClient.get('/sports', {
          headers: { 'c-api-key': apiKey },
        });
        setSports(response.data);
      } catch (error) {
        console.error('❌ Error obteniendo deportes:', error);
      }
    };

    fetchSports();
  }, []);

  const validateFields = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) errors.name = "El nombre es obligatorio.";
    if (!formData.description.trim()) errors.description = "La descripción es obligatoria.";
    if (!formData.cost || isNaN(Number(formData.cost))) errors.cost = "Ingrese un costo válido.";
    if (!formData.capacity || isNaN(Number(formData.capacity)) || Number(formData.capacity) < 1 || Number(formData.capacity) > 30) {
      errors.capacity = "La capacidad debe estar entre 1 y 30.";
    }
    if (!formData.slot_duration || isNaN(Number(formData.slot_duration))) errors.slot_duration = "Ingrese una duración válida.";
    if (Number(formData.slot_duration) > 0 && Number(formData.slot_duration) % 30 !== 0) errors.slot_duration = "La duración debe ser múltiplo de 30.";
    if (formData.sports.length === 0) errors.sports = "Seleccione al menos un deporte.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!validateFields()) {
      setIsLoading(false);
      return;
    }

    if (!clubId) {
      alert('Error: No hay club asociado.');
      setIsLoading(false);
      return;
    }

    const parsedCapacity = parseInt(formData.capacity, 10);
    const parsedCost = parseFloat(formData.cost);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        cost: parsedCost,
        capacity: parsedCapacity,
        slot_duration: formData.slot_duration,
        sportIds: formData.sports.map(sport => sport.id),
      };

      const response = await apiClient.post(`/fields`, payload, {
        headers: { 'c-api-key': apiKey },
      });

      const id = response.data.id;
      navigate(`/fields/${id}/schedule`, { state: { source: 'new' } });
    } catch (error) {
      console.error('❌ Error al crear la cancha:', error);
      setError('No se pudo crear la cancha. Verifica los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    setHasChanges(true);
  };

  const handleSportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value, 10);
    const selectedSport = sports.find(s => s.id === selectedId);

    if (selectedSport && !formData.sports.some(s => s.id === selectedId)) {
      setFormData(prev => ({
        ...prev,
        sports: [...prev.sports, selectedSport],
      }));
      setHasChanges(true);
    }
  };

  const handleRemoveSport = (id: number) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.filter(sport => sport.id !== id),
    }));
    setHasChanges(true);
  };

  const handleBack = () => {
    if (!hasChanges || window.confirm('¿Está seguro que desea volver? Los cambios no guardados se perderán.')) {
      navigate('/fields');
    }
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-8 flex justify-center">
        <div className="max-w-3xl w-full">
          <div className="mb-6">
            <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center text-[#000066] hover:text-[#000088]"
            >
              <ChevronLeft className="h-5 w-5 mr-2" /> Volver
            </Button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h1 className="text-2xl font-bold text-[#000066] mb-6">Nueva Cancha</h1>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <InputField label="Nombre:" name="name" value={formData.name} onChange={handleInputChange} error={formErrors.name} />
              <InputField label="Descripción:" name="description" value={formData.description} onChange={handleInputChange} error={formErrors.description} />

              {/* Deportes */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Deporte:</label>
                <Select name="sports" onChange={handleSportChange} className="w-full">
                  <option value="">Seleccione un deporte</option>
                  {sports.map(sport => (
                      <option key={sport.id} value={sport.id}>{sport.name}</option>
                  ))}
                </Select>
                <div className="mt-2 space-y-2">
                  {formData.sports.map(sport => (
                      <div key={sport.id} className="flex justify-between items-center bg-blue-100 text-blue-800 p-2 rounded-lg">
                        <span>{sport.name}</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleRemoveSport(sport.id)}>
                          Eliminar
                        </Button>
                      </div>
                  ))}
                </div>
                {formErrors.sports && <p className="text-red-600 text-sm">{formErrors.sports}</p>}
              </div>

              <InputField label="Costo por turno:" name="cost" type="number" value={formData.cost} onChange={handleInputChange} error={formErrors.cost} />
              <InputField label="Capacidad:" name="capacity" type="number" value={formData.capacity} onChange={handleInputChange} error={formErrors.capacity} />
              <InputField label="Duración del turno (en minutos):" name="slot_duration" type="number" value={formData.slot_duration} onChange={handleInputChange} error={formErrors.slot_duration} />

              {error && <div className="text-red-600 mt-4 text-center">{error}</div>}

              <div className="flex justify-center mt-6">
                <Button type="submit" className="bg-[#000066] hover:bg-[#000088]" disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Asignar horarios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
};
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, error, ...props }) => (
    <div>
      <label className="block font-medium text-gray-700 mb-1">{label}</label>
      <Input className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-300" {...props} />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
);