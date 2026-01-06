import { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';

export interface TourStepMetadata {
  wizardStep?: number;
  scrollToTop?: boolean;
}

export interface TourStep extends Step {
  id: string;
  metadata?: TourStepMetadata;
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
  startCondition?: () => boolean;
}

export interface TourState {
  activeTourId: string | null;
  stepIndex: number;
  isRunning: boolean;
  completedTours: string[];
}

export type StepChangeListener = (tourId: string, stepIndex: number, metadata?: TourStepMetadata) => void;

export interface OnboardingContextType {
  state: TourState;
  startTour: (tourId: string) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  markTourComplete: (tourId: string) => void;
  isTourCompleted: (tourId: string) => boolean;
  resetTour: (tourId: string) => void;
  resetAllTours: () => void;
  getCurrentTour: () => Tour | null;
  getCurrentStepMetadata: () => TourStepMetadata | undefined;
  handleJoyrideCallback: (data: CallBackProps) => void;
  registerStepChangeListener: (listener: StepChangeListener) => () => void;
}

export { STATUS, EVENTS, ACTIONS };
export type { CallBackProps };
