import { Tour } from '../types';
import { profileTour } from './profileTour';
import { dashboardTour } from './dashboardTour';
import { patientsTour } from './patientsTour';
import { createOrderTour } from './createOrderTour';

export const tours: Record<string, Tour> = {
  'profile-tour': profileTour,
  'dashboard-tour': dashboardTour,
  'patients-tour': patientsTour,
  'create-order-tour': createOrderTour,
};

export { profileTour, dashboardTour, patientsTour, createOrderTour };
