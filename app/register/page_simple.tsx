"use client"

import { useState } from "react"
import { getApiBaseUrl } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }
    
    try {
  const res = await fetch(`${getApiBaseUrl()}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setSuccess("Registration successful! Redirecting to login...")
        setTimeout(() => router.push("/login"), 1500)
      } else {
        setError(data.detail || "Registration failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        width: "100%",
        maxWidth: "400px"
      }}>
        {/* Logo/Title */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ 
            fontSize: "2rem", 
            fontWeight: "bold", 
            color: "#1f2937", 
            marginBottom: "8px" 
          }}>
            PrepTalk
          </h1>
          <p style={{ color: "#6b7280" }}>Join us and start practicing interviews</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "6px"
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              padding: "12px",
              borderRadius: "6px"
            }}>
              {success}
            </div>
          )}
          
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "16px",
                outline: "none"
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "16px",
                outline: "none"
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "16px",
                outline: "none"
              }}
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#9ca3af" : "#10b981",
              color: "white",
              padding: "12px",
              borderRadius: "6px",
              border: "none",
              fontSize: "16px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "10px"
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        
        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <p style={{ marginBottom: "10px", color: "#6b7280" }}>
            Already have an account?
          </p>
          <Link 
            href="/login" 
            style={{ 
              color: "#10b981", 
              textDecoration: "none", 
              fontWeight: "500" 
            }}
          >
            Sign In
          </Link>
        </div>
        
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link 
            href="/" 
            style={{ 
              color: "#10b981", 
              textDecoration: "none", 
              fontSize: "14px" 
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
