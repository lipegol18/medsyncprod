import { TooltipRenderProps } from 'react-joyride';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface TourTooltipProps extends TooltipRenderProps {}

export const TourTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  size,
  isLastStep,
}: TourTooltipProps) => {
  return (
    <div
      {...tooltipProps}
      className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm animate-in fade-in zoom-in-95 duration-200"
      style={{ zIndex: 10000 }}
    >
      <div className="bg-[#2ca8e0] text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          <h3 className="font-semibold text-base">
            {step.title || 'Dica'}
          </h3>
        </div>
        <button
          {...closeProps}
          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          aria-label="Fechar tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-gray-700 text-sm leading-relaxed">
          {step.content}
        </p>
      </div>

      <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex items-center justify-between border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Passo {index + 1} de {size}
        </div>

        <div className="flex gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          )}

          {continuous && (
            <button
              {...primaryProps}
              className="px-4 py-1.5 text-sm bg-[#2ca8e0] text-white rounded hover:bg-[#36a9e1] transition-colors flex items-center gap-1"
            >
              {isLastStep ? (
                'Concluir'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
