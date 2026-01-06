import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 2000

// Sistema de filtros para toasts
export type ToastLevel = "info" | "error" | "success" | "warning"
export type ToastFilterConfig = {
  showInfo: boolean
  showError: boolean
  showSuccess: boolean
  showWarning: boolean
}

// Configuração padrão - mostra todos os tipos
const DEFAULT_FILTER_CONFIG: ToastFilterConfig = {
  showInfo: true,
  showError: true,
  showSuccess: true,
  showWarning: true,
}

// Estado global para configuração de filtros
let globalFilterConfig: ToastFilterConfig = { ...DEFAULT_FILTER_CONFIG }

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  level?: ToastLevel
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

// Função para configurar filtros globalmente
export function setToastFilterConfig(config: Partial<ToastFilterConfig>) {
  globalFilterConfig = { ...globalFilterConfig, ...config }
}

// Função para obter configuração atual
export function getToastFilterConfig(): ToastFilterConfig {
  return { ...globalFilterConfig }
}

// Funções de conveniência para configurações comuns
export const ToastPresets = {
  // Mostrar apenas erros
  errorsOnly: () => setToastFilterConfig({ 
    showInfo: false, 
    showError: true, 
    showSuccess: false, 
    showWarning: false 
  }),
  
  // Mostrar erros e avisos importantes
  errorsAndWarnings: () => setToastFilterConfig({ 
    showInfo: false, 
    showError: true, 
    showSuccess: false, 
    showWarning: true 
  }),
  
  // Mostrar tudo (padrão)
  showAll: () => setToastFilterConfig(DEFAULT_FILTER_CONFIG),
  
  // Ocultar informativos (apenas feedback importante)
  hideInfos: () => setToastFilterConfig({ 
    showInfo: false, 
    showError: true, 
    showSuccess: true, 
    showWarning: true 
  })
}

// Função para determinar nível baseado na variant
function getToastLevel(variant?: string | null): ToastLevel {
  switch (variant) {
    case "destructive":
      return "error"
    case "success":
      return "success"
    case "warning":
      return "warning"
    default:
      return "info"
  }
}

// Função para verificar se o toast deve ser exibido
function shouldShowToast(level: ToastLevel): boolean {
  switch (level) {
    case "info":
      return globalFilterConfig.showInfo
    case "error":
      return globalFilterConfig.showError
    case "success":
      return globalFilterConfig.showSuccess
    case "warning":
      return globalFilterConfig.showWarning
    default:
      return true
  }
}

function toast({ ...props }: Toast) {
  const level = getToastLevel(props.variant)
  
  // Verificar se o toast deve ser exibido baseado na configuração
  if (!shouldShowToast(level)) {
    console.log(`Toast filtrado: ${level} - "${props.title}"`)
    return {
      id: "",
      dismiss: () => {},
      update: () => {},
    }
  }

  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      level,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Garantir que o toast seja removido automaticamente após o delay
  addToRemoveQueue(id)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  const [filterConfig, setFilterConfigState] = React.useState<ToastFilterConfig>(globalFilterConfig)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  // Atualizar estado local quando configuração global muda
  React.useEffect(() => {
    setFilterConfigState(globalFilterConfig)
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    // Funções para controlar filtros
    setFilterConfig: (config: Partial<ToastFilterConfig>) => {
      setToastFilterConfig(config)
      setFilterConfigState(globalFilterConfig)
    },
    getFilterConfig: () => globalFilterConfig,
    presets: ToastPresets,
  }
}

export { useToast, toast }
