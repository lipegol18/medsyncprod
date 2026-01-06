import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "medsync-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      // Forçar sempre o tema claro inicialmente
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      // Se houver um tema escuro armazenado, limpar e usar o padrão claro
      if (storedTheme === "dark") {
        localStorage.removeItem(storageKey);
        return defaultTheme;
      }
      return storedTheme || defaultTheme;
    }
  )

  useEffect(() => {
    const root = window.document.documentElement

    // Força a remoção de todas as classes de tema
    root.classList.remove("light", "dark", "system")

    // Para novos usuários, sempre começar com light
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      console.log(`Aplicando tema do sistema: ${systemTheme}`)
      return
    }

    // Força sempre light se não há preferência armazenada
    const themeToApply = theme || "light"
    root.classList.add(themeToApply)
    
    // Debug logs
    console.log(`🎨 Tema aplicado: ${themeToApply}`)
    console.log(`📋 Classes do HTML:`, root.className)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}