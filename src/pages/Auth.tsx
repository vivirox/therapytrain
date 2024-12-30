import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { CircleUserRound, Mail, LogIn } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
})

const Auth: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors }
  } = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema)
  })  

  const handleEmailSignUp = async (values: z.infer<typeof authSchema>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/select-client`
        }
      })

      if (error) throw error
      
      toast({
        title: "Account created",
        description: "Please check your email to verify your account"
      })
      
      navigate('/select-client')
    } catch (error) {
      toast({        
        variant: "destructive",
        title: "Error",
        description: error.message
      })
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/select-client`
      }
    })

    if (error) {
      console.error('Error:', error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-[#1A1A1D] rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Sign in to TherapyTrain
        </h2>
        {/* Email Sign Up Form */}
        <form onSubmit={handleSubmit(handleEmailSignUp)} className="space-y-4 mb-6">
          <Input
            type="email"
            placeholder="Email"
            {...register("email")}
            className="bg-[#2A2A2D] border-gray-700"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
          
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              {...register("password")}
              className="bg-[#2A2A2D] border-gray-700"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Sign up with Email
          </Button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#1A1A1D] text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* OAuth Options */}
        <div className="space-y-4">
          <Button
            onClick={() => handleOAuthLogin('google')}
            className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <CircleUserRound className="h-4 w-4" />
            Continue with Google
          </Button>

          <Button
            onClick={() => handleOAuthLogin('github')}
            className="w-full bg-[#24292E] hover:bg-[#2F363D] flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Auth