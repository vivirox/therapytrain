import { useState, useEffect, useCallback } from 'react'
import type { Toast, ToastAction } from '@/types/ui'

// Action types
const TOAST_ACTIONS = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

type ActionType = typeof TOAST_ACTIONS[keyof typeof TOAST_ACTIONS]

type State = {
  toasts: Toast[]
}

type Action =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'UPDATE_TOAST'; toast: Partial<Toast> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

const generateId = () => Math.random().toString(36).substr(2, 9)

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case TOAST_ACTIONS.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts],
      }

    case TOAST_ACTIONS.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t: any) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case TOAST_ACTIONS.DISMISS_TOAST: {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.map((t: any) =>
          t.id === toastId || (toastId === undefined && t.id === state.toasts[0]?.id)
            ? {
                ...t,
                dismissed: true,
              }
            : t
        ),
      }
    }

    case TOAST_ACTIONS.REMOVE_TOAST: {
      const { toastId } = action

      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }

      return {
        ...state,
        toasts: state.toasts.filter((t: any) => t.id !== toastId),
      }
    }
  }
}

export function useToast() {
  const [state, setState] = useState<State>({ toasts: [] })

  useEffect(() => {
    state.toasts.forEach((toast: any) => {
      if (toast.dismissed || !toast.duration) return

      const timeoutId = setTimeout(() => {
        dispatch({ type: TOAST_ACTIONS.DISMISS_TOAST, toastId: toast.id })
      }, toast.duration)

      return () => clearTimeout(timeoutId)
    })
  }, [state.toasts])

  const dispatch = useCallback((action: Action) => {
    setState((prevState) => reducer(prevState, action))
  }, [])

  const toast = useCallback(
    (props: Omit<Toast, 'id'>) => {
      const id = props.id || generateId()

      const update = (props: Partial<Toast>) =>
        dispatch({
          type: TOAST_ACTIONS.UPDATE_TOAST,
          toast: { ...props, id },
        })

      const dismiss = () => dispatch({ type: TOAST_ACTIONS.DISMISS_TOAST, toastId: id })

      dispatch({
        type: TOAST_ACTIONS.ADD_TOAST,
        toast: {
          ...props,
          id,
          duration: props.duration ?? 5000,
        },
      })

      return {
        id,
        dismiss,
        update,
      }
    },
    [dispatch]
  )

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: TOAST_ACTIONS.DISMISS_TOAST, toastId }),
    remove: (toastId?: string) => dispatch({ type: TOAST_ACTIONS.REMOVE_TOAST, toastId }),
  }
}

export interface ToastState {
    toasts: Toast[];
}
