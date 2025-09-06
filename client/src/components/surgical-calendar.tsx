import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Grid3X3, List, Eye } from 'lucide-react';
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

export function SurgicalCalendar({
  appointments,
  onNewAppointment,
  onEditAppointment,
  onUpdateAppointment,
}: SurgicalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

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

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    console.log('🎯 Drag ended:', { destination, source, draggableId });
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const appointmentId = parseInt(draggableId);
    const appointment = appointments.find(app => app.id === appointmentId);
    
    if (!appointment) return;

    console.log('📋 Appointment found:', appointment);

    // Parse destination information
    const destParts = destination.droppableId.split('-');
    console.log('🎯 Destination parts:', destParts);
    
    if (destParts[0] === 'day') {
      // Moving to a different day
      const destDate = destParts[1];
      const [year, month, day] = destDate.split('-').map(Number);
      const originalTime = appointment.scheduledTime;
      
      if (!originalTime) return;
      
      const [hours, minutes] = originalTime.split(':').map(Number);
      const newDateTime = new Date(year, month - 1, day, hours, minutes);
      
      console.log('📅 Moving to new day:', { destDate, newDateTime: newDateTime.toISOString(), originalTime });
      
      await onUpdateAppointment(appointmentId, {
        scheduledDate: newDateTime,
        scheduledTime: originalTime
      });
    } else if (destParts[0] === 'hour') {
      // Moving to a different hour on the same day
      const [, date, hourStr] = destParts;
      const destHour = parseInt(hourStr);
      const [year, month, day] = date.split('-').map(Number);
      const newTime = `${destHour.toString().padStart(2, '0')}:00`;
      const newDateTime = new Date(year, month - 1, day, destHour, 0);
      
      console.log('⏰ Moving to new time:', { date, destHour, newTime, newDateTime: newDateTime.toISOString() });
      
      await onUpdateAppointment(appointmentId, {
        scheduledDate: newDateTime,
        scheduledTime: newTime
      });
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
      return Math.ceil(appointment.estimatedDuration / 60); // Arredondar para cima
    }
    return 1; // Padrão de 1 hora se não tiver duração
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-8 gap-1">
          {/* Header com horários */}
          <div className="h-12 flex items-center justify-center font-medium text-sm border-b">
            Horários
          </div>
          {weekDays.map((day) => (
            <Droppable key={day.toISOString()} droppableId={`day-${format(day, 'yyyy-MM-dd')}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`h-12 flex flex-col items-center justify-center text-sm font-medium border-b ${
                    isToday(day) ? 'bg-blue-50 text-blue-600' : ''
                  } ${snapshot.isDraggingOver ? 'bg-blue-100' : ''}`}
                >
                  <div>{format(day, 'EEE', { locale: ptBR })}</div>
                  <div className="text-xs">{format(day, 'dd/MM')}</div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}

          {/* Grid de horários */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="h-16 flex items-center justify-center text-sm font-medium border-r bg-gray-50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day) => {
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
                  <Droppable key={`${dayStr}-${hour}`} droppableId={`hour-${dayStr}-${hour}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-16 border border-gray-200 p-1 relative ${
                          snapshot.isDraggingOver ? 'bg-blue-100' : ''
                        } ${occupyingAppointment && !isStartHour ? 'bg-gray-100' : ''}`}
                      >
                        {isStartHour && occupyingAppointment && (
                          <Draggable draggableId={occupyingAppointment.id.toString()} index={0}>
                            {(provided, snapshot) => {
                              const durationHours = getAppointmentDurationHours(occupyingAppointment);
                              const height = durationHours * 64 + (durationHours - 1) * 4; // 64px por hora + gaps
                              
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`absolute left-1 right-1 rounded p-2 text-white text-xs cursor-move z-10 ${getStatusColor(
                                    occupyingAppointment.status
                                  )} ${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}`}
                                  style={{
                                    height: `${height}px`,
                                    ...provided.draggableProps.style
                                  }}
                                  onClick={() => onEditAppointment(occupyingAppointment)}
                                >
                                  <div className="font-medium truncate mb-1">
                                    {occupyingAppointment.scheduledTime} - {durationHours}h
                                  </div>
                                  <div className="space-y-1">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getSurgeryTypeColor(occupyingAppointment.surgeryType || 'eletiva')}`}
                                    >
                                      {occupyingAppointment.surgeryType}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-xs">
                                      <User size={10} />
                                      <span className="truncate">{occupyingAppointment.patientName}</span>
                                    </div>
                                    {occupyingAppointment.priority?.toString() === 'alta' && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <AlertTriangle size={10} />
                                        <span>Urgente</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          </Draggable>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </DragDropContext>
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
      <DragDropContext onDragEnd={handleDragEnd}>
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
              <Droppable key={hour} droppableId={`hour-${format(currentDate, 'yyyy-MM-dd')}-${hour}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex border rounded p-4 ${snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-white'}`}
                  >
                    <div className="w-20 text-sm font-medium text-gray-600">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1">
                      {appointment && (
                        <Draggable draggableId={appointment.id.toString()} index={0}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 rounded cursor-move ${getStatusColor(appointment.status)} text-white ${
                                snapshot.isDragging ? 'opacity-75 shadow-lg' : ''
                              }`}
                              onClick={() => onEditAppointment(appointment)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{appointment.surgeryType}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {appointment.status}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User size={14} />
                                  <span>{appointment.patientName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock size={14} />
                                  <span>{appointment.scheduledTime}</span>
                                </div>
                                {appointment.priority?.toString() === 'alta' && (
                                  <div className="flex items-center gap-2 text-yellow-200">
                                    <AlertTriangle size={14} />
                                    <span>Alta Prioridade</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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