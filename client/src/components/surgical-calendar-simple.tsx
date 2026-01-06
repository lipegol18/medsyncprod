import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Grid3X3, List, Eye, GripVertical } from 'lucide-react';
import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
}

interface SurgicalCalendarProps {
  appointments: SurgeryAppointment[];
  onNewAppointment: () => void;
  onEditAppointment: (appointment: SurgeryAppointment) => void;
  onUpdateAppointment: (appointmentId: number, updates: Partial<SurgeryAppointment>) => void;
}

type ViewMode = 'week' | 'day' | 'month';

interface DraggableAppointmentProps {
  appointment: SurgeryAppointment;
  onEdit: (appointment: SurgeryAppointment) => void;
}

function DraggableAppointment({ appointment, onEdit }: DraggableAppointmentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `appointment-${appointment.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-500';
      case 'em_andamento': return 'bg-yellow-500';
      case 'confirmado': return 'bg-green-500';
      case 'realizado': return 'bg-gray-500';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getSurgeryTypeColor = (surgeryType: string) => {
    switch (surgeryType) {
      case 'urgencia': return 'bg-red-500';
      case 'emergencia': return 'bg-red-600';
      case 'eletiva': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getAppointmentDurationHours = (): number => {
    if (appointment.estimatedDuration) {
      return Math.ceil(appointment.estimatedDuration / 60);
    }
    return 1;
  };

  const durationHours = getAppointmentDurationHours();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute left-1 right-1 rounded p-2 text-white text-xs cursor-move z-10 ${getStatusColor(
        appointment.status
      )} hover:shadow-lg transition-shadow`}
      onClick={() => onEdit(appointment)}
      {...attributes}
      {...listeners}
    >
      <div className="font-medium truncate mb-1 flex items-center gap-1">
        <GripVertical size={10} />
        {appointment.scheduledTime} - {durationHours}h
      </div>
      <div className="space-y-1">
        <Badge 
          variant="secondary" 
          className={`text-xs ${getSurgeryTypeColor(appointment.surgeryType || 'eletiva')}`}
        >
          {appointment.surgeryType}
        </Badge>
        <div className="flex items-center gap-1 text-xs">
          <User size={10} />
          <span className="truncate">{appointment.patientName}</span>
        </div>
        {appointment.priority?.toString() === 'alta' && (
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle size={10} />
            <span>Urgente</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DroppableSlotProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DroppableSlot({ id, children, className = "" }: DroppableSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-16 border border-gray-200 p-1 transition-colors ${className} ${
        isOver ? 'bg-blue-100 border-blue-300' : ''
      }`}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 opacity-50 rounded-md flex items-center justify-center">
          <div className="text-xs text-blue-600 font-medium">Soltar aqui</div>
        </div>
      )}
    </div>
  );
}

export function SurgicalCalendar({
  appointments,
  onNewAppointment,
  onEditAppointment,
  onUpdateAppointment,
}: SurgicalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    console.log('🚀 Drag started:', event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    console.log('🎯 Drag ended:', { active: active.id, over: over?.id });

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    // Extrair ID do appointment
    const appointmentId = parseInt((active.id as string).replace('appointment-', ''));
    const appointment = appointments.find(app => app.id === appointmentId);
    
    if (!appointment) {
      console.log('❌ Appointment not found:', appointmentId);
      return;
    }

    // Parse destination information
    const overId = over.id as string;
    const destParts = overId.split('-');
    console.log('🎯 Destination parts:', destParts);
    
    if (destParts[0] === 'hour') {
      // Moving to a different hour slot
      const [, date, hourStr] = destParts;
      const destHour = parseInt(hourStr);
      const [year, month, day] = date.split('-').map(Number);
      const newTime = `${destHour.toString().padStart(2, '0')}:00`;
      const newDateTime = new Date(year, month - 1, day, destHour, 0);
      
      console.log('⏰ Moving to new time:', { date, destHour, newTime, newDateTime: newDateTime.toISOString() });
      
      try {
        await onUpdateAppointment(appointmentId, {
          scheduledDate: newDateTime,
          scheduledTime: newTime
        });
        console.log('✅ Appointment updated successfully');
      } catch (error) {
        console.error('❌ Error updating appointment:', error);
      }
    } else if (destParts[0] === 'day') {
      // Moving to a different day (keeping original time)
      const destDate = destParts[1];
      const [year, month, day] = destDate.split('-').map(Number);
      const originalTime = appointment.scheduledTime;
      
      if (!originalTime) {
        console.log('❌ No original time found');
        return;
      }
      
      const [hours, minutes] = originalTime.split(':').map(Number);
      const newDateTime = new Date(year, month - 1, day, hours, minutes);
      
      console.log('📅 Moving to new day:', { destDate, newDateTime: newDateTime.toISOString(), originalTime });
      
      try {
        await onUpdateAppointment(appointmentId, {
          scheduledDate: newDateTime,
          scheduledTime: originalTime
        });
        console.log('✅ Appointment updated successfully');
      } catch (error) {
        console.error('❌ Error updating appointment:', error);
      }
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
        break;
    }
  };

  // Função para calcular quantas horas uma cirurgia ocupa
  const getAppointmentDurationHours = (appointment: SurgeryAppointment): number => {
    if (appointment.estimatedDuration) {
      return Math.ceil(appointment.estimatedDuration / 60);
    }
    return 1;
  };

  // Função para verificar se uma hora está ocupada por uma cirurgia
  const isHourOccupiedByAppointment = (day: Date, hour: number): SurgeryAppointment | null => {
    for (const appointment of appointments) {
      if (!appointment.scheduledDate || !appointment.scheduledTime) continue;
      
      const appDate = typeof appointment.scheduledDate === 'string' ? parseISO(appointment.scheduledDate) : appointment.scheduledDate;
      if (!isSameDay(appDate, day)) continue;
      
      const [appHour] = appointment.scheduledTime.split(':').map(Number);
      const durationHours = getAppointmentDurationHours(appointment);
      
      // Verificar se esta hora está dentro do range da cirurgia
      if (hour >= appHour && hour < appHour + durationHours) {
        return appointment;
      }
    }
    return null;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h às 20h

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-8 gap-1">
          {/* Header com horários */}
          <div className="h-12 flex items-center justify-center font-medium text-sm border-b">
            Horários
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`h-12 flex flex-col items-center justify-center text-sm font-medium border-b ${
                isToday(day) ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div className="text-xs">{format(day, 'dd/MM')}</div>
            </div>
          ))}

          {/* Grid de horários */}
          {hours.map((hour) => [
            <div key={`hour-${hour}`} className="h-16 flex items-center justify-center text-sm font-medium border-r bg-gray-50">
              {hour.toString().padStart(2, '0')}:00
            </div>,
            ...weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const occupyingAppointment = isHourOccupiedByAppointment(day, hour);
              
              // Verificar se é o horário de início da cirurgia (para renderizar o card)
              const isStartHour = occupyingAppointment && (() => {
                const appDate = typeof occupyingAppointment.scheduledDate === 'string' 
                  ? parseISO(occupyingAppointment.scheduledDate) 
                  : occupyingAppointment.scheduledDate;
                const [appHour] = occupyingAppointment.scheduledTime!.split(':').map(Number);
                return isSameDay(appDate, day) && appHour === hour;
              })();

              return (
                <DroppableSlot
                  key={`${dayStr}-${hour}`}
                  id={`hour-${dayStr}-${hour}`}
                  className={`${occupyingAppointment && !isStartHour ? 'bg-gray-100' : ''}`}
                >
                  {isStartHour && occupyingAppointment && (
                    <DraggableAppointment
                      appointment={occupyingAppointment}
                      onEdit={onEditAppointment}
                    />
                  )}
                </DroppableSlot>
              );
            })
          ]).flat()}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <div className="bg-blue-500 text-white p-2 rounded shadow-lg opacity-90">
              Movendo agendamento...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);
    const dayAppointments = appointments.filter(app => {
      if (!app.scheduledDate) return false;
      const appDate = typeof app.scheduledDate === 'string' ? parseISO(app.scheduledDate) : app.scheduledDate;
      return isSameDay(appDate, currentDate);
    });

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          <div className="text-center font-semibold text-lg mb-4">
            {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          {hours.map((hour) => {
            const appointment = dayAppointments.find(app => {
              if (!app.scheduledTime) return false;
              const [appHour] = app.scheduledTime.split(':').map(Number);
              return appHour === hour;
            });

            return (
              <DroppableSlot
                key={hour}
                id={`hour-${format(currentDate, 'yyyy-MM-dd')}-${hour}`}
                className="flex border rounded p-4 bg-white"
              >
                <div className="w-20 text-sm font-medium text-gray-600">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1">
                  {appointment && (
                    <DraggableAppointment
                      appointment={appointment}
                      onEdit={onEditAppointment}
                    />
                  )}
                </div>
              </DroppableSlot>
            );
          })}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <div className="bg-blue-500 text-white p-2 rounded shadow-lg opacity-90">
              Movendo agendamento...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'agendado': return 'bg-blue-500';
        case 'em_andamento': return 'bg-yellow-500';
        case 'confirmado': return 'bg-green-500';
        case 'realizado': return 'bg-gray-500';
        case 'cancelado': return 'bg-red-500';
        default: return 'bg-gray-400';
      }
    };

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Headers dos dias da semana */}
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600 border-b">
            {day}
          </div>
        ))}
        
        {/* Preencher dias vazios do início do mês */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
          <div key={`empty-${i}`} className="h-24 border bg-gray-50"></div>
        ))}
        
        {/* Dias do mês */}
        {calendarDays.map((day) => {
          const dayAppointments = appointments.filter(app => {
            if (!app.scheduledDate) return false;
            const appDate = typeof app.scheduledDate === 'string' ? parseISO(app.scheduledDate) : app.scheduledDate;
            return isSameDay(appDate, day);
          });

          return (
            <div
              key={day.toISOString()}
              className={`h-24 border p-1 ${isToday(day) ? 'bg-blue-50' : 'bg-white'} cursor-pointer hover:bg-gray-50`}
              onClick={() => {
                setCurrentDate(day);
                setViewMode('day');
              }}
            >
              <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
              <div className="space-y-1 overflow-hidden">
                {dayAppointments.slice(0, 2).map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`text-xs px-1 py-0.5 rounded text-white truncate ${getStatusColor(appointment.status)}`}
                  >
                    {appointment.scheduledTime} - {appointment.patientName}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayAppointments.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getDateRangeText = () => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - ${format(addDays(weekStart, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case 'day':
        return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com navegação e controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
            <ChevronLeft size={16} />
          </Button>
          <h3 className="text-lg font-semibold min-w-96 text-center">
            {getDateRangeText()}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botões de visualização */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              <Eye size={14} className="mr-1" />
              Dia
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              <List size={14} className="mr-1" />
              Semana
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 size={14} className="mr-1" />
              Mês
            </Button>
          </div>

          <Button onClick={onNewAppointment} className="flex items-center gap-2">
            <Calendar size={16} />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Conteúdo do calendário */}
      <Card className="p-4">
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'month' && renderMonthView()}
      </Card>
    </div>
  );
}