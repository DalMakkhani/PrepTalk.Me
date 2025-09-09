from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests, json, uuid, os
from faster_whisper import WhisperModel
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import logging
from groq import Groq
from dotenv import load_dotenv
import httpx

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Initialize Groq client with faster model
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

groq_client = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL_FAST = "llama-3.1-8b-instant"      # For quick tasks
GROQ_MODEL_SMART = "llama-3.3-70b-versatile"   # For complex analysis
GROQ_TIMEOUT = 60  # Increased timeout for larger model
model = WhisperModel("base", device="cpu")  # Force CPU usage to avoid CUDA issues

# --- MongoDB Setup ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, socketTimeoutMS=20000, connectTimeoutMS=20000)
    # Test the connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")
    db = client["preptalk"]
    users_collection = db["users"]
    interviews_collection = db["interviews"]
    
    # Create demo user if it doesn't exist
    demo_user = {
        "email": "demo@preptalk.com",
        "username": "demo_user_123456",  # Add username for compatibility
        "password": "demo123",
        "full_name": "Demo User",
        "experience": "junior",
        "job_domain": "software-engineering",
        "created_at": datetime.utcnow(),
        "user_id": "demo_user_123456"
    }
    
    if not users_collection.find_one({"email": "demo@preptalk.com"}):
        users_collection.insert_one(demo_user)
        print("✅ Demo user created: demo@preptalk.com / demo123")
    
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print("🔄 Falling back to local MongoDB...")
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    db = client["preptalk"]
    users_collection = db["users"]
    interviews_collection = db["interviews"]

# --- LLM Helper Functions ---
async def call_groq_llm(prompt: str, model_name: str = None, use_smart_model: bool = False) -> str:
    """Helper function to call Groq API with optimizations"""
    if model_name is None:
        model_name = GROQ_MODEL_SMART if use_smart_model else GROQ_MODEL_FAST
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=model_name,
            temperature=0.7,
            max_tokens=2048,  # Increased for better responses from 70B model
            timeout=GROQ_TIMEOUT,  # Add timeout
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        logging.error(f"Groq API error: {e}")
        # Fallback to predefined response if API fails
        return '{"error": "API timeout or failure", "fallback": true}'

# --- Dynamic Question Generation ---
async def generate_questions(category: str, count: int = 1, job_domain: str = "", user_id: str = "") -> list:
    """Generate dynamic interview questions using Groq with diversity tracking"""
    
    # Get previously asked questions for this user to ensure diversity
    recent_questions = []
    if user_id:
        try:
            # Get questions from last 7 days to avoid repetition
            from datetime import timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            recent_sessions = list(db["sessions"].find({
                "user_id": user_id,
                "date": {"$gte": week_ago},
                "category": category
            }).sort("date", -1).limit(20))
            
            recent_questions = [session.get("question", "") for session in recent_sessions if session.get("question")]
            logger.info(f"Found {len(recent_questions)} recent questions for user {user_id} in category {category}")
        except Exception as e:
            logger.error(f"Error fetching recent questions: {e}")
    
    # Create diverse technical subcategories
    if category == "technical":
        if job_domain and "data" in job_domain.lower():
            domain_areas = [
                "machine learning algorithms and model selection strategies",
                "statistical analysis and hypothesis testing methodologies", 
                "data visualization and storytelling with insights",
                "big data processing and distributed computing systems",
                "feature engineering and dimensionality reduction techniques",
                "model deployment, monitoring and production challenges",
                "data pipeline architecture and ETL processes",
                "deep learning frameworks and neural network architectures",
                "time series analysis and forecasting methods",
                "A/B testing and experimental design",
                "data quality assessment and anomaly detection",
                "recommendation systems and collaborative filtering",
                "natural language processing and text analytics",
                "computer vision and image processing techniques",
                "graph analytics and network analysis"
            ]
        else:
            domain_areas = [
                "algorithms and computational complexity analysis",
                "system design and scalable architecture patterns", 
                "database design, optimization and indexing strategies",
                "programming paradigms and design patterns",
                "software development lifecycle and agile methodologies",
                "debugging techniques and performance optimization",
                "code review practices and refactoring strategies",
                "cloud computing and microservices architecture",
                "security best practices and vulnerability assessment",
                "testing strategies and quality assurance methods",
                "version control and collaborative development",
                "API design and RESTful service development",
                "concurrency and parallel programming concepts",
                "web development frameworks and technologies",
                "mobile application development principles"
            ]
        
        # Shuffle and select different areas for variety
        import random
        random.shuffle(domain_areas)
        selected_areas = domain_areas[:count]
        
        category_desc = f"technical questions covering: {', '.join(selected_areas)}"
        
    elif category == "hr":
        hr_areas = [
            "career background and professional journey",
            "company culture fit and values alignment", 
            "career goals and long-term aspirations",
            "strengths, weaknesses and self-assessment",
            "challenging situations and problem resolution",
            "motivation and passion for the role/industry",
            "team collaboration and communication style",
            "leadership experience and management approach",
            "learning and development mindset",
            "salary expectations and compensation discussion"
        ]
        import random
        random.shuffle(hr_areas)
        selected_areas = hr_areas[:count]
        category_desc = f"human resources/behavioral questions about: {', '.join(selected_areas)}"
        
    elif category == "behavioral":
        behavioral_areas = [
            "past project experiences and outcomes",
            "teamwork and collaboration scenarios", 
            "problem-solving and analytical thinking",
            "leadership and mentoring experiences",
            "conflict resolution and difficult conversations",
            "adaptability and change management",
            "time management and prioritization skills",
            "innovation and creative thinking examples",
            "failure handling and learning from mistakes",
            "customer focus and stakeholder management"
        ]
        import random
        random.shuffle(behavioral_areas)
        selected_areas = behavioral_areas[:count]
        category_desc = f"behavioral questions about: {', '.join(selected_areas)}"
    else:
        category_desc = f"{category} questions"
    
    # Build prompt with recently asked questions to avoid repetition
    avoid_questions_text = ""
    if recent_questions:
        avoid_questions_text = f"\n\nIMPORTANT: Avoid asking questions similar to these recently asked ones:\n{chr(10).join(f'- {q}' for q in recent_questions[:10])}\n\nMake sure your questions are distinctly different in focus and approach."
    
    prompt = f"""Generate exactly {count} diverse interview questions covering {category_desc}. 

IMPORTANT: Each question should be distinctly different and cover different aspects/topics. Avoid repetitive or similar questions.{avoid_questions_text}

# --- Dynamic Question Generation ---
async def generate_questions(category: str, count: int = 1, job_domain: str = "", user_id: str = "") -> list:
    """Generate dynamic interview questions using Groq with diversity tracking"""
    
    # Get previously asked questions for this user to ensure diversity
    recent_questions = []
    if user_id:
        try:
            # Get questions from last 7 days to avoid repetition
            from datetime import timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            recent_sessions = list(db["sessions"].find({
                "user_id": user_id,
                "date": {"$gte": week_ago},
                "category": category
            }).sort("date", -1).limit(20))
            
            recent_questions = [session.get("question", "") for session in recent_sessions if session.get("question")]
            logger.info(f"Found {len(recent_questions)} recent questions for user {user_id} in category {category}")
        except Exception as e:
            logger.error(f"Error fetching recent questions: {e}")
    
    # Create diverse technical subcategories
    if category == "technical":
        if job_domain and "data" in job_domain.lower():
            domain_areas = [
                "machine learning algorithms and model selection strategies",
                "statistical analysis and hypothesis testing methodologies", 
                "data visualization and storytelling with insights",
                "big data processing and distributed computing systems",
                "feature engineering and dimensionality reduction techniques",
                "model deployment, monitoring and production challenges",
                "data pipeline architecture and ETL processes",
                "deep learning frameworks and neural network architectures",
                "time series analysis and forecasting methods",
                "A/B testing and experimental design",
                "data quality assessment and anomaly detection",
                "recommendation systems and collaborative filtering",
                "natural language processing and text analytics",
                "computer vision and image processing techniques",
                "graph analytics and network analysis"
            ]
        else:
            domain_areas = [
                "algorithms and computational complexity analysis",
                "system design and scalable architecture patterns", 
                "database design, optimization and indexing strategies",
                "programming paradigms and design patterns",
                "software development lifecycle and agile methodologies",
                "debugging techniques and performance optimization",
                "code review practices and refactoring strategies",
                "cloud computing and microservices architecture",
                "security best practices and vulnerability assessment",
                "testing strategies and quality assurance methods",
                "version control and collaborative development",
                "API design and RESTful service development",
                "concurrency and parallel programming concepts",
                "web development frameworks and technologies",
                "mobile application development principles"
            ]
        
        # Shuffle and select different areas for variety
        import random
        random.shuffle(domain_areas)
        selected_areas = domain_areas[:count]
        
        category_desc = f"technical questions covering: {', '.join(selected_areas)}"
        
    elif category == "hr":
        hr_areas = [
            "career background and professional journey",
            "company culture fit and values alignment", 
            "career goals and long-term aspirations",
            "strengths, weaknesses and self-assessment",
            "challenging situations and problem resolution",
            "motivation and passion for the role/industry",
            "team collaboration and communication style",
            "leadership experience and management approach",
            "learning and development mindset",
            "salary expectations and compensation discussion"
        ]
        import random
        random.shuffle(hr_areas)
        selected_areas = hr_areas[:count]
        category_desc = f"human resources/behavioral questions about: {', '.join(selected_areas)}"
        
    elif category == "behavioral":
        behavioral_areas = [
            "past project experiences and outcomes",
            "teamwork and collaboration scenarios", 
            "problem-solving and analytical thinking",
            "leadership and mentoring experiences",
            "conflict resolution and difficult conversations",
            "adaptability and change management",
            "time management and prioritization skills",
            "innovation and creative thinking examples",
            "failure handling and learning from mistakes",
            "customer focus and stakeholder management"
        ]
        import random
        random.shuffle(behavioral_areas)
        selected_areas = behavioral_areas[:count]
        category_desc = f"behavioral questions about: {', '.join(selected_areas)}"
    else:
        category_desc = f"{category} questions"
    
    # Build prompt with recently asked questions to avoid repetition
    avoid_questions_text = ""
    if recent_questions:
        avoid_questions_text = f"\n\nIMPORTANT: Avoid asking questions similar to these recently asked ones:\n{chr(10).join(f'- {q}' for q in recent_questions[:10])}\n\nMake sure your questions are distinctly different in focus and approach."
    
    prompt = f"""Generate exactly {count} diverse interview questions covering {category_desc}. 

IMPORTANT: Each question should be distinctly different and cover different aspects/topics. Avoid repetitive or similar questions.{avoid_questions_text}

Guidelines:
- Make each question unique and focused on a different skill/area
- Use varied question formats (scenario-based, experience-based, hypothetical, etc.)
- Ensure questions test different competencies within the category
- Keep questions clear, professional and interview-appropriate

Return ONLY a JSON array of question strings: ["question1", "question2", ...]

Example for technical: Instead of asking multiple similar questions, vary the focus - one about algorithms, one about system design, one about debugging, etc."""

Example for technical: Instead of asking multiple data preprocessing questions, ask one about preprocessing, one about algorithms, one about system design, etc."""
    
    try:
        response = await call_groq_llm(prompt, use_smart_model=False)  # Fast model for questions
        logger.info(f"Raw Groq response: {response}")
        
        # Clean the response more thoroughly
        response = response.strip()
        
        # Remove common markdown formatting
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        # Remove any leading/trailing text and find JSON array
        import re
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            response = json_match.group(0)
        
        logger.info(f"Cleaned response: {response}")
        parsed = json.loads(response)
        
        # Handle different response formats
        if isinstance(parsed, list):
            # If it's a list of strings, return as is
            if all(isinstance(item, str) for item in parsed):
                return parsed
            # If it's a list of objects with question field, extract questions
            elif all(isinstance(item, dict) and 'question' in item for item in parsed):
                return [item['question'] for item in parsed[:count]]
        
        return [str(parsed)] if count == 1 else [str(parsed)]
    except Exception as e:
        logging.error(f"Question generation error: {e}")
        # Fallback to predefined questions
        return get_fallback_questions(category, count)

def get_fallback_questions(category: str, count: int = 1) -> list:
    """Fallback to predefined questions if generation fails"""
    fallback_questions = {
        "hr": [
            "Tell me about yourself and your background.",
            "Why do you want to work for our company?",
            "Where do you see yourself in 5 years?",
            "What are your strengths and weaknesses?",
            "Describe a challenging situation at work and how you handled it.",
            "Why should we hire you?",
            "What do you know about our company?",
            "What is your expected salary?",
            "How do you handle stress and pressure?",
            "Do you have any questions for us?"
        ],
        "technical": [
            "Explain your approach to problem-solving in your field.",
            "Describe a project where you applied your technical skills effectively.",
            "How do you stay updated with the latest technologies in your field?",
            "Explain a complex technical concept in simple terms.",
            "How would you handle a technical disagreement with a team member?",
            "What programming languages are you proficient in?",
            "Describe your experience with agile methodologies.",
            "How do you ensure code quality in your projects?",
            "Explain the difference between REST and GraphQL.",
            "How would you optimize a slow-performing application?"
        ],
        "behavioral": [
            "Describe a time when you had to work under pressure to meet a deadline.",
            "Tell me about a time when you had to adapt to a significant change at work.",
            "Give an example of how you worked on a team to accomplish a goal.",
            "Describe a situation where you had to resolve a conflict with a colleague.",
            "Tell me about a time when you failed and what you learned from it.",
            "Describe a situation where you demonstrated leadership skills.",
            "Tell me about a time when you went above and beyond for a project.",
            "How do you prioritize tasks when you have multiple deadlines?",
            "Describe a time when you had to make a difficult decision.",
            "Tell me about a time when you received constructive criticism and how you responded."
        ]
    }
    
    questions = fallback_questions.get(category, fallback_questions["hr"])
    return questions[:count] if count <= len(questions) else questions

# --- Root Endpoint ---
@app.get("/")
async def root():
    """Root endpoint for API health check"""
    return {
        "message": "PrepTalk API is running!",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "question_generation": "/question/generate",
            "user_registration": "/register",
            "user_login": "/login",
            "interview_analysis": "/analyze_interview",
            "user_profile": "/profile"
        }
    }

# --- User Authentication ---
@app.post("/register")
async def register(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(""),
    experience: str = Form(""),
    job_domain: str = Form("")
):
    try:
        # Check if user already exists
        existing_user = users_collection.find_one({"email": email})
        if existing_user:
            return JSONResponse(
                status_code=400, 
                content={"detail": "Email already registered"}
            )
        
        # Create user profile
        user_id = email.split("@")[0] + "_" + str(abs(hash(email)))[:6]
        user_profile = {
            "email": email,
            "username": user_id,  # Add username for compatibility with existing index
            "password": password,  # In production, hash this!
            "full_name": full_name,
            "experience": experience,
            "job_domain": job_domain,
            "created_at": datetime.utcnow(),
            "user_id": user_id
        }
        
        # Insert user
        result = users_collection.insert_one(user_profile)
        
        return JSONResponse(content={
            "success": True,
            "message": "Registration successful",
            "user_id": user_profile["user_id"]
        })
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Registration failed"}
        )

@app.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        # Find user by email
        user = users_collection.find_one({"email": email})
        
        if not user:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid email or password"}
            )
        
        # Check password (in production, use proper hashing!)
        if user.get("password") != password:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid email or password"}
            )
        
        return JSONResponse(content={
            "success": True,
            "message": "Login successful",
            "user_id": user["user_id"],
            "full_name": user.get("full_name", ""),
            "email": user["email"],
            "token": "demo_token_" + user["user_id"]  # In production, use JWT
        })
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Login failed"}
        )

# --- AI Prompt Builder ---
def build_prompt(conversation: str) -> str:
    return f"""
You are an expert AI interview coach. Analyze the following mock interview transcript.

For each question:
- Say if the answer is conceptually correct or not
- Say if the answer sounded confident

Then, at the end:
- Give overall feedback: clarity, grammar, confidence, use of vocabulary
- List strong and weak points
- Suggest improvements like a human coach would

Address the user directly using \"you\" instead of \"the candidate\".
Return the entire output strictly in valid JSON format with these keys:
  questions: [ {{id, conceptual_correctness, confidence, details}} ],
  overall_feedback: string,
  strong_points: [string],
  weak_points: [string],
  suggestions: [string]
Transcript:
{conversation}
"""

# --- Transcription Endpoint ---
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    segments, _ = model.transcribe(audio_bytes)
    transcript = " ".join([seg.text for seg in segments])
    return {"transcript": transcript}

# --- Transcription + Feedback Endpoint ---

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/analyze_interview")
async def analyze_interview(
    audio: UploadFile = File(...),
    user_id: str = Form("demo-user"),
    question: str = Form(""),
    category: str = Form("")
):
    import tempfile, os
    try:
        logger.info(f"Received analyze_interview request: user_id={user_id}, question={question}, category={category}")
        # 1. Transcribe with Whisper
        # Save uploaded audio to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await audio.read()
            logger.info(f"Audio file size: {len(contents)} bytes")
            tmp.write(contents)
            tmp.flush()
            tmp_path = tmp.name
        try:
            segments, _ = model.transcribe(tmp_path)
            logger.info(f"Whisper segments: {segments}")
            transcript = " ".join([seg.text for seg in segments])
        finally:
            os.remove(tmp_path)
        # 2. Analyze with LLM (prompt as in backend_2.py)
        # Simplified prompt for faster analysis
        prompt = f"""You are an interview analysis expert. Analyze the following interview response and return ONLY a valid JSON object with no additional text, markdown, or formatting.

Required JSON structure:
{{
  "scores": {{"fluency": <number 1-10>, "grammar": <number 1-10>, "confidence": <number 1-10>, "overall": <number 1-10>}},
  "analysis": {{"strengths": ["list", "of", "strengths"], "improvements": ["areas", "for", "improvement"], "fillerWords": {{"count": <number>, "words": ["filler", "words"]}}, "sentiment": "positive/neutral/negative", "tone": "professional/casual/nervous"}},
  "tips": ["specific", "actionable", "tips"],
  "question": "{question}",
  "category": "{category}"
}}

Interview Question: {question}
Category: {category}
Transcript: {transcript}

Return ONLY the JSON object with no markdown formatting or additional text:"""
        
        logger.info(f"Simplified prompt sent to LLM")
        
        # Call Groq API instead of Ollama
        try:
            result = await call_groq_llm(prompt, use_smart_model=True)  # Smart model for feedback
            logger.info(f"Groq response received: {result[:200]}...")
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            raise
        logger.info(f"Raw LLM result: {result[:200]}...")
        try:
            # Extract JSON from markdown code blocks if present
            json_str = result
            if "```json" in result:
                # Extract JSON from markdown code block
                start = result.find("```json") + 7
                end = result.find("```", start)
                if end != -1:
                    json_str = result[start:end].strip()
                    logger.info(f"Extracted JSON from markdown: {json_str[:100]}...")
            elif "```" in result:
                # Handle generic code blocks
                start = result.find("```") + 3
                end = result.find("```", start)
                if end != -1:
                    json_str = result[start:end].strip()
                    logger.info(f"Extracted JSON from generic code block: {json_str[:100]}...")
            
            feedback_json = json.loads(json_str)
            # Ensure all required keys are present, fill with defaults if missing
            if not isinstance(feedback_json, dict):
                raise ValueError("LLM did not return a JSON object")
            feedback_json.setdefault("scores", {"fluency": 0, "grammar": 0, "confidence": 0, "overall": 0})
            feedback_json.setdefault("analysis", {"strengths": [], "improvements": [], "fillerWords": {"count": 0, "words": []}, "sentiment": "", "tone": ""})
            feedback_json.setdefault("tips", [])
            feedback_json["question"] = question
            feedback_json["category"] = category
            logger.info(f"Successfully parsed JSON feedback with scores: {feedback_json.get('scores', {})}")
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON: {e}")
            logger.error(f"LLM raw result: {result}")
            feedback_json = {
                "scores": {"fluency": 0, "grammar": 0, "confidence": 0, "overall": 0},
                "analysis": {"strengths": [], "improvements": [], "fillerWords": {"count": 0, "words": []}, "sentiment": "", "tone": ""},
                "tips": [],
                "question": question,
                "category": category,
                "error": "Model did not return valid JSON",
                "raw": result
            }

        # 3. Save session in MongoDB after analysis
        session = {
            "user_id": user_id,
            "date": datetime.utcnow(),
            "category": category,
            "question": question,
            "transcript": transcript,
            "feedback": feedback_json,
        }
        
        # Also save to interview sessions collection for better organization
        # Try to find if there's an ongoing interview session (within last 30 minutes)
        from datetime import timedelta
        recent_cutoff = datetime.utcnow() - timedelta(minutes=30)
        
        # Look for recent interview session
        ongoing_interview = db["interview_sessions"].find_one({
            "user_id": user_id,
            "end_time": {"$exists": False},  # Not ended yet
            "created_at": {"$gte": recent_cutoff}
        })
        
        if ongoing_interview:
            # Add question to existing session
            db["interview_sessions"].update_one(
                {"_id": ongoing_interview["_id"]},
                {
                    "$push": {
                        "questions": {
                            "question": question,
                            "category": category,
                            "transcript": transcript,
                            "feedback": feedback_json,
                            "answered_at": datetime.utcnow()
                        }
                    },
                    "$set": {"last_activity": datetime.utcnow()}
                }
            )
            session_id = str(ongoing_interview["_id"])
        else:
            # Create new interview session
            interview_session = {
                "user_id": user_id,
                "created_at": datetime.utcnow(),
                "last_activity": datetime.utcnow(),
                "questions": [{
                    "question": question,
                    "category": category, 
                    "transcript": transcript,
                    "feedback": feedback_json,
                    "answered_at": datetime.utcnow()
                }],
                "session_type": "practice",
                "status": "active"
            }
            result = db["interview_sessions"].insert_one(interview_session)
            session_id = str(result.inserted_id)
        
        # Keep individual session record for backward compatibility
        session["interview_session_id"] = session_id
        db["sessions"].insert_one(session)
        logger.info(f"Session saved to MongoDB for user {user_id}, interview session: {session_id}")

        return JSONResponse(content={
            "transcript": transcript,
            "feedback": feedback_json
        })
    except Exception as e:
        import traceback
        logger.error(f"Exception in analyze_interview: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- Feedback Endpoint ---
@app.post("/feedback")
async def feedback(conversation: str = Form(...)):
    prompt = build_prompt(conversation)
    try:
        result = await call_groq_llm(prompt)
        feedback_json = json.loads(result)
    except json.JSONDecodeError:
        feedback_json = {"error": "Model did not return valid JSON", "raw": result}
    except Exception as e:
        feedback_json = {"error": f"LLM API error: {str(e)}"}
    return JSONResponse(content=feedback_json)

# --- Dynamic Question Generation Endpoint ---
@app.get("/question/generate")
async def generate_question_endpoint(category: str = "hr", count: int = 1):
    """Generate dynamic questions using AI"""
    try:
        questions = await generate_questions(category, count)
        return {
            "questions": questions,
            "category": category,
            "generated": True,
            "count": len(questions)
        }
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        # Return fallback questions
        fallback_questions = get_fallback_questions(category, count)
        return {
            "questions": fallback_questions,
            "category": category,
            "generated": False,
            "count": len(fallback_questions),
            "error": "Generated questions unavailable, using fallback"
        }

# --- Legacy Question Endpoint (Updated) ---
@app.get("/question")
async def get_question(category: str = "hr", jobDomain: str = "", difficulty: str = "Easy"):
    """Get a single question - now uses dynamic generation with fallback"""
    try:
        questions = await generate_questions(category, 1, jobDomain)
        return {
            "question": questions[0] if questions else "Tell me about yourself.",
            "category": category,
            "jobDomain": jobDomain,
            "difficulty": difficulty,
            "generated": True
        }
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        fallback_questions = get_fallback_questions(category, 1)
        return {
            "question": fallback_questions[0],
            "category": category,
            "jobDomain": jobDomain,
            "difficulty": difficulty,
            "generated": False
        }

# --- Save Interview ---
@app.post("/save_interview")
async def save_interview(
    conversation: str = Form(...),
    feedback: str = Form(...),
    user_id: str = Form(None)
):
    record = {
        "user_id": user_id,
        "conversation": conversation,
        "feedback": json.loads(feedback)
    }
    result = interviews_collection.insert_one(record)
    return {"status": "saved", "interview_id": str(result.inserted_id)}

# --- Recent Interviews ---
@app.get("/recent_interviews")
async def recent_interviews(user_id: str):
    interviews = list(interviews_collection.find({"user_id": user_id}).sort("_id", -1).limit(5))
    for i in interviews:
        i["interview_id"] = str(i["_id"])
        del i["_id"]
    return interviews

# --- Progress Endpoint ---
@app.get("/progress")
async def progress(user_id: str):
    """Alias endpoint for user-progress with query param"""
    return await user_progress(user_id)

# --- User Progress ---
@app.get("/user-progress/{user_id}")
async def user_progress(user_id: str):
    try:
        sessions = list(db["sessions"].find({"user_id": user_id}).sort("date", -1).limit(10))
        for s in sessions:
            s["session_id"] = str(s["_id"])
            del s["_id"]
        return sessions
    except Exception as e:
        logging.error(f"Error fetching user progress: {e}")
        # Return empty progress if database fails
        return []

# --- Profile Management ---
@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Get user profile"""
    try:
        profile = db["profiles"].find_one({"userId": user_id})
        if profile:
            profile["_id"] = str(profile["_id"])
            return profile
        else:
            # Return default profile
            return {
                "userId": user_id,
                "name": "",
                "email": "",
                "phone": "",
                "location": "",
                "jobTitle": "",
                "company": "",
                "experience": "",
                "education": "",
                "skills": [],
                "about": "",
                "targetRole": "",
                "industry": ""
            }
    except Exception as e:
        logging.error(f"Error fetching profile: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch profile"})

@app.post("/profile")
async def save_profile(request: Request):
    """Save user profile"""
    try:
        data = await request.json()
        user_id = data.get("userId", "demo-user")
        
        # Upsert profile (update if exists, insert if not)
        result = db["profiles"].update_one(
            {"userId": user_id},
            {"$set": data},
            upsert=True
        )
        
        return {"status": "success", "message": "Profile saved successfully"}
    except Exception as e:
        logging.error(f"Error saving profile: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to save profile"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
