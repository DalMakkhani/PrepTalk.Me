export default function Home() {
  return (
    <div>
      <h1>PrepTalk Works!</h1>
      <p>This is a test page to confirm the application is running.</p>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f0f0f0', 
        margin: '20px 0',
        borderRadius: '8px'
      }}>
        <h2>Features:</h2>
        <ul>
          <li>Voice-Based Practice</li>
          <li>AI Feedback</li>
          <li>Track Progress</li>
          <li>AI Assistant</li>
        </ul>
      </div>
      <button style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}>
        Start Practice
      </button>
    </div>
  )
}
