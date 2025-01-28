import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export const Dashboard = () => {
  const { user, isLoading } = useKindeAuth();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (!user) {
    return <div>Please log in to view the dashboard</div>;
  }

  return (
    <div className="p-4">
      <h1>Welcome {user.given_name}</h1>
      {/* Rest of your dashboard content */}
    </div>
  );
}
