from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")


# Main conversational model
llm = ChatGroq(
    temperature=0.7,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=GROQ_API_KEY
)


# More precise reasoning model
llm_precise = ChatGroq(
    temperature=0.2,
    model_name="llama-3.1-8b-instant",
    groq_api_key=GROQ_API_KEY
)