import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useSettings } from "@/features/settings/useSettings"
import { useEffect } from "react"
import { updateToastColorsFromSettings } from "@/lib/toast"

export function Toaster() {
  const { toasts } = useToast()
  const { settings } = useSettings()

  // Update toast colors when settings change
  useEffect(() => {
    if (settings) {
      updateToastColorsFromSettings(settings)
    }
  }, [settings])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
