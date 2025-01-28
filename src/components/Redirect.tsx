import { Navigate } from "react-router-dom";

type RedirectProps = {
  redirectTo: string;
}

const Redirect = ({ redirectTo }: RedirectProps) => {
  // Your component logic here
  return <Navigate to={redirectTo} />;
}
