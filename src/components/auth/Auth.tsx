const Auth = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If we're on the callback route and authenticated
    if (location.pathname === '/callback' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // If we're authenticated but on the auth page
    if (location.pathname === '/auth' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [isAuthenticated, location.pathname]);

  return <Loading fullScreen message="Processing authentication..." />;
};
