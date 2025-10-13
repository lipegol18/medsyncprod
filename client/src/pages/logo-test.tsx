import { useState } from "react";
import MedSyncLogo from "@/assets/icons/Medsync_Y_Estilizado_Azul.svg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LogoTest() {
  const [selectedAnimation, setSelectedAnimation] = useState<string>("pulse");

  const animations = [
    { 
      id: "pulse", 
      name: "Pulsação Suave", 
      description: "Transição suave entre azul claro e azul escuro"
    },
    { 
      id: "breathe", 
      name: "Respiração", 
      description: "Efeito de respiração lenta e relaxante"
    },
    { 
      id: "wave", 
      name: "Onda", 
      description: "Onda de cor de baixo para cima"
    },
    { 
      id: "glow", 
      name: "Brilho", 
      description: "Efeito de brilho pulsante"
    },
    { 
      id: "gradient", 
      name: "Gradiente Animado", 
      description: "Gradiente que se move pelo logo"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            MedSync Logo - Teste de Animações
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Escolha um estilo de animação para o logo MedSync
          </p>
        </div>

        {/* Logo Display */}
        <div className="mb-12 flex justify-start">
          <Card className="p-12 bg-white dark:bg-slate-800">
            {selectedAnimation === 'pulse' ? (
              <div className="relative">
                <div className="logo-pulse-container">
                  <img 
                    src={MedSyncLogo} 
                    alt="MedSync Logo" 
                    className="logo-pulse"
                    style={{ width: "512px" }}
                  />
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-48">
                  <p className="text-slate-600 dark:text-slate-400 font-bold max-w-sm leading-relaxed">
                    Nossa IA está lendo os dados do pedido e escrevendo uma justificativa adaptada para o seu paciente.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`logo-container logo-${selectedAnimation}`}>
                {selectedAnimation === 'gradient' ? (
                  <svg 
                    className="logo-svg"
                    style={{ width: "400px", height: "auto" }}
                    viewBox="0 0 1117.17 437.55"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="medsyncSweep" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#36a9e1" />
                        <stop offset="33%" stopColor="#2ca8e0" />
                        <stop offset="66%" stopColor="#124a6b" />
                        <stop offset="100%" stopColor="#36a9e1" />
                        <animateTransform
                          attributeName="gradientTransform"
                          type="translate"
                          from="-1 0"
                          to="1 0"
                          dur="3s"
                          repeatCount="indefinite"
                        />
                      </linearGradient>
                    </defs>
                    <g>
                      <path fill="url(#medsyncSweep)" d="M1107.69,12.37c-2.64-.59-66.13-13.79-215.01,32.02-92.91,28.59-107.26,18.96-135.87-.21-16.08-10.78-36.1-24.19-72.45-36.05-78.04-25.45-164.6,14.58-209.52,40.89-10.64,6.23-38.44,23.24-51.7,32.36-15.08,10.37-36.12,25.2-60.18,42.9,6.68-25.94,11.18-49.16,13.13-67.95.85-7.26-3.04-14.43-10.42-19.18-2.72-1.75-9.63-5.48-14.85-2.31-2.62,1.59-4.08,4.49-3.81,7.4.28,4.18.52,7.8-.86,11.49-6.35,18.22-62.6,89.97-91.35,102.79,3.6-10.62,13.47-30.47,19.33-42.24,10.61-21.32,14.32-29.2,14.32-33.83,0-8.26-10.38-19.66-17.12-23.02-3.1-1.55-6.74-1.98-10.22-1.11-2.67.76-4.54,2.18-6.68,5.28-9.02,7.56-19.19,15.96-28.5,23.27-37.76,29.63-111.9,77.64-182.97,64.88-7.32-1.31-13.92-2.78-19.98-4.34-.45-.12-5.24-1.34-10.43-.52-2.25.36-4.59,1.09-6.67,2.49-7.89,5.29-6.9,13.63-2.47,16.73,1.48,1.03,3.51,2.01,6.29,2.78,8.53,2.34,18.06,4.73,28.97,6.69,79.17,14.21,157.82-34.97,199.42-67.28-6.95,16.06-15.32,36.76-15.32,49.67,0,21.46,21.48,32.53,30.65,32.53,14.96,0,50.51-37.76,74.95-66.87-4.02,13.61-8.05,26.34-12.13,38.39-94.46,73.59-206.14,173.31-206.14,233.46,0,21.22,16.82,44.07,53.75,44.07,43.06,0,83.42-51.52,109.69-94.73,30.25-49.76,59.14-116.37,79.44-183.08,28.89-21.44,57.86-42.06,84.39-58.93,12.02-7.65,32.14-20.45,49.35-30.48,41.47-24.17,121.49-61.55,190.14-39.17,33.17,10.82,50.87,22.68,66.48,33.14,35.48,23.78,56.96,33.85,156.47,3.23,141.45-43.52,202.12-31.64,202.64-31.53,6.54,1.46,12.99-2.67,14.44-9.19,1.45-6.53-2.66-12.99-9.19-14.44ZM151.93,410.9c-10.76-.04-14.23-12.79-14.23-18.98,0-38.63,59.59-108.21,164.39-192.49-55.14,144.74-119.98,210.89-150.15,211.46Z"/>
                    </g>
                  </svg>
                ) : (
                  <img 
                    src={MedSyncLogo} 
                    alt="MedSync Logo" 
                    className="logo-svg"
                    style={{ width: "400px", height: "auto" }}
                  />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Animation Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {animations.map((anim) => (
            <Button
              key={anim.id}
              onClick={() => setSelectedAnimation(anim.id)}
              variant={selectedAnimation === anim.id ? "default" : "outline"}
              className="h-auto flex flex-col items-start p-4 gap-2"
              data-testid={`button-animation-${anim.id}`}
            >
              <span className="font-semibold text-base">{anim.name}</span>
              <span className="text-xs opacity-80 text-left">{anim.description}</span>
            </Button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Como usar no sistema
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Após escolher a animação preferida, podemos aplicá-la em telas de loading, 
            splash screens ou em qualquer lugar que precise indicar processamento.
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        /* Pulsação Suave - Cores MedSync */
        .logo-pulse {
          animation: logo-pulse 3.5s ease-in-out infinite;
        }

        @keyframes logo-pulse {
          0%, 100% {
            filter: brightness(1.2) saturate(1.2);
          }
          50% {
            filter: brightness(0.6) saturate(0.8);
          }
        }

        /* Respiração */
        .logo-breathe .logo-svg {
          animation: logo-breathe 3s ease-in-out infinite;
        }

        @keyframes logo-breathe {
          0%, 100% {
            filter: brightness(1.2) saturate(1.2);
            transform: scale(1);
          }
          50% {
            filter: brightness(0.6) saturate(0.8);
            transform: scale(0.95);
          }
        }

        /* Onda */
        .logo-wave .logo-svg {
          animation: logo-wave 2.5s ease-in-out infinite;
        }

        @keyframes logo-wave {
          0%, 100% {
            filter: brightness(1) hue-rotate(0deg);
            transform: translateY(0);
          }
          25% {
            filter: brightness(0.7) hue-rotate(-15deg);
            transform: translateY(-3px);
          }
          50% {
            filter: brightness(0.5) hue-rotate(-20deg);
            transform: translateY(0);
          }
          75% {
            filter: brightness(0.7) hue-rotate(-15deg);
            transform: translateY(3px);
          }
        }

        /* Brilho */
        .logo-glow .logo-svg {
          animation: logo-glow 2s ease-in-out infinite;
        }

        @keyframes logo-glow {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 0 rgba(39, 170, 225, 0));
          }
          50% {
            filter: brightness(1.3) drop-shadow(0 0 30px rgba(39, 170, 225, 0.8));
          }
        }

        /* Gradiente Animado - SVG inline com SMIL */
        .logo-gradient {
          position: relative;
          display: inline-block;
        }

        /* Efeitos adicionais */
        .logo-container {
          display: inline-block;
          transition: all 0.3s ease;
        }

        .logo-svg {
          display: block;
        }
      `}</style>
    </div>
  );
}
