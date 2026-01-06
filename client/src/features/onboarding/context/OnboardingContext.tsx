import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { OnboardingContextType, TourState, CallBackProps, Tour, TourStepMetadata, StepChangeListener } from '../types';
import { tours } from '../tours';
import { TourTooltip } from '../components/TourTooltip';

const STORAGE_KEY = 'medsync_onboarding_completed_tours';

const initialState: TourState = {
  activeTourId: null,
  stepIndex: 0,
  isRunning: false,
  completedTours: [],
};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const getStoredCompletedTours = (): string[] => {
  if (!isBrowser) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCompletedTours = (tours: string[]) => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
  } catch {
  }
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider = ({ children }: OnboardingProviderProps) => {
  const [state, setState] = useState<TourState>(() => {
    const completedTours = getStoredCompletedTours();
    return { ...initialState, completedTours };
  });
  
  const stepChangeListenersRef = useRef<Set<StepChangeListener>>(new Set());

  useEffect(() => {
    saveCompletedTours(state.completedTours);
  }, [state.completedTours]);

  const getCurrentTour = useCallback((): Tour | null => {
    if (!state.activeTourId) return null;
    return tours[state.activeTourId] || null;
  }, [state.activeTourId]);
  
  const getCurrentStepMetadata = useCallback((): TourStepMetadata | undefined => {
    const currentTour = getCurrentTour();
    if (!currentTour) return undefined;
    const currentStep = currentTour.steps[state.stepIndex];
    return currentStep?.metadata;
  }, [getCurrentTour, state.stepIndex]);
  
  const registerStepChangeListener = useCallback((listener: StepChangeListener) => {
    stepChangeListenersRef.current.add(listener);
    return () => {
      stepChangeListenersRef.current.delete(listener);
    };
  }, []);
  
  const notifyStepChangeListeners = useCallback((tourId: string, stepIndex: number, metadata?: TourStepMetadata) => {
    stepChangeListenersRef.current.forEach(listener => {
      listener(tourId, stepIndex, metadata);
    });
  }, []);

  const startTour = useCallback((tourId: string) => {
    if (tours[tourId]) {
      const tour = tours[tourId];
      const firstStepMetadata = tour.steps[0]?.metadata;
      
      setState(prev => ({
        ...prev,
        activeTourId: tourId,
        stepIndex: 0,
        isRunning: true,
      }));
      
      notifyStepChangeListeners(tourId, 0, firstStepMetadata);
    } else {
      console.warn(`Tour "${tourId}" not found`);
    }
  }, [notifyStepChangeListeners]);

  const stopTour = useCallback(() => {
    const currentTour = getCurrentTour();
    if (currentTour) {
      notifyStepChangeListeners(currentTour.id, -1, undefined);
    }
    setState(prev => ({
      ...prev,
      activeTourId: null,
      stepIndex: 0,
      isRunning: false,
    }));
  }, [getCurrentTour, notifyStepChangeListeners]);

  const nextStep = useCallback(() => {
    const currentTour = getCurrentTour();
    if (!currentTour) return;

    setState(prev => {
      const nextIndex = prev.stepIndex + 1;
      if (nextIndex >= currentTour.steps.length) {
        notifyStepChangeListeners(currentTour.id, -1, undefined);
        return {
          ...prev,
          completedTours: prev.completedTours.includes(currentTour.id)
            ? prev.completedTours
            : [...prev.completedTours, currentTour.id],
          activeTourId: null,
          stepIndex: 0,
          isRunning: false,
        };
      }
      
      const nextStepMetadata = currentTour.steps[nextIndex]?.metadata;
      
      // Scroll to top if the next step has scrollToTop metadata
      if (nextStepMetadata?.scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      notifyStepChangeListeners(currentTour.id, nextIndex, nextStepMetadata);
      
      return { ...prev, stepIndex: nextIndex };
    });
  }, [getCurrentTour, notifyStepChangeListeners]);

  const prevStep = useCallback(() => {
    const currentTour = getCurrentTour();
    if (!currentTour) return;
    
    setState(prev => {
      const prevIndex = Math.max(0, prev.stepIndex - 1);
      const prevStepMetadata = currentTour.steps[prevIndex]?.metadata;
      notifyStepChangeListeners(currentTour.id, prevIndex, prevStepMetadata);
      return { ...prev, stepIndex: prevIndex };
    });
  }, [getCurrentTour, notifyStepChangeListeners]);

  const goToStep = useCallback((index: number) => {
    const currentTour = getCurrentTour();
    if (!currentTour) return;

    const clampedIndex = Math.max(0, Math.min(index, currentTour.steps.length - 1));
    const stepMetadata = currentTour.steps[clampedIndex]?.metadata;
    
    // Scroll to top if the step has scrollToTop metadata
    if (stepMetadata?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    notifyStepChangeListeners(currentTour.id, clampedIndex, stepMetadata);
    setState(prev => ({ ...prev, stepIndex: clampedIndex }));
  }, [getCurrentTour, notifyStepChangeListeners]);

  const markTourComplete = useCallback((tourId: string) => {
    setState(prev => ({
      ...prev,
      completedTours: prev.completedTours.includes(tourId)
        ? prev.completedTours
        : [...prev.completedTours, tourId],
    }));
  }, []);

  const isTourCompleted = useCallback((tourId: string) => {
    return state.completedTours.includes(tourId);
  }, [state.completedTours]);

  const resetTour = useCallback((tourId: string) => {
    setState(prev => ({
      ...prev,
      completedTours: prev.completedTours.filter(id => id !== tourId),
    }));
  }, []);

  const resetAllTours = useCallback(() => {
    setState(prev => ({
      ...prev,
      completedTours: [],
    }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type as any)) {
      if (action === ACTIONS.NEXT) {
        nextStep();
      } else if (action === ACTIONS.PREV) {
        prevStep();
      }
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      const currentTour = getCurrentTour();
      if (currentTour && status === STATUS.FINISHED) {
        markTourComplete(currentTour.id);
      }
      stopTour();
    }

    if (action === ACTIONS.CLOSE) {
      stopTour();
    }
  }, [nextStep, prevStep, stopTour, markTourComplete, getCurrentTour]);

  const currentTour = getCurrentTour();

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        markTourComplete,
        isTourCompleted,
        resetTour,
        resetAllTours,
        getCurrentTour,
        getCurrentStepMetadata,
        handleJoyrideCallback,
        registerStepChangeListener,
      }}
    >
      {children}
      {currentTour && (
        <Joyride
          callback={handleJoyrideCallback}
          continuous
          run={state.isRunning}
          stepIndex={state.stepIndex}
          steps={currentTour.steps}
          showSkipButton
          showProgress
          disableOverlayClose
          spotlightClicks={false}
          tooltipComponent={TourTooltip}
          locale={{
            back: 'Anterior',
            close: 'Fechar',
            last: 'Concluir',
            next: 'Próximo',
            open: 'Abrir',
            skip: 'Pular',
          }}
          styles={{
            options: {
              zIndex: 10000,
              primaryColor: '#2ca8e0',
              overlayColor: 'rgba(0, 0, 0, 0.5)',
            },
            spotlight: {
              borderRadius: 8,
            },
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          }}
          floaterProps={{
            hideArrow: false,
            offset: 16,
          }}
        />
      )}
    </OnboardingContext.Provider>
  );
};
