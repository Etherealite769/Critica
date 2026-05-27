'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SignInFormData {
  email: string;
  password: string;
}

export default function SignInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard or home
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-mono text-gray-900 mb-2">
          OFFICIAL STUDENT AUTHENTICATION DOCUMENT
        </h2>
        <div className="border-t-4 border-gray-900 my-4"></div>
        <div className="inline-block border-4 border-gray-900 px-4 py-2 bg-gray-300">
          <span className="font-mono font-bold text-gray-900">AUTHENTICATION FORM</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-200 border-2 border-red-600 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Identification Section */}
      <div>
        <h3 className="text-lg font-mono font-bold text-gray-900 mb-4 flex items-center">
          <span className="w-4 h-4 bg-gray-500 rounded-full mr-3"></span>
          IDENTIFICATION
        </h3>
        <div className="border-t-2 border-gray-400 pt-4">
          <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
            EMAIL ADDRESS
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address here..."
            className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono placeholder-gray-400 mb-4"
            required
          />
        </div>
      </div>

      {/* Password Section */}
      <div>
        <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
          PASSWORD
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter password here..."
          className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono placeholder-gray-400 mb-2"
          required
        />
        <button
          type="button"
          onClick={() => alert('Password recovery coming soon!')}
          className="text-sm font-mono text-gray-700 hover:text-gray-900 font-bold"
        >
          Forgot Password?
        </button>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gray-300 border-3 border-gray-900 text-gray-900 font-mono font-bold rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'PROCEEDING...' : 'Proceed to Access'}
        </button>
      </div>
    </form>
  );
}
