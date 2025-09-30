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
import { Plus, User, Clock, AlertTriangle } from 'lucide-react';
import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';

// Configurar moment para português brasileiro
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// Criar componente de calendário com drag-and-drop
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
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

  // Converter agendamentos para eventos do react-big-calendar (sem duplicação)
  const events: CalendarEvent[] = useMemo(() => {
    console.log('🔍 Total de agendamentos recebidos:', appointments.length);
    
    // Criar um Map para garantir unicidade por ID
    const uniqueMap = new Map<number, SurgeryAppointment>();
    
    appointments.forEach(appointment => {
      if (appointment.id) {
        uniqueMap.set(appointment.id, appointment);
      }
    });
    
    const uniqueAppointments = Array.from(uniqueMap.values());
    console.log('✅ Agendamentos únicos após filtro:', uniqueAppointments.length);
    
    if (uniqueAppointments.length !== appointments.length) {
      console.log('⚠️ Duplicações removidas:', appointments.length - uniqueAppointments.length);
    }

    return uniqueAppointments.map(appointment => {
      if (!appointment.scheduledDate || !appointment.scheduledTime) {
        return null;
      }

      const date = typeof appointment.scheduledDate === 'string' 
        ? new Date(appointment.scheduledDate) 
        : appointment.scheduledDate;
      
      const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(hours, minutes, 0, 0);
      
      const end = new Date(start);
      const duration = appointment.estimatedDuration || 60;
      end.setMinutes(end.getMinutes() + duration);

      return {
        id: appointment.id!,
        title: `${appointment.patientName || 'Paciente'} - ${appointment.surgeryType || 'Cirurgia'}`,
        start,
        end,
        resource: appointment,
      };
    }).filter(Boolean) as CalendarEvent[];
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

  // Personalizar componente do evento
  const EventComponent = ({ event }: { event: any }) => {
    const { patientName, surgeryType, priority, notes } = event.resource;
    
    return (
      <div className="p-1 h-full">
        <div className="font-medium text-xs mb-1 flex items-center gap-1">
          <User size={10} />
          <span className="truncate">{patientName}</span>
        </div>
        <div className="text-xs opacity-90 flex items-center gap-1">
          <Clock size={10} />
          <span>{surgeryType}</span>
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
          }}
          messages={messages}
          min={moment().hour(7).minute(0).toDate()}
          max={moment().hour(21).minute(0).toDate()}
          step={30}
          timeslots={2}
          defaultView={Views.WEEK}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
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
            monthHeaderFormat: (date: Date) => moment(date).format('MMMM YYYY'),
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