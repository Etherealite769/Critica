'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
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
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          password_confirm: formData.passwordConfirm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
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
          NEW STUDENT ENROLLMENT FORM
        </h2>
        <div className="border-t-4 border-gray-900 my-4"></div>
        <div className="inline-block border-4 border-gray-900 px-4 py-2 bg-gray-300">
          <span className="font-mono font-bold text-gray-900">ENROLLMENT FORM</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-200 border-2 border-red-600 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Personal Information Section */}
      <div>
        <h3 className="text-lg font-mono font-bold text-gray-900 mb-4 flex items-center">
          <span className="w-4 h-4 bg-gray-500 rounded-full mr-3"></span>
          PERSONAL INFORMATION
        </h3>
        <div className="border-t-2 border-gray-400 pt-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
                FIRST NAME
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
                LAST NAME
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono"
              required
            />
          </div>
        </div>
      </div>

      {/* Access Credentials Section */}
      <div>
        <h3 className="text-lg font-mono font-bold text-gray-900 mb-4 flex items-center">
          <span className="w-4 h-4 bg-gray-500 rounded-full mr-3"></span>
          ACCESS CREDENTIALS
        </h3>
        <div className="border-t-2 border-gray-400 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
              PASSWORD
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-bold text-gray-700 mb-2">
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-gray-400 rounded bg-white text-gray-900 font-mono"
              required
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gray-300 border-3 border-gray-900 text-gray-900 font-mono font-bold rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'SUBMITTING...' : 'Submit Enrollment Form'}
        </button>
      </div>
    </form>
  );
}
