import { SupabaseClient, createClient } from '@supabase/supabase-js';
class SupabaseSingleton {
  private static instance: SupabaseSingleton;
  public client;

  private constructor() {
    this.client = createClient('your-supabase-url', 'your-anon-key');
  }

  public static getInstance(): SupabaseSingleton {
    if (!SupabaseSingleton.instance) {
      SupabaseSingleton.instance = new SupabaseSingleton();
    }
    return SupabaseSingleton.instance;
  }
}

class SupabaseService {
  private client;

  constructor() {
    this.client = SupabaseSingleton.getInstance().client;
  }

  async fetchData() {
    return await this.client.from('table').select('*');
  }
}

const supabase = SupabaseSingleton.getInstance().client;
const supabaseClient: SupabaseClient = supabase;
export const supabaseService = new SupabaseService();

async function initializeSupabase() {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    console.log('Supabase initialized successfully');
  } catch (error) {
    console.error('Error initializing Supabase:', error.message);
  }
}

initializeSupabase();

interface AuthProps {
  redirectTo: string;
}

const Auth: React.FC<AuthProps> = ({ redirectTo }) => {
  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
    } else {
      console.log('User logged in:', data.user);
      // Redirect or perform other actions after successful login
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const email = (event.target as any).email.value;
    const password = (event.target as any).password.value;
    handleLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Log In</button>
    </form>
  );
};

export default Auth;
