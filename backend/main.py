ASSEMBLYAI_API_KEY = "d0f46f6ac32f4caf8a318ae748b15992"

async def transcribe_with_assemblyai(audio_bytes: bytes) -> str:
    """Send audio to AssemblyAI and return transcript text."""
    import httpx
    upload_url = "https://api.assemblyai.com/v2/upload"
    transcript_url = "https://api.assemblyai.com/v2/transcript"
    headers = {"authorization": ASSEMBLYAI_API_KEY}

    # 1. Upload audio file
    async with httpx.AsyncClient() as client:
        upload_response = await client.post(upload_url, headers=headers, content=audio_bytes)
        upload_response.raise_for_status()
        audio_url = upload_response.json()["upload_url"]

        # 2. Request transcription
        transcript_response = await client.post(transcript_url, headers=headers, json={"audio_url": audio_url})
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json()["id"]

        # 3. Poll for completion
        while True:
            poll_response = await client.get(f"{transcript_url}/{transcript_id}", headers=headers)
            poll_response.raise_for_status()
            status = poll_response.json()["status"]
            if status == "completed":
                return poll_response.json()["text"]
            elif status == "failed":
                raise Exception("AssemblyAI transcription failed")
            import asyncio
            await asyncio.sleep(2)
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests, json, uuid, os
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
async def generate_questions(category: str, count: int = 1, job_domain: str = "") -> list:
    """Generate dynamic interview questions using Groq"""
    
    # Create diverse technical subcategories
    if category == "technical":
        technical_areas = [
            "algorithms and data structures",
            "system design and architecture", 
            "database design and optimization",
            "programming fundamentals and best practices",
            "software development lifecycle and methodologies",
            "debugging and problem-solving scenarios",
            "code review and optimization",
            "technology-specific implementation details"
        ]
        
        # Select different areas for variety
        import random
        selected_areas = random.sample(technical_areas, min(count, len(technical_areas)))
        
        if job_domain and "data" in job_domain.lower():
            domain_areas = [
                "data preprocessing and cleaning techniques",
                "machine learning algorithms and model selection", 
                "statistical analysis and hypothesis testing",
                "data visualization and storytelling",
                "big data processing and distributed systems",
                "feature engineering and selection",
                "model deployment and monitoring",
                "data pipeline architecture"
            ]
            selected_areas = random.sample(domain_areas, min(count, len(domain_areas)))
        
        category_desc = f"technical questions covering: {', '.join(selected_areas)}"
        
    elif category == "hr":
        category_desc = "human resources/behavioral questions about work experience, career goals, company culture, motivation"
    elif category == "behavioral":
        category_desc = "behavioral questions about past experiences, teamwork, problem-solving, leadership, conflict resolution"
    else:
        category_desc = f"{category} questions"
    
    prompt = f"""Generate exactly {count} diverse interview questions covering {category_desc}. 

IMPORTANT: Each question should be distinctly different and cover different aspects/topics. Avoid repetitive or similar questions.

Only ask questions that can be answered orally. Do not ask for code to be written. If you want to ask a coding round question, ask the candidate to describe their approach or thought process, not to write code.

Return ONLY a JSON array of question strings: ["question1", "question2", ...]

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

If the user asks about any company, provide job-related information about that company: a brief overview, current open job roles, and requirements for each role. Focus on interview preparation, job search, and career advice, not general tech news or product launches.

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
    transcript = await transcribe_with_assemblyai(audio_bytes)
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
        # Save uploaded audio to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await audio.read()
            logger.info(f"Audio file size: {len(contents)} bytes")
            tmp.write(contents)
            tmp.flush()
            tmp_path = tmp.name
        try:
            transcript = await transcribe_with_assemblyai(contents)
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
            "session_group_id": None,  # Will be set when session is completed
        }
        result = db["sessions"].insert_one(session)
        session_id = str(result.inserted_id)
        logger.info(f"Session saved to MongoDB for user {user_id}")

        return JSONResponse(content={
            "transcript": transcript,
            "feedback": feedback_json,
            "session_id": session_id
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
        # Get all sessions for the user, sorted by date (newest first)
        sessions = list(db["sessions"].find({"user_id": user_id}).sort("date", -1))
        
        # Process sessions
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

# --- Session Group Management ---
@app.post("/complete_session")
async def complete_session(
    user_id: str = Form(...),
    session_ids: str = Form(...),  # Comma-separated session IDs
    session_name: str = Form(""),
):
    """Mark a group of individual sessions as a complete interview session"""
    try:
        session_id_list = [sid.strip() for sid in session_ids.split(",") if sid.strip()]
        
        if not session_id_list:
            return JSONResponse(status_code=400, content={"error": "No session IDs provided"})
        
        # Generate session group ID and name
        existing_groups = list(db["session_groups"].find({}).sort("created_at", -1))
        session_number = len(existing_groups) + 1
        
        if not session_name:
            session_name = f"Session {session_number}"
        
        # Create session group
        session_group = {
            "user_id": user_id,
            "session_name": session_name,
            "session_ids": session_id_list,
            "created_at": datetime.utcnow(),
            "question_count": len(session_id_list),
            "is_completed": True
        }
        
        group_result = db["session_groups"].insert_one(session_group)
        session_group_id = str(group_result.inserted_id)
        
        # Update individual sessions with group ID
        from bson.objectid import ObjectId
        for session_id in session_id_list:
            try:
                db["sessions"].update_one(
                    {"_id": ObjectId(session_id)},
                    {"$set": {"session_group_id": session_group_id}}
                )
            except Exception as e:
                logger.warning(f"Failed to update session {session_id}: {e}")
        
        logger.info(f"Session group created: {session_group_id} with {len(session_id_list)} questions")
        
        return JSONResponse(content={
            "status": "success",
            "session_group_id": session_group_id,
            "session_name": session_name,
            "question_count": len(session_id_list)
        })
        
    except Exception as e:
        logger.error(f"Error completing session: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to complete session"})

@app.get("/session_groups")
async def get_session_groups(user_id: str):
    """Get all session groups for a user"""
    try:
        groups = list(db["session_groups"].find({"user_id": user_id}).sort("created_at", -1))
        
        for group in groups:
            group["session_group_id"] = str(group["_id"])
            del group["_id"]
            
            # Add summary statistics
            if group.get("session_ids"):
                # Get all sessions in this group
                session_objects = []
                for session_id in group["session_ids"]:
                    try:
                        from bson.objectid import ObjectId
                        session = db["sessions"].find_one({"_id": ObjectId(session_id)})
                        if session:
                            session_objects.append(session)
                    except:
                        continue
                
                # Calculate averages
                if session_objects:
                    total_scores = {"fluency": 0, "grammar": 0, "confidence": 0, "overall": 0}
                    valid_sessions = 0
                    
                    for session in session_objects:
                        if session.get("feedback") and session["feedback"].get("scores"):
                            scores = session["feedback"]["scores"]
                            total_scores["fluency"] += scores.get("fluency", 0)
                            total_scores["grammar"] += scores.get("grammar", 0) 
                            total_scores["confidence"] += scores.get("confidence", 0)
                            total_scores["overall"] += scores.get("overall", 0)
                            valid_sessions += 1
                    
                    if valid_sessions > 0:
                        group["average_scores"] = {
                            "fluency": round(total_scores["fluency"] / valid_sessions, 2),
                            "grammar": round(total_scores["grammar"] / valid_sessions, 2),
                            "confidence": round(total_scores["confidence"] / valid_sessions, 2),
                            "overall": round(total_scores["overall"] / valid_sessions, 2)
                        }
                    else:
                        group["average_scores"] = {"fluency": 0, "grammar": 0, "confidence": 0, "overall": 0}
                else:
                    group["average_scores"] = {"fluency": 0, "grammar": 0, "confidence": 0, "overall": 0}
        
        return groups
    except Exception as e:
        logger.error(f"Error fetching session groups: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch session groups"})

@app.get("/session_group/{session_group_id}")
async def get_session_group_details(session_group_id: str):
    """Get detailed view of a specific session group"""
    try:
        from bson.objectid import ObjectId
        group = db["session_groups"].find_one({"_id": ObjectId(session_group_id)})
        
        if not group:
            return JSONResponse(status_code=404, content={"error": "Session group not found"})
        
        group["session_group_id"] = str(group["_id"])
        del group["_id"]
        
        # Get all sessions in this group with full details
        sessions = []
        for session_id in group.get("session_ids", []):
            try:
                session = db["sessions"].find_one({"_id": ObjectId(session_id)})
                if session:
                    session["session_id"] = str(session["_id"])
                    del session["_id"]
                    sessions.append(session)
            except Exception as e:
                logger.warning(f"Failed to fetch session {session_id}: {e}")
        
        group["sessions"] = sessions
        return group
    except Exception as e:
        logger.error(f"Error fetching session group details: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch session group details"})

@app.put("/session_group/{session_group_id}/name")
async def update_session_name(session_group_id: str, request: Request):
    """Update session group name"""
    try:
        data = await request.json()
        new_name = data.get("session_name", "").strip()
        
        if not new_name:
            return JSONResponse(status_code=400, content={"error": "Session name is required"})
        
        from bson.objectid import ObjectId
        result = db["session_groups"].update_one(
            {"_id": ObjectId(session_group_id)},
            {"$set": {"session_name": new_name}}
        )
        
        if result.modified_count > 0:
            return JSONResponse(content={"status": "success", "session_name": new_name})
        else:
            return JSONResponse(status_code=404, content={"error": "Session group not found"})
    except Exception as e:
        logger.error(f"Error updating session name: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to update session name"})

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
