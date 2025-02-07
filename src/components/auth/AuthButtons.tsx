import { useAuth } from "./AuthProvider";
import { Button } from "@/ui/button";
interface AuthCredentials {
    email: string;
    password: string;
}
const defaultCredentials: AuthCredentials = {
    email: '',
    password: ''
};
export const LoginButton = () => {
    const { login } = useAuth();
    const handleLogin = () => login(defaultCredentials.email, defaultCredentials.password);
    return (<Button onClick={handleLogin} variant="outline">
      Sign In
    </Button>);
};
export const RegisterButton = () => {
    const { register } = useAuth();
    const handleRegister = () => register(defaultCredentials.email, defaultCredentials.password);
    return (<Button onClick={handleRegister} variant="default">
      Sign Up
    </Button>);
};
export const LogoutButton = () => {
    const { logout } = useAuth();
    return (<Button onClick={logout} variant="ghost">
      Sign Out
    </Button>);
};
export const AuthButtons = () => {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return <LogoutButton ></LogoutButton>;
    }
    return (<div className="flex gap-2">
      <LoginButton ></LoginButton>
      <RegisterButton ></RegisterButton>
    </div>);
};
