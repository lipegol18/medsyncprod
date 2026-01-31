import { forwardRef, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface BrazilianTimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  roundToHalfHour?: boolean;
}

// Gerar lista de horários (00:00 a 23:30 em intervalos de 30 min)
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    times.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

// Função para formatar entrada de tempo durante a digitação com validação
function formatBrazilianTimeInput(value: string, roundMinutes: boolean = false): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  
  if (numbers.length <= 2) {
    const hour = parseInt(numbers);
    if (hour > 23) return numbers.substring(0, 1);
    return numbers;
  }
  
  if (numbers.length <= 4) {
    const hourStr = numbers.substring(0, 2);
    const minuteStr = numbers.substring(2);
    let hourNum = parseInt(hourStr);
    let minuteNum = parseInt(minuteStr);
    
    if (hourNum > 23) hourNum = 23;
    
    if (roundMinutes && minuteStr.length === 2) {
      if (minuteNum >= 45) {
        hourNum = hourNum < 23 ? hourNum + 1 : 23;
        minuteNum = 0;
      } else {
        minuteNum = minuteNum < 15 ? 0 : 30;
      }
      return `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
    }
    
    return `${hourStr}:${minuteStr}`;
  }
  
  const hourStr = numbers.substring(0, 2);
  const minuteStr = numbers.substring(2, 4);
  
  let hourNum = parseInt(hourStr);
  let minuteNum = parseInt(minuteStr);
  
  if (hourNum > 23) hourNum = 23;
  
  if (roundMinutes) {
    if (minuteNum >= 45) {
      hourNum = hourNum < 23 ? hourNum + 1 : 23;
      minuteNum = 0;
    } else {
      minuteNum = minuteNum < 15 ? 0 : 30;
    }
  } else if (minuteNum > 59) {
    minuteNum = 59;
  }
  
  const correctedHour = hourNum.toString().padStart(2, '0');
  const correctedMinute = minuteNum.toString().padStart(2, '0');
  
  return `${correctedHour}:${correctedMinute}`;
}

function isValidTime(timeString: string): boolean {
  if (!timeString) return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) return false;
  
  const [hour, minute] = timeString.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const BrazilianTimeInput = forwardRef<HTMLInputElement, BrazilianTimeInputProps>(
  ({ value = '', onChange, placeholder = 'HH:MM', className, disabled, required, name, roundToHalfHour = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (showDropdown && dropdownRef.current && value) {
        const selectedElement = dropdownRef.current.querySelector(`[data-value="${value}"]`);
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }
    }, [showDropdown, value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formattedValue = formatBrazilianTimeInput(inputValue, roundToHalfHour);
      
      setDisplayValue(formattedValue);
      
      if (formattedValue.length === 5) {
        if (isValidTime(formattedValue) && onChange) {
          onChange(formattedValue);
        }
      } else if (formattedValue.length === 0 && onChange) {
        onChange('');
      }
    };

    const handleTimeSelect = (time: string) => {
      setDisplayValue(time);
      if (onChange) {
        onChange(time);
      }
      setShowDropdown(false);
    };

    return (
      <div ref={containerRef} className="relative flex gap-1 items-center">
        <Input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("flex-1", className)}
          disabled={disabled}
          required={required}
          name={name}
          maxLength={5}
          {...props}
        />
        
        <button
          type="button"
          className="h-7 w-8 flex items-center justify-center border rounded-md bg-background hover:bg-muted transition-colors flex-shrink-0"
          disabled={disabled}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
        </button>

        {showDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
          >
            {TIME_OPTIONS.map((time) => (
              <button
                key={time}
                type="button"
                data-value={time}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors",
                  value === time && "bg-medsync-blue text-white hover:bg-medsync-blue"
                )}
                onClick={() => handleTimeSelect(time)}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

BrazilianTimeInput.displayName = 'BrazilianTimeInput';
