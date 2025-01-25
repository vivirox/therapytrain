import * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toast = () => {
  return (
    <div>
      {/* Your toast implementation */}
      This is a toast message!
    </div>
  );
};

export { Toast };
