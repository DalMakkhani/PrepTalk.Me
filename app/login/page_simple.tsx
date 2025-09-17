"use client"

import { useState } from "react"
import { getApiBaseUrl } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
  const res = await fetch(`${getApiBaseUrl()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data))
        router.push("/dashboard")
      } else {
        setError(data.detail || "Login failed")
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
      background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
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
          <p style={{ color: "#6b7280" }}>Welcome back! Sign in to continue</p>
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
          
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
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
              placeholder="Enter your password"
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
          
          <button 
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        
        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <p style={{ marginBottom: "10px", color: "#6b7280" }}>
            Don't have an account?
          </p>
          <Link 
            href="/register" 
            style={{ 
              color: "#3b82f6", 
              textDecoration: "none", 
              fontWeight: "500" 
            }}
          >
            Create Account
          </Link>
        </div>
        
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link 
            href="/" 
            style={{ 
              color: "#3b82f6", 
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
