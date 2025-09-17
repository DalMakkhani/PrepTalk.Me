# PrepTalk: AI-Powered Mock Interview Practice

PrepTalk is a full-stack web application designed to help job seekers in India practice for interviews using AI-powered feedback and analysis.

## Features

- **Voice-Based Practice**: Take realistic mock interviews with voice input and get instant feedback
- **AI Feedback**: Receive detailed feedback on your tone, grammar, and content
- **Progress Tracking**: Monitor your improvement over time with visual analytics
- **Chatbot Assistant**: Get interview tips and answers to your questions from our AI assistant
- **Multiple Question Categories**: Practice with HR, technical, and behavioral questions

## Tech Stack

### Frontend
- React.js (Next.js)
- Tailwind CSS
- shadcn/ui components
- Recharts for data visualization
- AI SDK for chatbot functionality

### Backend
- Python (FastAPI)
- Whisper for speech-to-text (mock implementation)
- NLP for feedback analysis (mock implementation)
- RESTful API endpoints


## Deployment (Vercel/Render)

### Environment Variables

To connect your frontend to the backend, set the following environment variable in Vercel (or locally in a .env file):

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

Replace the value with your actual Render backend URL.

### Vercel Setup

1. Go to your Vercel project dashboard.
2. Add the environment variable `NEXT_PUBLIC_API_URL` under Project Settings > Environment Variables.
3. Redeploy your frontend after saving changes.

### Render Setup (Backend)

1. Deploy the FastAPI backend to Render.
2. Ensure CORS is enabled for your frontend domain.
3. Set all required backend environment variables (see `.env.example`).

---

## Project Structure

\`\`\`
preptalk/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   ├── assistant/          # Chatbot assistant page
│   ├── dashboard/          # Progress dashboard page
│   ├── practice/           # Practice interview page
│   ├── reports/            # Feedback reports pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── backend/                # Python backend
│   ├── data/               # Mock data
│   └── main.py             # FastAPI application
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── README.md               # Project documentation
\`\`\`

## Setup Instructions

### Frontend

1. Clone the repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend

1. Navigate to the backend directory:
   \`\`\`
   cd backend
   \`\`\`
2. Create a virtual environment:
   \`\`\`
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   \`\`\`
3. Install dependencies:
   \`\`\`
   pip install fastapi uvicorn python-multipart
   \`\`\`
4. Run the FastAPI server:
   \`\`\`
   uvicorn main:app --reload
   \`\`\`
5. The API will be available at [http://localhost:8000](http://localhost:8000)

## Deployment

### Frontend
- Deploy to Vercel or any other Next.js-compatible hosting service

### Backend
- Deploy to Render, Heroku, or any Python-compatible hosting service
- Set up environment variables for API keys and configuration

## Future Enhancements

- User authentication and profile management
- Video recording and playback
- More detailed analytics and insights
- Industry-specific question sets
- Integration with job search platforms

## License

MIT
