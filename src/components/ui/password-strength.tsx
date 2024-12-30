import React from "react"
import { Progress } from "./progress"

export const PasswordStrength = ({ password }: { password: string }) => {
  const strength = calculateStrength(password)
  
  return (
    <div className="space-y-2">
      <Progress value={strength * 25} className="h-2" />
      <p className="text-sm text-gray-400">
        {getStrengthText(strength)}
      </p>
    </div>
  )
}

const calculateStrength = (password: string): number => {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++
  return strength
}

const getStrengthText = (strength: number): string => {
  const texts = ['Weak', 'Fair', 'Good', 'Strong']
  return texts[strength - 1] || 'Too weak'
}
