import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, User, Clock, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';

// Configurar moment para português brasileiro
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// Criar componente de calendário com drag-and-drop
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
  surgicalProcedureName?: string | null;
  surgicalApproachName?: string | null;
  procedureType?: string | null;
}

interface SurgicalCalendarBigProps {
  appointments: SurgeryAppointment[];
  onNewAppointment: () => void;
  onEditAppointment: (appointment: SurgeryAppointment) => void;
  onUpdateAppointment: (appointmentId: number, updates: Partial<SurgeryAppointment>) => void;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: SurgeryAppointment;
}

export function SurgicalCalendarBig({
  appointments,
  onNewAppointment,
  onEditAppointment,
  onUpdateAppointment,
}: SurgicalCalendarBigProps) {
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Função para obter dias do mês para visualização customizada
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0);
    
    // Ajustar para começar no domingo (dia 0)
    const startDay = firstDay.getDay();
    const endDate = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Adicionar dias vazios antes do início do mês
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Adicionar todos os dias do mês
    for (let i = 1; i <= endDate; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Converter agendamentos para eventos do react-big-calendar (sem duplicação)
  const events: CalendarEvent[] = useMemo(() => {
    // Criar um Map para garantir unicidade por ID
    const uniqueMap = new Map<number, SurgeryAppointment>();
    
    appointments.forEach(appointment => {
      if (appointment.id) {
        uniqueMap.set(appointment.id, appointment);
      }
    });
    
    const uniqueAppointments = Array.from(uniqueMap.values());

    const processedEvents = uniqueAppointments.map(appointment => {
      if (!appointment.scheduledDate || !appointment.scheduledTime) {
        return null;
      }

      // Parse date in local timezone
      const dateStr = typeof appointment.scheduledDate === 'string' 
        ? appointment.scheduledDate 
        : appointment.scheduledDate.toISOString();
      
      // Extract YYYY-MM-DD
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
      
      // Create date in local timezone
      const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      const end = new Date(start);
      const duration = appointment.estimatedDuration || 60;
      end.setMinutes(end.getMinutes() + duration);

      // Formatar título igual à home
      const procedureInfo = appointment.surgicalProcedureName && appointment.surgicalApproachName
        ? `${appointment.surgicalProcedureName} - ${appointment.surgicalApproachName}`
        : appointment.surgicalProcedureName || appointment.surgicalApproachName || 'Procedimento não especificado';
      
      return {
        id: appointment.id!,
        title: `${appointment.patientName || 'Paciente'} - ${procedureInfo}`,
        start,
        end,
        resource: appointment,
      };
    }).filter(Boolean) as CalendarEvent[];

    return processedEvents;
  }, [appointments]);

  // Customizar aparência dos eventos
  const eventStyleGetter = (event: any) => {
    const { status, surgeryType, priority } = event.resource;
    
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    
    // Cores baseadas no status
    switch (status) {
      case 'agendado':
        backgroundColor = '#3b82f6';
        borderColor = '#2563eb';
        break;
      case 'confirmado':
        backgroundColor = '#10b981';
        borderColor = '#059669';
        break;
      case 'em_andamento':
        backgroundColor = '#f59e0b';
        borderColor = '#d97706';
        break;
      case 'concluido':
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
        break;
      case 'cancelado':
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
        break;
    }

    // Destacar urgências
    if (surgeryType === 'urgencia' || surgeryType === 'emergencia') {
      backgroundColor = '#dc2626';
      borderColor = '#b91c1c';
    }

    let borderWidth = '1px';
    if (priority === 3) { // Alta prioridade
      borderColor = '#dc2626';
      borderWidth = '3px';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: priority === 3 ? '3px' : '1px',
        color: 'white',
        borderRadius: '6px',
        border: 'none',
        fontSize: '12px',
        fontWeight: '500',
      },
    };
  };

  // Componente para eventos de semana/dia
  const EventComponent = ({ event }: { event: any }) => {
    const { patientName, surgicalProcedureName, surgicalApproachName, priority } = event.resource;
    
    // Formatar procedimento e conduta igual à home
    const procedureInfo = surgicalProcedureName && surgicalApproachName
      ? `${surgicalProcedureName} - ${surgicalApproachName}`
      : surgicalProcedureName || surgicalApproachName || 'Procedimento não especificado';
    
    return (
      <div className="p-1 h-full">
        <div className="font-medium text-xs mb-1 flex items-center gap-1">
          <User size={10} />
          <span className="truncate">{patientName}</span>
        </div>
        <div className="text-xs opacity-90 flex items-center gap-1">
          <Clock size={10} />
          <span className="truncate">{procedureInfo}</span>
        </div>
        {priority === 3 && (
          <div className="flex items-center gap-1 text-xs mt-1">
            <AlertTriangle size={10} />
            <span>Urgente</span>
          </div>
        )}
      </div>
    );
  };

  // Componente customizado para visualização de Agenda (lista)
  const AgendaEvent = ({ event }: { event: any }) => {
    const { 
      patientName, 
      surgeryType, 
      estimatedDuration,
      medicalOrderProcedureType,
      surgicalProcedureName,
      surgicalApproachName,
      procedureType
    } = event.resource;
    
    const surgeryTypeLabel = procedureType === 'eletiva' ? 'Eletiva' : 
                             procedureType === 'urgencia' ? 'Urgência' : 
                             procedureType === 'emergencia' ? 'Emergência' : 'Eletiva';
    
    const surgeryTypeColor = procedureType === 'eletiva' ? 'bg-blue-100 text-blue-700' :
                             procedureType === 'urgencia' ? 'bg-red-100 text-red-700' :
                             procedureType === 'emergencia' ? 'bg-red-100 text-red-700' :
                             'bg-blue-100 text-blue-700';
    
    // Formatar procedimento igual à home
    const procedimentoCompleto = (surgicalProcedureName || surgicalApproachName) 
      ? (surgicalProcedureName && surgicalApproachName 
          ? `${surgicalProcedureName} - ${surgicalApproachName}` 
          : surgicalProcedureName || surgicalApproachName)
      : medicalOrderProcedureType || surgeryType || '';
    
    return (
      <div 
        className="grid grid-cols-7 gap-4 px-3 py-2 rounded-lg border-gray-200 border cursor-pointer hover:shadow-md transition-all duration-200 bg-muted/50 hover:bg-accent/10"
        onClick={() => onEditAppointment(event.resource)}
      >
        {/* Coluna 1-3: Nome do Paciente e Procedimentos */}
        <div className="col-span-3 flex flex-col">
          <span className="font-semibold text-sm">
            {patientName || 'Paciente não encontrado'}
          </span>
          {procedimentoCompleto && (
            <div className="mb-2 text-xs text-primary-foreground font-bold">
              {procedimentoCompleto}
            </div>
          )}
        </div>

        {/* Coluna 4-6: Data e Hora */}
        <div className="col-span-3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 font-semibold text-md">
            <CalendarIcon className="h-3 w-3" />
            <span>{moment(event.start).format('DD/MM/YYYY')}</span>
            <span className="mx-1">-</span>
            <Clock className="h-3 w-3" />
            <span>{moment(event.start).format('HH:mm')}</span>
          </div>
        </div>

        {/* Coluna 7: Caráter e Duração */}
        <div className="col-span-1 flex flex-col items-center">
          <div className={`text-xs px-2 py-1 rounded-full ${surgeryTypeColor}`}>
            {surgeryTypeLabel}
          </div>
          {estimatedDuration && (
            <div className="text-xs text-muted-foreground mt-1">
              {estimatedDuration}min
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle drag and drop
  const handleEventDrop = async (args: any) => {
    const { event, start, end } = args;
    const appointmentId = event.id;
    const newTime = moment(start).format('HH:mm');
    
    console.log('🎯 Movendo agendamento:', { appointmentId, start, end, newTime });
    
    try {
      await onUpdateAppointment(appointmentId, {
        scheduledDate: start,
        scheduledTime: newTime
      });
      console.log('✅ Agendamento atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar agendamento:', error);
    }
  };

  // Handle resize
  const handleEventResize = async (args: any) => {
    const { event, start, end } = args;
    const appointmentId = event.id;
    const duration = moment(end).diff(moment(start), 'minutes');
    
    console.log('⏰ Redimensionando agendamento:', { appointmentId, duration });
    
    try {
      await onUpdateAppointment(appointmentId, {
        estimatedDuration: duration
      });
      console.log('✅ Duração atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar duração:', error);
    }
  };

  // Handle double click for editing
  const handleEventDoubleClick = (event: any) => {
    console.log('✏️ Editando agendamento via duplo clique:', event.resource.id);
    onEditAppointment(event.resource);
  };

  // Handle slot selection (criar novo agendamento)
  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    console.log('📅 Novo agendamento selecionado para:', start);
    onNewAppointment();
  };

  // Handle event selection
  const handleSelectEvent = (event: any) => {
    console.log('📋 Editando agendamento:', event.resource.id);
    onEditAppointment(event.resource);
  };

  // Mensagens customizadas em português
  const messages = {
    allDay: 'Todo o dia',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há agendamentos neste período.',
    showMore: (total: number) => `+ ${total} mais`,
  };

  // Renderizar visualização customizada de mês
  if (currentView === Views.MONTH) {
    const monthDays = getMonthDays(currentDate);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Filtrar eventos do mês atual
    const monthEvents = events.filter(event => {
      const eventMonth = event.start.getMonth();
      const eventYear = event.start.getFullYear();
      return eventMonth === currentDate.getMonth() && eventYear === currentDate.getFullYear();
    });

    // Agrupar eventos por dia
    const eventsByDay = new Map<string, CalendarEvent[]>();
    monthEvents.forEach(event => {
      const dayKey = `${event.start.getFullYear()}-${event.start.getMonth()}-${event.start.getDate()}`;
      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    });

    const handlePrevMonth = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
    };

    const handleToday = () => {
      setCurrentDate(new Date());
    };

    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Agenda Cirúrgica
            </h2>
            <div className="flex gap-2">
              {[
                { key: Views.WEEK, label: 'Semana' },
                { key: Views.DAY, label: 'Dia' },
                { key: Views.MONTH, label: 'Mês' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={currentView === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentView(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          
          <Button onClick={onNewAppointment} className="flex items-center gap-2">
            <Plus size={16} />
            Nova Cirurgia
          </Button>
        </div>

        {/* Navegação do mês */}
        <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>Anterior</Button>
          <h3 className="text-lg font-semibold">{moment(currentDate).format('MMMM [de] YYYY')}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>Próximo</Button>
          </div>
        </div>

        {/* Grid do calendário */}
        <div className="flex-1 bg-white rounded-lg border overflow-auto">
          <div className="grid grid-cols-7 h-full">
            {/* Cabeçalho dos dias da semana */}
            {weekDays.map(day => (
              <div key={day} className="border-b border-r p-2 text-center font-semibold bg-gray-50">
                {day}
              </div>
            ))}
            
            {/* Dias do mês */}
            {monthDays.map((day, index) => {
              const dayKey = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : '';
              const dayEvents = day ? (eventsByDay.get(dayKey) || []) : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={index} 
                  className={`border-b border-r p-2 min-h-[100px] ${isToday ? 'bg-blue-50' : ''} ${!day ? 'bg-gray-100' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const { procedureType, priority } = event.resource;
                          
                          let backgroundColor = '#3b82f6';
                          if (procedureType === 'urgencia' || procedureType === 'emergencia') {
                            backgroundColor = '#dc2626';
                          }
                          if (priority === 3) {
                            backgroundColor = '#dc2626';
                          }
                          
                          return (
                            <div
                              key={event.id}
                              className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate text-white"
                              style={{ backgroundColor }}
                              onClick={() => onEditAppointment(event.resource)}
                            >
                              {moment(event.start).format('HH:mm')} - {event.resource.patientName}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500">
                            + {dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Visualização de Semana e Dia (react-big-calendar)
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar personalizada */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Agenda Cirúrgica
          </h2>
          <div className="flex gap-2">
            {[
              { key: Views.WEEK, label: 'Semana' },
              { key: Views.DAY, label: 'Dia' },
              { key: Views.MONTH, label: 'Mês' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={currentView === key ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        <Button onClick={onNewAppointment} className="flex items-center gap-2">
          <Plus size={16} />
          Nova Cirurgia
        </Button>
      </div>

      {/* Calendário principal */}
      <div className="flex-1 bg-white rounded-lg border overflow-hidden">
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          style={{ height: '100%' }}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onDoubleClickEvent={handleEventDoubleClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          selectable
          resizable
          popup
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventComponent,
            agenda: {
              event: AgendaEvent,
            },
          }}
          messages={messages}
          min={moment().hour(7).minute(0).toDate()}
          max={moment().hour(21).minute(0).toDate()}
          step={30}
          timeslots={2}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          formats={{
            timeGutterFormat: 'HH:mm',
            dayFormat: (date: Date) => {
              const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              const dayIndex = moment(date).day();
              return `${dayNames[dayIndex]} ${moment(date).format('DD/MM')}`;
            },
            weekdayFormat: (date: Date) => {
              const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
              return dayNames[moment(date).day()];
            },
            dayHeaderFormat: (date: Date) => {
              const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
              return `${dayNames[moment(date).day()]}, ${moment(date).format('DD [de] MMMM')}`;
            },
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${moment(start).format('DD/MM')} - ${moment(end).format('DD/MM/YYYY')}`,
          }}
          className="surgical-calendar"
        />
      </div>
    </div>
  );
}