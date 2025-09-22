import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    // Classes de gradiente para backgrounds de status
    'bg-gradient-to-r',
    // Cores de fundo claro para gradientes
    'from-red-50', 'to-red-100/50',
    'from-blue-50', 'to-blue-100/50', 
    'from-green-50', 'to-green-100/50',
    'from-yellow-50', 'to-yellow-100/50',
    'from-purple-50', 'to-purple-100/50',
    'from-orange-50', 'to-orange-100/50',
    'from-pink-50', 'to-pink-100/50',
    'from-gray-50', 'to-gray-100/50',
    'from-slate-50', 'to-slate-100/50',
    'from-zinc-50', 'to-zinc-100/50',
    'from-neutral-50', 'to-neutral-100/50',
    'from-stone-50', 'to-stone-100/50',
    'from-amber-50', 'to-amber-100/50',
    'from-lime-50', 'to-lime-100/50',
    'from-emerald-50', 'to-emerald-100/50',
    'from-teal-50', 'to-teal-100/50',
    'from-cyan-50', 'to-cyan-100/50',
    'from-sky-50', 'to-sky-100/50',
    'from-indigo-50', 'to-indigo-100/50',
    'from-violet-50', 'to-violet-100/50',
    'from-fuchsia-50', 'to-fuchsia-100/50',
    'from-rose-50', 'to-rose-100/50',
    // Cores de fundo para ícones  
    'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200',
    'bg-purple-200', 'bg-orange-200', 'bg-pink-200', 'bg-gray-200',
    'bg-slate-200', 'bg-zinc-200', 'bg-neutral-200', 'bg-stone-200',
    'bg-amber-200', 'bg-lime-200', 'bg-emerald-200', 'bg-teal-200',
    'bg-cyan-200', 'bg-sky-200', 'bg-indigo-200', 'bg-violet-200',
    'bg-fuchsia-200', 'bg-rose-200',
    // Cores de texto para ícones
    'text-red-700', 'text-blue-700', 'text-green-700', 'text-yellow-700',
    'text-purple-700', 'text-orange-700', 'text-pink-700', 'text-gray-700',
    'text-slate-700', 'text-zinc-700', 'text-neutral-700', 'text-stone-700',
    'text-amber-700', 'text-lime-700', 'text-emerald-700', 'text-teal-700',
    'text-cyan-700', 'text-sky-700', 'text-indigo-700', 'text-violet-700',
    'text-fuchsia-700', 'text-rose-700'
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Proxima Nova', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'lato': ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'nunito': ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'proxima': ['Proxima Nova', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'proxima-condensed': ['Proxima Nova Condensed', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
