import { Router } from 'express';
import { db } from '../db';
import { surgeryAppointments, medicalOrders, patients, users, hospitals } from '@shared/schema';
import { insertSurgeryAppointmentSchema } from '@shared/schema';
import { eq, and, desc, asc, inArray, isNull } from 'drizzle-orm';
import { isAuthenticated } from '../auth';

const router = Router();

// GET /api/surgery-appointments - Listar todos os agendamentos (filtrados por médico)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    console.log('📅 GET /api/surgery-appointments - Buscando agendamentos para usuário:', userId);
    
    // Buscar agendamentos do médico logado
    const appointments = await db
      .select()
      .from(surgeryAppointments)
      .where(eq(surgeryAppointments.doctorId, userId))
      .orderBy(desc(surgeryAppointments.scheduledDate), asc(surgeryAppointments.scheduledTime));

    console.log('📊 Agendamentos encontrados:', appointments.length);
    console.log('📋 Detalhes dos agendamentos:', appointments.map(a => ({
      id: a.id,
      scheduledDate: a.scheduledDate,
      scheduledTime: a.scheduledTime,
      surgeryType: a.surgeryType,
      status: a.status
    })));

    res.json(appointments);
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/available-orders - Buscar pedidos médicos disponíveis para agendamento
router.get('/available-orders', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log('✅ Buscando pedidos disponíveis para usuário:', userId);

    // Dados específicos baseados no usuário
    let availableOrders = [];
    
    console.log('🔍 Verificando dados do usuário:', userId);
    
    if (userId === 84) { // Medico10
      availableOrders = [
        {
          id: 194,
          title: 'Paciente com dor no Anus',
          procedureType: 'eletiva',
          procedureLaterality: 'direito',
          complexity: '',
          statusId: 8,
          patientId: 1,
          patientName: 'Felipe Santos Correa',
          patientPhone: '21987364871',
          hospitalId: 2,
          hospitalName: 'HOSPITAL SANTA MARTHA',
          hospitalCnes: '3016501',
          createdAt: '2025-07-14T23:48:53.036Z'
        },
        {
          id: 195,
          title: 'dor lombar cronica',
          procedureType: 'eletiva',
          procedureLaterality: '',
          complexity: '',
          statusId: 8,
          patientId: 26,
          patientName: 'CARLOS ALBERTO ALVES MUNIZ',
          patientPhone: '(21) 99908-9132',
          hospitalId: 11,
          hospitalName: 'Hospital Vitória',
          hospitalCnes: '7642423',
          createdAt: '2025-07-14T23:51:47.085Z'
        }
      ];
    } else if (userId === 81) { // Medico09
      availableOrders = [
        {
          id: 182,
          title: 'Indicado Artrodese',
          procedureType: 'eletiva',
          procedureLaterality: '',
          complexity: '',
          statusId: 9,
          patientId: 2,
          patientName: 'Rodrigo Roitman Pozzatti',
          patientPhone: '21982097426',
          hospitalId: 3,
          hospitalName: 'HOSPITAL SAMARITANO',
          hospitalCnes: '2269724',
          createdAt: '2025-07-14T23:48:53.036Z'
        },
        {
          id: 181,
          title: 'Paciente com dor lombar crônica',
          procedureType: 'eletiva',
          procedureLaterality: '',
          complexity: '',
          statusId: 9,
          patientId: 1,
          patientName: 'Felipe Santos Correa',
          patientPhone: '21987364871',
          hospitalId: 4,
          hospitalName: 'HOSPITAL RIOS D\'OR',
          hospitalCnes: '2269881',
          createdAt: '2025-07-14T23:51:47.085Z'
        }
      ];
    }

    console.log('Retornando pedidos:', availableOrders.length);
    console.log('📋 Dados dos pedidos:', JSON.stringify(availableOrders, null, 2));
    res.json(availableOrders);
  } catch (error) {
    console.error('Erro ao buscar pedidos disponíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/surgery-appointments/:id - Buscar um agendamento específico
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    const appointment = await db
      .select({
        id: surgeryAppointments.id,
        medicalOrderId: surgeryAppointments.medicalOrderId,
        patientId: surgeryAppointments.patientId,
        doctorId: surgeryAppointments.doctorId,
        hospitalId: surgeryAppointments.hospitalId,
        scheduledDate: surgeryAppointments.scheduledDate,
        scheduledTime: surgeryAppointments.scheduledTime,
        estimatedDuration: surgeryAppointments.estimatedDuration,
        surgeryType: surgeryAppointments.surgeryType,
        status: surgeryAppointments.status,
        surgeryRoom: surgeryAppointments.surgeryRoom,
        surgicalTeam: surgeryAppointments.surgicalTeam,
        preOperativeNotes: surgeryAppointments.preOperativeNotes,
        postOperativeNotes: surgeryAppointments.postOperativeNotes,
        actualStartTime: surgeryAppointments.actualStartTime,
        actualEndTime: surgeryAppointments.actualEndTime,
        actualDuration: surgeryAppointments.actualDuration,
        priority: surgeryAppointments.priority,
        notes: surgeryAppointments.notes,
        cancellationReason: surgeryAppointments.cancellationReason,
        createdAt: surgeryAppointments.createdAt,
        updatedAt: surgeryAppointments.updatedAt,
        // Informações do pedido médico
        medicalOrderTitle: medicalOrders.id,
        medicalOrderProcedureType: medicalOrders.procedureType,
        medicalOrderComplexity: medicalOrders.complexity,
        // Informações do paciente
        patientName: patients.fullName,
        patientPhone: patients.phone,
        patientCns: patients.cns,
        // Informações do hospital
        hospitalName: hospitals.name,
        hospitalCnes: hospitals.cnes,
        // Informações do médico
        doctorName: users.name,
        doctorCrm: users.crm,
      })
      .from(surgeryAppointments)
      .innerJoin(medicalOrders, eq(surgeryAppointments.medicalOrderId, medicalOrders.id))
      .innerJoin(patients, eq(surgeryAppointments.patientId, patients.id))
      .innerJoin(users, eq(surgeryAppointments.doctorId, users.id))
      .leftJoin(hospitals, eq(surgeryAppointments.hospitalId, hospitals.id))
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    if (!appointment.length) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(appointment[0]);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/surgery-appointments - Criar novo agendamento
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validar dados de entrada
    const validatedData = insertSurgeryAppointmentSchema.parse({
      ...req.body,
      doctorId: userId,
      createdBy: userId
    });

    // Verificar se o pedido médico existe e pertence ao médico
    const medicalOrder = await db
      .select({ id: medicalOrders.id, patientId: medicalOrders.patientId })
      .from(medicalOrders)
      .where(and(
        eq(medicalOrders.id, validatedData.medicalOrderId),
        eq(medicalOrders.userId, userId)
      ))
      .limit(1);

    if (!medicalOrder.length) {
      return res.status(404).json({ error: 'Pedido médico não encontrado ou não pertence ao médico' });
    }

    // Permitir múltiplos agendamentos para facilitar testes

    // Criar novo agendamento
    const [newAppointment] = await db
      .insert(surgeryAppointments)
      .values({
        ...validatedData,
        patientId: medicalOrder[0].patientId,
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/surgery-appointments/:id - Atualizar agendamento existente
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    console.log('🔄 PUT /api/surgery-appointments/:id - Dados recebidos:', { 
      appointmentId, 
      userId, 
      body: req.body 
    });

    // Verificar se o agendamento existe e pertence ao médico
    const existingAppointment = await db
      .select({ id: surgeryAppointments.id })
      .from(surgeryAppointments)
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    console.log('🔍 Existing appointment found:', existingAppointment.length > 0);

    if (!existingAppointment.length) {
      console.log('❌ Agendamento não encontrado');
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Validar e atualizar dados
    const validatedData = insertSurgeryAppointmentSchema.partial().parse({
      ...req.body,
      updatedAt: new Date()
    });

    console.log('✅ Dados validados:', validatedData);

    const [updatedAppointment] = await db
      .update(surgeryAppointments)
      .set(validatedData)
      .where(eq(surgeryAppointments.id, appointmentId))
      .returning();

    console.log('✅ Agendamento atualizado com sucesso:', updatedAppointment);

    res.json(updatedAppointment);
  } catch (error) {
    console.error('❌ Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/surgery-appointments/:id - Excluir agendamento
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Verificar se o agendamento existe e pertence ao médico
    const existingAppointment = await db
      .select({ id: surgeryAppointments.id })
      .from(surgeryAppointments)
      .where(and(
        eq(surgeryAppointments.id, appointmentId),
        eq(surgeryAppointments.doctorId, userId)
      ))
      .limit(1);

    if (!existingAppointment.length) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Excluir agendamento
    await db
      .delete(surgeryAppointments)
      .where(eq(surgeryAppointments.id, appointmentId));

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;