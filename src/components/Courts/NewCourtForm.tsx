import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ChevronLeft } from 'lucide-react';
import apiClient from '@/apiClients';
import { useAuth } from '@/context/AppContext';

export const NewCourtForm = () => {
  const navigate = useNavigate();
  const { clubId } = useAuth();
  const apiKey = localStorage.getItem('c-api-key');

  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    description: '',
    capacity: '',
    slot_duration: 0, // Comienza en 0 minutos
    sports: [] as { id: number; name: string }[],
  });

  const [sports, setSports] = useState<{ id: number; name: string }[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clubId) {
      alert('Error: No hay club asociado.');
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

      await apiClient.post(`/fields`, payload, {
        headers: { 'c-api-key': apiKey },
      });

      alert('✅ Cancha creada con éxito');
      navigate('/courts');
    } catch (error) {
      console.error('❌ Error al crear la cancha:', error);
      setError('No se pudo crear la cancha. Verifica los datos e intenta nuevamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'slot_duration' || name === 'cost' ? Number(value) : value,
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
      navigate('/courts');
    }
  };

  const durationOptions = [15, 30, 60, 90, 120];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? `${hours}:00 hs` : `${hours}:${remainder} hs`;
  };


  return (
      <div>
        <div className="p-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl">Nueva cancha</h1>
            <Button type="submit" className="bg-[#000066] hover:bg-[#000088]">
              Guardar
            </Button>
          </div>

          <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 rounded-lg shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">Nombre:</label>
                <Input type="text" name="name" value={formData.name} onChange={handleInputChange}
                       placeholder="Ingrese el nombre de la cancha" className="w-full" required/>
              </div>

              <div>
                <label className="block mb-2 font-medium">Descripción:</label>
                <Input type="text" name="description" value={formData.description} onChange={handleInputChange}
                       placeholder="Descripción de la cancha" className="w-full" required/>
              </div>

              <div>
                <label className="block mb-2 font-medium">Deporte:</label>
                <Select name="sports" onChange={handleSportChange} className="w-full">
                  <option value="">Seleccione un deporte</option>
                  {sports.map(sport => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                  ))}
                </Select>
                <div className="mt-2">
                  {formData.sports.map(sport => (
                      <div key={sport.id} className="flex justify-between items-center p-2 bg-gray-100 rounded mt-1">
                        <span>{sport.name}</span>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleRemoveSport(sport.id)}>
                          Eliminar
                        </Button>
                      </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium">Costo por hora:</label>
                <Input type="number" name="cost" value={formData.cost} onChange={handleInputChange}
                       placeholder="Ingrese el costo" className="w-full" min="0" required/>
              </div>

              <div>
                <label className="block mb-2 font-medium">Capacidad:</label>
                <Input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange}
                       placeholder="Máximo 30 personas" className="w-full" min="1" max="30" required/>
              </div>

              <div>
                <label className="block mb-2 font-medium">Duración de la franja horaria:</label>
                <Select name="slot_duration" value={formData.slot_duration} onChange={handleInputChange} className="w-full">
                  <option value="0" disabled>Seleccione la duración</option>
                  {durationOptions.map(minutes => (
                      <option key={minutes} value={minutes}>
                        {formatDuration(minutes)}
                      </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          {error && <div className="text-red-600 mt-4 text-center">{error}</div>}
        </form>
      </div>
  );
};
