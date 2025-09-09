export default function Home() {
  return (
    <div style={{ padding: "20px", backgroundColor: "white" }}>
      <h1 style={{ color: "black", fontSize: "2rem", marginBottom: "20px" }}>
        PrepTalk - AI Mock Interview Practice
      </h1>
      <p style={{ color: "black", fontSize: "1.2rem", marginBottom: "30px" }}>
        Welcome to PrepTalk! This is a test to ensure the page is loading properly.
      </p>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "20px",
        marginTop: "30px"
      }}>
        <div style={{
          backgroundColor: "#f3f4f6",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #d1d5db"
        }}>
          <h3 style={{ color: "#1f2937", marginBottom: "10px" }}>Voice-Based Practice</h3>
          <p style={{ color: "#6b7280" }}>Take realistic mock interviews with voice input and get instant feedback</p>
          <button style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            marginTop: "15px",
            cursor: "pointer"
          }}>
            Start Practice
          </button>
        </div>
        
        <div style={{
          backgroundColor: "#f3f4f6",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #d1d5db"
        }}>
          <h3 style={{ color: "#1f2937", marginBottom: "10px" }}>AI Feedback</h3>
          <p style={{ color: "#6b7280" }}>Receive detailed feedback on your tone, grammar, and content</p>
          <button style={{
            backgroundColor: "#10b981",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            marginTop: "15px",
            cursor: "pointer"
          }}>
            View Reports
          </button>
        </div>
        
        <div style={{
          backgroundColor: "#f3f4f6",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #d1d5db"
        }}>
          <h3 style={{ color: "#1f2937", marginBottom: "10px" }}>Track Progress</h3>
          <p style={{ color: "#6b7280" }}>Monitor your improvement over time with visual analytics</p>
          <button style={{
            backgroundColor: "#8b5cf6",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            marginTop: "15px",
            cursor: "pointer"
          }}>
            See Dashboard
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <h2 style={{ color: "#1f2937", marginBottom: "20px" }}>Ready to start?</h2>
        <button style={{
          backgroundColor: "#dc2626",
          color: "white",
          padding: "15px 30px",
          border: "none",
          borderRadius: "8px",
          fontSize: "1.1rem",
          cursor: "pointer"
        }}>
          Begin Interview Practice
        </button>
      </div>
    </div>
  )
}
