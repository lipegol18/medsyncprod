import MedSyncLogo from "@/assets/icons/Medsync_Y_Estilizado_Azul.svg";

interface LoadingLogoProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingLogo({ message = "Carregando...", size = "md" }: LoadingLogoProps) {
  const logoSizes = {
    sm: "256px",
    md: "384px",
    lg: "512px"
  };

  return (
    <div className="relative" data-testid="loading-logo">
      <div className="logo-pulse-container">
        <img 
          src={MedSyncLogo} 
          alt="MedSync" 
          className="logo-pulse"
          style={{ width: logoSizes[size] }}
        />
      </div>
      {message && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-48">
          <p className="text-white font-bold max-w-sm leading-relaxed" data-testid="loading-message">
            {message}
          </p>
        </div>
      )}

      <style>{`
        .logo-pulse {
          animation: logo-pulse-loading 3.5s ease-in-out infinite;
        }

        @keyframes logo-pulse-loading {
          0%, 100% {
            filter: brightness(1.2) saturate(1.2);
          }
          50% {
            filter: brightness(0.6) saturate(0.8);
          }
        }
      `}</style>
    </div>
  );
}
