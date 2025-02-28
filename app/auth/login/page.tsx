export default function LoginPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">Login</h1>
        <form>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Email"
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Password"
                className="mt-1 block w-full rounded-md border p-2"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-white"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 