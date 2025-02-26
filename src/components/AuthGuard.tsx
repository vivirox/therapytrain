import { type FC, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/authcontext";
import { Loading } from "@/components/ui/loading";

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace({
        pathname: '/auth',
        query: { from: router.asPath }
      });
    }
  }, [user, router]);

  if (!user) {
    return <Loading>Checking authentication...</Loading>;
  }

  return <>{children}</>;
};
