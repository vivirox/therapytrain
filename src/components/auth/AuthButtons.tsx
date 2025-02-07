import { useAuth } from '@/authprovider';
import { Button } from "@/components/ui/button";
interface AuthCredentials {
    email: string;
    password: string;
}
const defaultCredentials: AuthCredentials = {
    email: '',
    password: ''
};
export const LoginButton: React.FC = () => {
    const { login } = useAuth();
    const handleLogin = () => login(defaultCredentials.email, defaultCredentials.password);
    return (<Button onClick={handleLogin} variant="outline">
      Sign In
    </Button>);
};
export const RegisterButton: React.FC = () => {
    const { register } = useAuth();
    const handleRegister = () => register(defaultCredentials.email, defaultCredentials.password);
    return (<Button onClick={handleRegister} variant="default">
      Sign Up
    </Button>);
};
export const LogoutButton: React.FC = () => {
    const { logout } = useAuth();
    return (<Button onClick={logout} variant="ghost">
      Sign Out
    </Button>);
};
export const AuthButtons: React.FC = () => {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return <LogoutButton ></LogoutButton>;
    }
    return (<div className="flex gap-2">
      <LoginButton ></LoginButton>
      <RegisterButton ></RegisterButton>
    </div>);
};
