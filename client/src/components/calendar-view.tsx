import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  User,
  MapPin,
  Plus
} from 'lucide-react';
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
}

interface CalendarViewProps {
  appointments: SurgeryAppointment[];
  onNewAppointment: () => void;
  onEditAppointment: (appointment: SurgeryAppointment) => void;
  onUpdateAppointment: (appointmentId: number, updates: Partial<SurgeryAppointment>) => void;
}

type ViewType = 'month' | 'week' | 'day';

export function CalendarView({ appointments, onNewAppointment, onEditAppointment, onUpdateAppointment }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewType === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const getDateRange = () => {
    if (viewType === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = typeof appointment.scheduledDate === 'string' 
        ? parseISO(appointment.scheduledDate)
        : appointment.scheduledDate;
      return isSameDay(appointmentDate, date);
    });
  };

  // Função para calcular quais horas o agendamento ocupa baseado na duração
  const getAppointmentHours = (appointment: SurgeryAppointment) => {
    const startHour = parseInt(appointment.scheduledTime.split(':')[0]);
    const startMinute = parseInt(appointment.scheduledTime.split(':')[1]);
    const durationMinutes = appointment.estimatedDuration;
    
    // Calcular quantas horas completas o agendamento ocupa
    const totalMinutes = startMinute + durationMinutes;
    const endHour = startHour + Math.ceil(totalMinutes / 60);
    
    // Retornar array com todas as horas que o agendamento ocupa
    const hours = [];
    for (let h = startHour; h < endHour && h < 24; h++) {
      hours.push(h);
    }
    return hours;
  };

  // Função para verificar se uma hora específica está ocupada por um agendamento
  const isHourOccupiedByAppointment = (appointment: SurgeryAppointment, hour: number) => {
    const appointmentHours = getAppointmentHours(appointment);
    return appointmentHours.includes(hour);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-500';
      case 'confirmado': return 'bg-green-500';
      case 'realizado': return 'bg-gray-500';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'border-red-500';
      case 'media': return 'border-yellow-500';
      case 'baixa': return 'border-green-500';
      default: return 'border-gray-300';
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

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    console.log('🔄 Drag ended:', { destination, source, draggableId });
    console.log('🔄 Full result object:', JSON.stringify(result, null, 2));
    
    if (!destination) {
      console.log('❌ No destination found');
      return;
    }
    
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('❌ Same position, no change needed');
      return;
    }

    const appointmentId = parseInt(draggableId);
    const appointment = appointments.find(app => app.id === appointmentId);
    
    if (!appointment) {
      console.log('❌ Appointment not found:', appointmentId);
      console.log('📋 Available appointments:', appointments.map(a => ({ id: a.id, time: a.scheduledTime })));
      return;
    }

    console.log('📋 Found appointment:', appointment);
    console.log('🔄 About to call onUpdateAppointment function');

    // Parse destination information
    const destParts = destination.droppableId.split('-');
    const destType = destParts[0]; // 'day' or 'hour'
    
    console.log('🎯 Destination parts:', destParts);
    console.log('📅 Destination type:', destType);
    
    if (destType === 'day') {
      const destDate = destParts[1];
      console.log('📅 Updating to date:', destDate);
      
      // Validate destDate format
      if (!destDate || !destDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.error('❌ Invalid date format:', destDate);
        return;
      }
      
      // Converter a data para timestamp com a hora atual do agendamento
      const originalTime = appointment.scheduledTime;
      if (!originalTime) {
        console.error('❌ No original time found');
        return;
      }
      
      const [hours, minutes] = originalTime.split(':');
      
      // Parse the date string properly to avoid timezone issues
      const [year, month, day] = destDate.split('-').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) {
        console.error('❌ Invalid date components:', { year, month, day, hours, minutes });
        return;
      }
      
      const newDateTime = new Date(year, month - 1, day); // month is 0-indexed
      
      // Check if date is valid
      if (isNaN(newDateTime.getTime())) {
        console.error('❌ Invalid date created');
        return;
      }
      
      newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log('📅 Created new date:', newDateTime.toISOString());
      console.log('🔄 Calling onUpdateAppointment with date update:', { appointmentId, scheduledDate: newDateTime });
      
      onUpdateAppointment(appointmentId, {
        scheduledDate: newDateTime
      });
    } else if (destType === 'hour') {
      const destDate = destParts[1];
      const destHour = parseInt(destParts[2]);
      
      console.log('📅 Updating to date:', destDate, 'hour:', destHour);
      
      // Validate inputs
      if (!destDate || !destDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.error('❌ Invalid date format:', destDate);
        return;
      }
      
      if (isNaN(destHour) || destHour < 0 || destHour > 23) {
        console.error('❌ Invalid hour:', destHour);
        return;
      }
      
      const newTime = `${String(destHour).padStart(2, '0')}:00`;
      
      // Parse the date string properly to avoid timezone issues
      const [year, month, day] = destDate.split('-').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error('❌ Invalid date components:', { year, month, day });
        return;
      }
      
      const newDateTime = new Date(year, month - 1, day); // month is 0-indexed
      
      // Check if date is valid
      if (isNaN(newDateTime.getTime())) {
        console.error('❌ Invalid date created');
        return;
      }
      
      newDateTime.setHours(destHour, 0, 0, 0);
      
      console.log('📅 Created new date:', newDateTime.toISOString());
      console.log('🔄 Calling onUpdateAppointment with time update:', { appointmentId, scheduledDate: newDateTime, scheduledTime: newTime });
      
      onUpdateAppointment(appointmentId, {
        scheduledDate: newDateTime,
        scheduledTime: newTime
      });
    } else {
      console.log('❌ Unknown destination type:', destType);
    }
  };

  const formatTitle = () => {
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, 'dd MMMM yyyy', { locale: ptBR });
    }
  };

  const renderMonthView = () => {
    const days = getDateRange();
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Cabeçalho dos dias da semana */}
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center font-semibold text-sm bg-gray-100 text-gray-800">
            {day}
          </div>
        ))}
        
        {/* Dias do mês */}
        {days.map(day => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div 
              key={day.toISOString()} 
              className={`min-h-[120px] p-1 border border-gray-200 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              } ${isToday ? 'text-blue-600' : ''}`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(appointment => (
                  <div 
                    key={appointment.id}
                    onClick={() => onEditAppointment(appointment)}
                    className={`text-xs p-1 rounded cursor-pointer border-l-2 ${getSurgeryTypeColor(appointment.surgeryType)} ${getPriorityColor(String(appointment.priority || '3'))} bg-opacity-20 hover:bg-opacity-30 transition-colors`}
                  >
                    <div className="font-medium truncate text-gray-800">
                      {appointment.scheduledTime}
                    </div>
                    <div className="text-gray-600 truncate">
                      {appointment.surgeryType}
                    </div>
                    {appointment.patientName && (
                      <div className="text-gray-500 truncate text-[10px] mt-0.5">
                        {appointment.patientName}
                      </div>
                    )}
                  </div>
                ))}
                
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 p-1">
                    +{dayAppointments.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getDateRange();
    
    // Implementar drag and drop para visualização semanal
    return (
      <DragDropContext 
        onDragEnd={handleDragEnd}
        onDragStart={(start) => {
          console.log('🚀 Drag started in week view:', start);
        }}
      >
        <div className="bg-white rounded-lg shadow-sm">
          {/* Cabeçalho */}
          <div className="grid grid-cols-8 gap-1 border-b border-gray-200">
            <div className="p-3 text-center font-semibold text-sm text-gray-800 bg-gray-50">
              Horário
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className="p-3 text-center bg-gray-50">
                <div className="font-semibold text-sm text-gray-800">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className="text-xs text-gray-600">
                  {format(day, 'dd/MM')}
                </div>
              </div>
            ))}
          </div>

          {/* Corpo do calendário */}
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="grid grid-cols-8 gap-1 min-h-[60px]">
                {/* Coluna de horário */}
                <div className="p-2 text-center text-xs text-gray-500 bg-gray-25 border-r border-gray-100 flex items-center justify-center">
                  <span className="font-medium">{String(hour).padStart(2, '0')}:00</span>
                </div>
                
                {/* Colunas dos dias */}
                {days.map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForDate(day);
                  
                  // Encontrar agendamentos que começam exatamente nesta hora
                  const appointmentsStartingHere = dayAppointments.filter(app => {
                    const [appHour] = app.scheduledTime.split(':').map(Number);
                    return appHour === hour;
                  });
                  
                  const droppableId = `hour-${format(day, 'yyyy-MM-dd')}-${hour}`;
                  
                  return (
                    <Droppable key={`${day.toISOString()}-${hour}`} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`relative p-1 border-r border-gray-100 min-h-[60px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          {appointmentsStartingHere.map((appointment, index) => {
                            const [startHour, startMinute] = appointment.scheduledTime.split(':').map(Number);
                            const totalMinutes = startHour * 60 + startMinute + appointment.estimatedDuration;
                            const endHour = Math.floor(totalMinutes / 60);
                            const endMinute = totalMinutes % 60;
                            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
                            
                            // Calcular altura baseada na duração
                            const durationInHours = appointment.estimatedDuration / 60;
                            const blockHeight = Math.max(durationInHours * 60, 50); // Mínimo 50px
                            
                            return (
                              <Draggable 
                                key={appointment.id} 
                                draggableId={appointment.id.toString()} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`absolute inset-x-1 top-1 rounded-md p-2 text-xs cursor-move transition-all hover:shadow-lg z-10 ${
                                      getSurgeryTypeColor(appointment.surgeryType)
                                    } ${getPriorityColor(String(appointment.priority || '3'))} bg-opacity-60 hover:bg-opacity-80 ${
                                      snapshot.isDragging ? 'shadow-2xl transform scale-105 z-50' : ''
                                    }`}
                                    style={{
                                      height: `${blockHeight}px`,
                                      top: `${(startMinute / 60) * 60}px`, // Offset baseado nos minutos
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditAppointment(appointment);
                                    }}
                                  >
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="w-full h-full"
                                    >
                                      <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
                                        <div className="flex flex-col gap-[1px]">
                                          <div className="w-[3px] h-[3px] bg-gray-600 rounded-full"></div>
                                          <div className="w-[3px] h-[3px] bg-gray-600 rounded-full"></div>
                                          <div className="w-[3px] h-[3px] bg-gray-600 rounded-full"></div>
                                        </div>
                                        <span className="text-[10px]">{appointment.scheduledTime} - {endTime}</span>
                                      </div>
                                      <div className="text-gray-700 font-medium text-[10px] mb-1">
                                        {appointment.surgeryType}
                                      </div>
                                      {appointment.patientName && (
                                        <div className="text-gray-600 text-[9px] font-medium mb-1">
                                          {appointment.patientName}
                                        </div>
                                      )}
                                      <div className="text-gray-500 text-[8px]">
                                        {appointment.estimatedDuration}min
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          
                          {/* Mostrar indicador visual quando uma área está disponível para drop */}
                          {snapshot.isDraggingOver && (
                            <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 opacity-50 rounded-md flex items-center justify-center">
                              <div className="text-xs text-blue-600 font-medium">Soltar aqui</div>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <DragDropContext 
        onDragEnd={handleDragEnd}
        onDragStart={(start) => {
          console.log('🚀 Drag started:', start);
        }}
      >
        <div className="space-y-2">
          {hours.map(hour => {
            const hourAppointments = dayAppointments.filter(app => {
              const appointmentHour = parseInt(app.scheduledTime.split(':')[0]);
              return appointmentHour === hour;
            });

            const droppableId = `hour-${format(currentDate, 'yyyy-MM-dd')}-${hour}`;

            return (
              <div key={hour} className="flex border-b border-gray-200 pb-2 bg-white">
                <div className="w-20 text-sm text-gray-500 text-right pr-4 pt-1">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <Droppable droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[60px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {hourAppointments.map((appointment, index) => (
                        <Draggable 
                          key={appointment.id} 
                          draggableId={appointment.id.toString()} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-3 rounded-lg mb-2 border-l-4 transition-colors ${
                                getSurgeryTypeColor(appointment.surgeryType)
                              } ${getPriorityColor(String(appointment.priority || '3'))} bg-opacity-20 hover:bg-opacity-30 ${
                                snapshot.isDragging ? 'shadow-lg transform rotate-2' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="flex items-center gap-2 cursor-move"
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <div className="font-medium text-sm text-gray-800">
                                    {appointment.scheduledTime} - {(() => {
                                      const [startHour, startMinute] = appointment.scheduledTime.split(':').map(Number);
                                      const totalMinutes = startHour * 60 + startMinute + appointment.estimatedDuration;
                                      const endHour = Math.floor(totalMinutes / 60);
                                      const endMinute = totalMinutes % 60;
                                      return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
                                    })()} - {appointment.surgeryType}
                                  </div>
                                  {appointment.patientName && (
                                    <div className="text-xs text-gray-600 font-normal">
                                      Paciente: {appointment.patientName}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {appointment.status}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditAppointment(appointment);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-gray-200"
                                  >
                                    <User size={12} />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  Duração: {appointment.estimatedDuration}min
                                </div>
                                {appointment.surgeryRoom && (
                                  <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    Sala: {appointment.surgeryRoom}
                                  </div>
                                )}
                                {appointment.notes && (
                                  <div className="mt-1 text-xs italic">
                                    {appointment.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  return (
    <Card className="w-full bg-white dark:bg-white">
      <CardHeader className="bg-white dark:bg-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Calendar size={20} />
            Agenda Cirúrgica
          </CardTitle>
          <Button onClick={onNewAppointment} size="sm">
            <Plus size={16} className="mr-2" />
            Novo Agendamento
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft size={16} />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center text-gray-900">
              {formatTitle()}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight size={16} />
            </Button>
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant={viewType === 'month' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewType('month')}
            >
              Mês
            </Button>
            <Button 
              variant={viewType === 'week' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewType('week')}
            >
              Semana
            </Button>
            <Button 
              variant={viewType === 'day' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewType('day')}
            >
              Dia
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="bg-white dark:bg-white">
        <div className="overflow-x-auto">
          {viewType === 'month' && renderMonthView()}
          {viewType === 'week' && renderWeekView()}
          {viewType === 'day' && renderDayView()}
        </div>
      </CardContent>
    </Card>
  );
}