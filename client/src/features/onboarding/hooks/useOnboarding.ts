import { useOnboardingContext } from '../context/OnboardingContext';

export const useOnboarding = () => {
  const context = useOnboardingContext();
  
  return {
    startTour: context.startTour,
    stopTour: context.stopTour,
    isRunning: context.state.isRunning,
    activeTourId: context.state.activeTourId,
    currentStep: context.state.stepIndex,
    isTourCompleted: context.isTourCompleted,
    resetTour: context.resetTour,
    resetAllTours: context.resetAllTours,
    state: context.state,
    getCurrentStepMetadata: context.getCurrentStepMetadata,
    registerStepChangeListener: context.registerStepChangeListener,
  };
};
