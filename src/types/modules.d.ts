declare module "@/components/*";
declare module "@/integrations/*";
declare module "@supabase/auth-helpers-shared";
declare module "circomlibjs";
declare module "bun:test";
declare module "@supabase/ssr";

declare module "mongoose" {
  interface Connection {
    readyState: number;
  }

  interface ConnectOptions {
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
  }

  export function connect(
    uri: string,
    options?: ConnectOptions,
  ): Promise<typeof mongoose>;
  export function connection(): Connection;

  const mongoose: {
    connect: typeof connect;
    connection: typeof connection;
  };

  export default mongoose;
}
