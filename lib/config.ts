// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/login`,
  register: `${API_BASE_URL}/register`,
  analyze_interview: `${API_BASE_URL}/analyze_interview`,
  question: `${API_BASE_URL}/question`,
  progress: `${API_BASE_URL}/progress`,
  session_groups: `${API_BASE_URL}/session_groups`,
  session_group: `${API_BASE_URL}/session_group`,
  complete_session: `${API_BASE_URL}/complete_session`,
  feedback: `${API_BASE_URL}/feedback`,
}

export default API_BASE_URL
