import * as React from "react";
import { OTPInput } from "input-otp";
import { MdFiberManualRecord } from "react-icons/md";
import { cn } from "@/../lib/utils";
import { OTPProps } from "./types";
const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput> & OTPProps>(({ className, containerClassName, maxLength = 6, ...props }, ref) => (<OTPInput ref={ref} containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)} className={cn("disabled:cursor-not-allowed", className)} maxLength={maxLength} render={({ slots }) => (<>
        {slots.map((slot, idx) => (<div key={idx}>
            <InputOTPSlot {...slot}></InputOTPSlot>
          </div>))}
      </>)} {...props}/>));
InputOTP.displayName = "InputOTP";
const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ className, ...props }, ref) => (<div ref={ref} className={cn("flex items-center", className)} {...props}/>));
InputOTPGroup.displayName = "InputOTPGroup";
const InputOTPSlot = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {
    char?: string;
    hasFakeCaret?: boolean;
    isActive?: boolean;
}>(({ className, char, hasFakeCaret, isActive, ...props }, ref) => (<div className={cn("relative h-10 w-10 rounded-md border border-input bg-background text-sm transition-all", isActive && "ring-2 ring-offset-background ring-ring", className)}>
    <input ref={ref} className={cn("absolute inset-0 h-full w-full text-center opacity-0", props.disabled && "cursor-not-allowed")} {...props}/>
    {char && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {char}
      </div>)}
    {hasFakeCaret && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000"/>
      </div>)}
    {!char && !hasFakeCaret && (<MdFiberManualRecord className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-muted-foreground"></MdFiberManualRecord>)}
  </div>));
InputOTPSlot.displayName = "InputOTPSlot";
const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ ...props }, ref) => (<div ref={ref} role="separator" {...props}>
    <MdFiberManualRecord ></MdFiberManualRecord>
  </div>));
InputOTPSeparator.displayName = "InputOTPSeparator";
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
