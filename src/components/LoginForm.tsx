export function LoginForm() {
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': s 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Tampilkan pesan error yang lebih spesifik
        setError(data.error || 'Gagal login');
        console.error('Login failed:', data);
        return;
      }

      // Redirect jika berhasil
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-red-500 mb-4 text-sm">
          {error}
        </div>
      )}
      {/* ...form fields... */}
    </form>
  );
}