import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MdPsychology as Brain, MdArrowBack } from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { createClient } from '@/integrations/supabase/client';
import { LanguageSelectionStep } from '@/components/auth/LanguageSelectionStep';
import { useI18nContext } from '@/lib/i18n/i18n-context';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type AuthStep = 'credentials' | 'language' | 'complete';

const AuthPage = () => {
    const router = useRouter();
    const { changeLanguage } = useI18nContext();
    const { updatePreferences } = useUserPreferences({
        onError: (error) => console.error("Error managing preferences:", error)
    });
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [registrationStep, setRegistrationStep] = useState<AuthStep>('credentials');
    const [selectedLanguage, setSelectedLanguage] = useState<string>();
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await createClient.auth.getSession();
            if (data.session) {
                console.log("User authenticated, redirecting to dashboard");
                router.replace("/dashboard");
            }
        };
        checkSession();
    }, [router]);

    const handleLogin = async () => {
        try {
            console.log("Attempting to login...");
            const { data, error } = await createClient.auth.signInWithPassword({ email, password });
            if (error) {
                console.error("Login error:", error.message);
            } else if (data.user) {
                router.replace("/dashboard");
            }
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleRegister = async () => {
        try {
            setIsRegistering(true);
            console.log("Attempting to register...");
            const { data, error } = await createClient.auth.signUp({ email, password });
            if (error) {
                console.error("Registration error:", error.message);
            } else if (data.user) {
                // Move to language selection step
                setRegistrationStep('language');
            }
        } catch (error) {
            console.error("Registration error:", error);
        } finally {
            setIsRegistering(false);
        }
    };

    const handleLanguageSelect = async (language: string) => {
        try {
            setSelectedLanguage(language);
            // Update user's language preference using the hook
            await updatePreferences({ language });
            // Complete registration
            setRegistrationStep('complete');
            router.replace("/dashboard");
        } catch (error) {
            console.error("Error setting language:", error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md space-y-8 bg-[#1A1A1D] p-8 rounded-lg shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Brain className="h-16 w-16 text-blue-500" />
                    <h1 className="text-center text-3xl font-bold tracking-tight text-white">
                        Welcome to Gradiant
                    </h1>
                    <p className="text-center text-gray-400">
                        {registrationStep === 'language'
                            ? 'Choose your preferred language'
                            : 'Sign in or create an account to start your journey'}
                    </p>
                </div>

                {registrationStep === 'credentials' && (
                    <div className="space-y-4 mt-8">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                        />
                        <Button
                            onClick={handleLogin}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
                        >
                            Sign in with Supabase
                        </Button>

                        <Button
                            onClick={handleRegister}
                            disabled={isRegistering}
                            variant="outline"
                            className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white py-3"
                        >
                            {isRegistering ? 'Creating Account...' : 'Create an Account'}
                        </Button>
                    </div>
                )}

                {registrationStep === 'language' && (
                    <LanguageSelectionStep
                        onLanguageSelect={handleLanguageSelect}
                        selectedLanguage={selectedLanguage}
                        className="mt-8"
                    />
                )}

                <p className="mt-4 text-center text-sm text-gray-400">
                    By continuing, you agree to our{" "}
                    <a href="/terms-of-service" className="text-blue-500 hover:text-blue-400">
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy-policy" className="text-blue-500 hover:text-blue-400">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
