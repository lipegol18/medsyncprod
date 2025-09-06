import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, AlertTriangle, Edit2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SurgeryAppointment as BaseSurgeryAppointment } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SurgeryAppointment extends BaseSurgeryAppointment {
  patientName?: string | null;
}

interface SimpleCalendarViewProps {
  appointments: SurgeryAppointment[];
  onNewAppointment: () => void;
  onEditAppointment: (appointment: SurgeryAppointment) => void;
  onUpdateAppointment: (appointmentId: number, updates: Partial<SurgeryAppointment>) => void;
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
}

interface EditDialogData {
  appointmentId: number;
  currentDate: string;
  currentTime: string;
}

export function SimpleCalendarView({
  appointments,
  onNewAppointment,
  onEditAppointment,
  onUpdateAppointment,
  currentWeek,
  onWeekChange,
}: SimpleCalendarViewProps) {
  const [editDialog, setEditDialog] = useState<EditDialogData | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h às 20h

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

  const getAppointmentForSlot = (date: Date, hour: number) => {
    return appointments.find(appointment => {
      if (!appointment.scheduledDate || !appointment.scheduledTime) return false;
      
      const appointmentDate = typeof appointment.scheduledDate === 'string' 
        ? parseISO(appointment.scheduledDate)
        : appointment.scheduledDate;
      const [appointmentHour] = appointment.scheduledTime.split(':').map(Number);
      
      return isSameDay(appointmentDate, date) && appointmentHour === hour;
    });
  };

  const handleEditClick = (appointment: SurgeryAppointment) => {
    const appointmentDate = typeof appointment.scheduledDate === 'string'
      ? parseISO(appointment.scheduledDate)
      : appointment.scheduledDate;
    setEditDialog({
      appointmentId: appointment.id,
      currentDate: format(appointmentDate, 'yyyy-MM-dd'),
      currentTime: appointment.scheduledTime || '',
    });
    setNewDate(format(appointmentDate, 'yyyy-MM-dd'));
    setNewTime(appointment.scheduledTime || '');
  };

  const handleSaveEdit = () => {
    if (!editDialog || !newDate || !newTime) return;

    // Parse the new date and time
    const [year, month, day] = newDate.split('-').map(Number);
    const [hours, minutes] = newTime.split(':').map(Number);
    
    const newDateTime = new Date(year, month - 1, day, hours, minutes);

    console.log('💾 Saving appointment edit:', {
      appointmentId: editDialog.appointmentId,
      scheduledDate: newDateTime,
      scheduledTime: newTime
    });

    onUpdateAppointment(editDialog.appointmentId, {
      scheduledDate: newDateTime,
      scheduledTime: newTime
    });

    setEditDialog(null);
    setNewDate('');
    setNewTime('');
  };

  const handleCancelEdit = () => {
    setEditDialog(null);
    setNewDate('');
    setNewTime('');
  };

  return (
    <div className="space-y-4">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(addDays(currentWeek, -7))}
          >
            <ChevronLeft size={16} />
            Semana Anterior
          </Button>
          <h3 className="text-lg font-semibold">
            {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} -{' '}
            {format(addDays(weekStart, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(addDays(currentWeek, 7))}
          >
            Próxima Semana
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button onClick={onNewAppointment} className="flex items-center gap-2">
          <Calendar size={16} />
          Novo Agendamento
        </Button>
      </div>

      {/* Grid do calendário */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-8 gap-1">
            {/* Header com dias da semana */}
            <div className="h-12 flex items-center justify-center font-medium text-sm">
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
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="h-16 flex items-center justify-center text-sm font-medium border-r bg-gray-50">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day) => {
                  const appointment = getAppointmentForSlot(day, hour);
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="h-16 border border-gray-200 p-1 relative"
                    >
                      {appointment && (
                        <div
                          className={`w-full h-full rounded p-2 text-white text-xs ${getStatusColor(
                            appointment.status
                          )} ${getPriorityColor(appointment.priority?.toString() || 'baixa')}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium truncate">
                              {appointment.scheduledTime} - {' '}
                              {appointment.scheduledTime && 
                                format(new Date(`2000-01-01T${appointment.scheduledTime}`), 'HH:mm')
                              }
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 text-white hover:text-gray-200"
                              onClick={() => handleEditClick(appointment)}
                            >
                              <Edit2 size={12} />
                            </Button>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getSurgeryTypeColor(appointment.surgeryType || 'eletiva')}`}
                              >
                                {appointment.surgeryType}
                              </Badge>
                            </div>
                            
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
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={!!editDialog} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Cirurgia</DialogTitle>
            <DialogDescription>
              Altere a data e horário do agendamento cirúrgico.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">Nova Data</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-time">Novo Horário</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}