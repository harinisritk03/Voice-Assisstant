import os
import uuid
import jwt
import bcrypt
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import google.generativeai as genai

# --- CONFIG ---
SARVAM_API_KEY = "sk_0sh3uktc_DuaJM7pVofekZzL1IV8pBAza"
GEMINI_API_KEY = "AIzaSyAYUixDZzxiMEhf9AsLEz1NaxkfnbGaHbE"
MONGO_URL = "mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/?appName=Cluster0"
SECRET_KEY = "bumblebee_secret_key"
ALGORITHM = "HS256"

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

# FIXED CORS - Allow all origins and credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

client = AsyncIOMotorClient(MONGO_URL)
db = client.cooking_app
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- PROMPTS ---
BASE_RULES = (
    "1. Respond ONLY in the language used by the user (English or Tamil). "
    "2. ALWAYS ask how many people they are making this for before providing any quantities. "
    "3. Provide response ONE BY ONE. Do not give the full list at once. "
    "4. After every step, ask if they need any clarification. "
    "5. Use plain text only (No markdown, no asterisks). "
)

CHEF_PROMPT = f"{BASE_RULES} You are Bumblebee Chef. Guide them through cooking. Do not answer non-cooking questions."
GROCERY_PROMPT = f"""
{BASE_RULES}
You are Bumblebee Grocery Assistant.

RULES (MANDATORY):
- Ask ONLY ONCE for number of people (if not provided)
- After count is given, return the FULL grocery list in ONE message
- Do NOT confirm items one by one
- Do NOT ask “any clarification?”
- Every item MUST include quantity + unit
- Group items by category
- No cooking steps, no explanations
"""
DIET_PROMPT = f"{BASE_RULES} You are Bumblebee Nutritionist. Help with health goals. Do not provide grocery store locations."

# --- SARVAM ---
class SarvamClient:
    def __init__(self, api_key):
        self.headers = {"api-subscription-key": api_key}
    
    def stt(self, file_bytes):
        try:
            res = requests.post("https://api.sarvam.ai/speech-to-text", 
                                 headers=self.headers, 
                                 files={"file": ("audio.wav", file_bytes, "audio/wav")},
                                 data={"language_code": "unknown", "model": "saarika:v2.5"})
            return res.json()
        except Exception as e:
            print(f"STT Error: {e}")
            return {}

    def tts(self, text):
        try:
            target_lang = "ta-IN" if any('\u0b80' <= c <= '\u0bff' for c in text) else "en-IN"
            payload = {"inputs": [text.replace("*", "")], "target_language_code": target_lang, "speaker": "anushka", "model": "bulbul:v2"}
            res = requests.post("https://api.sarvam.ai/text-to-speech", headers=self.headers, json=payload)
            return res.json().get("audios", [""])[0]
        except Exception as e:
            print(f"TTS Error: {e}")
            return ""

sarvam = SarvamClient(SARVAM_API_KEY)

# --- AUTH ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/")
async def root():
    return {"status": "Bumblebee API is running"}

@app.post("/register")
async def register(user: dict):
    try:
        # Check if user already exists
        existing = await db.users.find_one({"username": user['username']})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        hashed = bcrypt.hashpw(user['password'].encode(), bcrypt.gensalt())
        await db.users.insert_one({
            "username": user['username'], 
            "password": hashed, 
            "preferences": ["Spicy", "Healthy", "Vegetarian"]
        })
        return {"msg": "User created"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Register Error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/login")
async def login(user: dict):
    try:
        db_user = await db.users.find_one({"username": user['username']})
        if db_user and bcrypt.checkpw(user['password'].encode(), db_user["password"]):
            token = jwt.encode({
                "sub": user['username'], 
                "exp": datetime.utcnow() + timedelta(days=7)
            }, SECRET_KEY, algorithm=ALGORITHM)
            return {"access_token": token, "token_type": "bearer"}
        raise HTTPException(status_code=400, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/profile")
async def get_profile(user: str = Depends(get_current_user)):
    try:
        db_user = await db.users.find_one({"username": user})
        return {
            "username": user, 
            "preferences": db_user.get("preferences", ["Spicy", "Healthy", "Vegetarian"]), 
            "recommended": [
                {"name": "Paneer Tikka Masala", "type": "Spicy"},
                {"name": "Grilled Chicken Salad", "type": "Healthy"},
                {"name": "Vegetable Stir Fry", "type": "Vegetarian"},
                {"name": "Butter Chicken", "type": "Spicy"},
                {"name": "Quinoa Buddha Bowl", "type": "Healthy"}
            ]
        }
    except Exception as e:
        print(f"Profile Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

# --- CHAT LOGIC ---
@app.get("/ai/history/{mode}/{session_id}")
async def get_history(mode: str, session_id: str, user: str = Depends(get_current_user)):
    try:
        # Returns history for specific agent and session
        cursor = db.chats.find({
            "user": user, 
            "mode": mode, 
            "session_id": session_id
        }).sort("ts", 1)
        
        history = await cursor.to_list(length=200)
        
        result = []
        for h in history:
            result.append({"role": "user", "text": h["user_msg"]})
            result.append({"role": "bot", "text": h["ai_msg"]})
        
        return result
    except Exception as e:
        print(f"History Error: {e}")
        return []

@app.post("/ai/chat")
async def ai_chat(
    text: str = Form(None), 
    file: UploadFile = File(None), 
    mode: str = Form("chef"), 
    session_id: str = Form(...), 
    user: str = Depends(get_current_user)
):
    try:
        input_text = text
        is_audio = False
        
        if file:
            audio_data = await file.read()
            stt_res = sarvam.stt(audio_data)
            input_text = stt_res.get("transcript", "")
            is_audio = True

        if not input_text: 
            return {"response": "Please say something!", "transcript": "", "audio": ""}

        # Fetch Memory for this specific mode and session
        history_cursor = db.chats.find({
            "user": user, 
            "mode": mode, 
            "session_id": session_id
        }).sort("ts", -1).limit(10)
        
        history_objs = await history_cursor.to_list(length=10)
        formatted_history = []
        
        for h in reversed(history_objs):
            formatted_history.append({"role": "user", "parts": [h["user_msg"]]})
            formatted_history.append({"role": "model", "parts": [h["ai_msg"]]})

        prompt_map = {
            "chef": CHEF_PROMPT, 
            "grocery": GROCERY_PROMPT, 
            "diet": DIET_PROMPT
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", 
            system_instruction=prompt_map.get(mode, CHEF_PROMPT)
        )
        
        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(input_text)
        
        # Save to database
        await db.chats.insert_one({
            "user": user, 
            "mode": mode, 
            "session_id": session_id, 
            "user_msg": input_text, 
            "ai_msg": response.text, 
            "ts": datetime.utcnow()
        })

        return {
            "transcript": input_text, 
            "response": response.text, 
            "audio": sarvam.tts(response.text) if is_audio else ""
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.post("/recipes/like/{recipe_id}")
async def like_recipe(recipe_id: str, user: str = Depends(get_current_user)):
    try:
        recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
            
        liked_by = recipe.get("liked_by", [])
        
        if user in liked_by:
            await db.recipes.update_one(
                {"_id": ObjectId(recipe_id)}, 
                {"$pull": {"liked_by": user}, "$inc": {"likes": -1}}
            )
        else:
            await db.recipes.update_one(
                {"_id": ObjectId(recipe_id)}, 
                {"$addToSet": {"liked_by": user}, "$inc": {"likes": 1}}
            )
        return {"status": "ok"}
    except Exception as e:
        print(f"Like Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to like recipe")

@app.get("/recipes")
async def get_recipes():
    try:
        cursor = db.recipes.find().sort("created_at", -1)
        recipes = await cursor.to_list(length=50)
        for r in recipes: 
            r["_id"] = str(r["_id"])
        return recipes
    except Exception as e:
        print(f"Get Recipes Error: {e}")
        return []

@app.post("/recipes")
async def post_recipe(
    title: str = Form(...), 
    content: str = Form(...), 
    user: str = Depends(get_current_user)
):
    try:
        await db.recipes.insert_one({
            "author": user, 
            "title": title, 
            "content": content, 
            "likes": 0, 
            "liked_by": [], 
            "created_at": datetime.utcnow()
        })
        return {"msg": "Recipe posted successfully"}
    except Exception as e:
        print(f"Post Recipe Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to post recipe")

if __name__ == "__main__":
    import uvicorn
    print("Starting Bumblebee API Server...")
    print("📍 Server will run at: http://localhost:8000")
    print("📚 API Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)