import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock, User, Loader2, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import loginBg from "../images/login background image.jpg";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signup(name, email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="backdrop-blur-lg bg-white/90 rounded-2xl shadow-2xl border border-white/30 p-8">

          {/* Header */}
          <div className="flex flex-col items-center mb-6">

            <div className="bg-green-100 p-3 rounded-full mb-3">
              <Leaf className="text-green-600 w-7 h-7" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800">
              Create Account
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Join Food Expiry Manager
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Full Name
              </label>

              <div className="mt-1 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500 transition">
                <User className="w-4 h-4 text-gray-400 mr-2" />

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Email
              </label>

              <div className="mt-1 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500 transition">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Password
              </label>

              <div className="mt-1 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500 transition">
                <Lock className="w-4 h-4 text-gray-400 mr-2" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Confirm Password
              </label>

              <div className="mt-1 flex items-center bg-white border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500 transition">
                <Lock className="w-4 h-4 text-gray-400 mr-2" />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  className="w-full outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  Sign Up
                </>
              )}
            </button>

          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-green-600 font-medium hover:underline"
            >
              Login
            </Link>
          </p>

        </div>
      </motion.div>
    </div>
  );
}

export default Signup;