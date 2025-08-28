import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"


const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const [isRtl, setIsRtl] = React.useState(false)

  React.useEffect(() => {
    // يتحقق من اتجاه الصفحة أو الحاوية
    const dir = document?.documentElement?.dir || document.body.dir
    setIsRtl(dir === "rtl")
  }, [])

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-8 w-16 rounded-full shrink-0 cursor-pointer items-center border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300 shadow-sm",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-7 w-7 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300",
          isRtl
            ? "data-[state=checked]:-translate-x-8 data-[state=unchecked]:translate-x-0"
            : "data-[state=checked]:translate-x-8 data-[state=unchecked]:translate-x-0",
          "group-focus-within:scale-110 group-active:scale-95"
        )}
      />
    </SwitchPrimitives.Root>
  )
})

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
