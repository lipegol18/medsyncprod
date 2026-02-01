import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo, View } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays, endOfWeek, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
}

interface SurgicalCalendarProps {
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

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

const messages = {
  allDay: 'Dia inteiro',
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
  noEventsInRange: 'Não há cirurgias neste período.',
  showMore: (total: number) => `+ ${total} mais`,
};

export function SurgicalCalendar({
  appointments,
  onNewAppointment,
  onEditAppointment,
  onUpdateAppointment,
}: SurgicalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.WEEK);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = calendarRef.current;
    if (!container) return;

    let savedScrollY = 0;

    const saveScrollPosition = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('.rbc-event')) {
        savedScrollY = window.scrollY;
      }
    };

    const restoreScrollPosition = () => {
      if (savedScrollY !== window.scrollY) {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      }
    };

    const preventScrollOnFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('.rbc-event')) {
        requestAnimationFrame(restoreScrollPosition);
      }
    };

    container.addEventListener('mousedown', saveScrollPosition, { capture: true });
    container.addEventListener('focusin', preventScrollOnFocus, { capture: true });
    
    return () => {
      container.removeEventListener('mousedown', saveScrollPosition, { capture: true });
      container.removeEventListener('focusin', preventScrollOnFocus, { capture: true });
    };
  }, []);

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((appointment) => {
      let startDate: Date;
      
      if (appointment.scheduledDate) {
        if (typeof appointment.scheduledDate === 'string') {
          startDate = parseISO(appointment.scheduledDate);
        } else {
          startDate = new Date(appointment.scheduledDate);
        }
      } else {
        startDate = new Date();
      }

      if (appointment.scheduledTime) {
        const [hours, minutes] = appointment.scheduledTime.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      }

      const durationMinutes = appointment.estimatedDuration || 60;
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      return {
        id: appointment.id,
        title: `${appointment.patientName || 'Paciente'} - ${appointment.surgeryType === 'urgencia' ? 'Urgência' : 'Eletiva'}`,
        start: startDate,
        end: endDate,
        resource: appointment,
      };
    });
  }, [appointments]);

  // Calcula os horários min/max dinâmicos baseado nos eventos da semana/mês/dia atual
  const { dynamicMin, dynamicMax } = useMemo(() => {
    // Horários padrão: 08:00 às 21:00
    const DEFAULT_MIN_HOUR = 8;
    const DEFAULT_MAX_HOUR = 21;
    
    let minHour = DEFAULT_MIN_HOUR;
    let maxHour = DEFAULT_MAX_HOUR;
    
    // Determina o intervalo de datas baseado na view atual
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (view === Views.WEEK) {
      rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (view === Views.MONTH) {
      rangeStart = startOfMonth(currentDate);
      rangeEnd = endOfMonth(currentDate);
    } else if (view === Views.DAY) {
      rangeStart = startOfDay(currentDate);
      rangeEnd = endOfDay(currentDate);
    } else {
      // Agenda view - mostra próximos 30 dias
      rangeStart = startOfDay(currentDate);
      rangeEnd = addDays(currentDate, 30);
    }
    
    // Filtra eventos dentro do intervalo e verifica horários
    events.forEach((event) => {
      if (isWithinInterval(event.start, { start: rangeStart, end: rangeEnd })) {
        const eventStartHour = event.start.getHours();
        const eventEndHour = event.end.getHours() + (event.end.getMinutes() > 0 ? 1 : 0);
        
        // Expande o horário mínimo se necessário (baseado no início do evento)
        if (eventStartHour < minHour) {
          minHour = eventStartHour;
        }
        
        // Expande o horário máximo se necessário (baseado no início E fim do evento)
        const requiredMax = Math.max(eventStartHour + 1, eventEndHour);
        if (requiredMax > maxHour) {
          // Limita a 23 (react-big-calendar usa 23:59:59 internamente para o final do dia)
          maxHour = Math.min(23, requiredMax);
        }
      }
    });
    
    // Cria as datas min/max para o react-big-calendar
    // Para o max, usamos 23:59:59 se for hora 23+, senão usamos a hora exata
    const minDate = new Date(1970, 0, 1, minHour, 0, 0);
    const maxDate = maxHour >= 23 
      ? new Date(1970, 0, 1, 23, 59, 59) 
      : new Date(1970, 0, 1, maxHour, 0, 0);
    
    console.log('Calendar time range:', { minHour, maxHour, events: events.length });
    
    return {
      dynamicMin: minDate,
      dynamicMax: maxDate,
    };
  }, [events, currentDate, view]);

  const getEventStyle = useCallback((event: CalendarEvent) => {
    const appointment = event.resource;
    
    // Cor baseada no tipo de cirurgia: Urgência = Vermelho, Eletiva = Azul
    let backgroundColor = appointment.surgeryType === 'urgencia' ? '#ef4444' : '#3b82f6';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  }, []);

  const handleEventDrop: withDragAndDropProps<CalendarEvent>['onEventDrop'] = useCallback(
    ({ event, start, end }) => {
      const newStart = start instanceof Date ? start : new Date(start);
      const scheduledTime = format(newStart, 'HH:mm');
      
      onUpdateAppointment(event.id, {
        scheduledDate: newStart,
        scheduledTime,
      });
    },
    [onUpdateAppointment]
  );

  const handleEventResize: withDragAndDropProps<CalendarEvent>['onEventResize'] = useCallback(
    ({ event, start, end }) => {
      const newStart = start instanceof Date ? start : new Date(start);
      const newEnd = end instanceof Date ? end : new Date(end);
      const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
      const scheduledTime = format(newStart, 'HH:mm');
      
      onUpdateAppointment(event.id, {
        scheduledDate: newStart,
        scheduledTime,
        estimatedDuration: durationMinutes,
      });
    },
    [onUpdateAppointment]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEditAppointment(event.resource);
    },
    [onEditAppointment]
  );

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      onNewAppointment();
    },
    [onNewAppointment]
  );

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" ref={calendarRef}>
      <div className="h-full flex flex-col">
        {/* Cabeçalho Moderno com Fundo Azul */}
        <div className="mb-2">
          <div className="flex flex-col mb-2 p-10 rounded-xl bg-medsync-blue">
            <div className="flex items-center justify-center my-2">
              <h1 className="text-3xl font-bold text-white text-center">
                Agenda Cirúrgica
              </h1>
            </div>
          </div>
        </div>

        {/* Toolbar personalizada */}
        <Card className="border-gray-200 bg-gradient-to-r from-sky-50 to-sky-100/50 shadow-sm mb-4">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-sky-200 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-sky-700" />
              </div>
              <div>
                <CardTitle className="flex items-center text-foreground">
                  Sua agenda cirúrgica
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Gerencie suas cirurgias
                </CardDescription>
              </div>
            </div>

            <button
              onClick={onNewAppointment}
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={16} />
              Nova Cirurgia
            </button>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            {[
              { key: Views.DAY, label: 'Dia' },
              { key: Views.WEEK, label: 'Semana' },
              { key: Views.MONTH, label: 'Mês' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={
                  view === key
                    ? 'btn-medsync-dark px-4 py-2 rounded-md text-sm'
                    : 'px-4 py-2 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Navegação do calendário */}
        <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => {
              if (view === Views.WEEK) {
                setCurrentDate(subWeeks(currentDate, 1));
              } else if (view === Views.MONTH) {
                setCurrentDate(subMonths(currentDate, 1));
              } else {
                setCurrentDate(subDays(currentDate, 1));
              }
            }}
            className="btn-medsync-dark px-4 py-2 rounded-md"
          >
            Anterior
          </button>
          
          <h3 className="text-lg font-semibold text-sky-800">
            {view === Views.WEEK && (
              <>Semana de {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM/yyyy", { locale: ptBR })} a {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "dd/MM/yyyy", { locale: ptBR })}</>
            )}
            {view === Views.MONTH && format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            {view === Views.DAY && format(currentDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
          </h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-medsync-dark px-4 py-2 rounded-md"
            >
              Hoje
            </button>
            <button
              onClick={() => {
                if (view === Views.WEEK) {
                  setCurrentDate(addWeeks(currentDate, 1));
                } else if (view === Views.MONTH) {
                  setCurrentDate(addMonths(currentDate, 1));
                } else {
                  setCurrentDate(addDays(currentDate, 1));
                }
              }}
              className="btn-medsync-dark px-4 py-2 rounded-md"
            >
              Próximo
            </button>
          </div>
        </div>

        {/* Calendário */}
        <Card className="p-4">
        <style>{`
          .rbc-calendar {
            font-family: inherit;
          }
          .rbc-toolbar {
            display: none;
          }
          .rbc-header {
            padding: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
            border-bottom: 1px solid hsl(var(--border));
          }
          .rbc-today {
            background-color: hsl(var(--primary) / 0.1);
          }
          .rbc-off-range-bg {
            background-color: hsl(var(--muted) / 0.5);
          }
          .rbc-event,
          .rbc-event a,
          .rbc-event button {
            outline: none !important;
          }
          .rbc-event {
            cursor: grab;
          }
          .rbc-event:active {
            cursor: grabbing;
          }
          .rbc-addons-dnd-dragging .rbc-event {
            cursor: grabbing;
          }
          .rbc-event:focus {
            outline: none !important;
          }
          .rbc-time-slot {
            min-height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .rbc-label {
            text-align: center;
          }
          .rbc-timeslot-group {
            min-height: 40px;
          }
          .rbc-current-time-indicator {
            background-color: hsl(var(--destructive));
            height: 2px;
          }
          .rbc-addons-dnd-resizable {
            position: relative;
          }
          .rbc-addons-dnd-resize-ns-anchor {
            position: absolute;
            left: 0;
            right: 0;
            height: 8px;
            cursor: ns-resize;
          }
          .rbc-addons-dnd-resize-ns-anchor:first-child {
            top: 0;
          }
          .rbc-addons-dnd-resize-ns-anchor:last-child {
            bottom: 0;
          }
        `}</style>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 650 }}
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={handleViewChange}
          date={currentDate}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          selectable
          resizable
          step={30}
          timeslots={2}
          min={dynamicMin}
          max={dynamicMax}
          messages={messages}
          eventPropGetter={getEventStyle}
          culture="pt-BR"
          formats={{
            timeGutterFormat: (date: Date) => format(date, 'HH:mm'),
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
            dayHeaderFormat: (date: Date) => format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
            dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${format(start, "dd 'de' MMM", { locale: ptBR })} - ${format(end, "dd 'de' MMM", { locale: ptBR })}`,
          }}
        />
        </Card>
      </div>
    </div>
  );
}
