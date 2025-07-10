# backend/app/dependencies.py

# Standard library imports
from typing import Optional, Dict, Any
import logging

# Third-party library imports
from googleapiclient.discovery import build # For YouTube API
from youtube_transcript_api import YouTubeTranscriptApi # For YouTube transcripts

# Import Hugging Face Transformers components (for toxicity model)
try:
    from transformers import pipeline, Pipeline # Keep Pipeline for type hinting the toxicity model
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning("Hugging Face Transformers not available. Toxicity detection and other NLP features might be disabled.")

# Import Sentence Transformers (for KeyBERT)
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logging.warning("Sentence Transformers not available. Keyword extraction might be disabled.")

# Import KeyBERT (needed here to instantiate the KeyBERT object)
try:
    from keybert import KeyBERT # <--- ADD THIS IMPORT
    KEYBERT_LIBRARY_AVAILABLE = True # New flag to indicate KeyBERT itself is importable
except ImportError:
    KEYBERT_LIBRARY_AVAILABLE = False
    logging.warning("KeyBERT library not available. Keyword extraction will be disabled.")


# Import VADER Sentiment Analyzer
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False
    logging.warning("VADER Sentiment Analysis library not available. Sentiment analysis will be disabled.")


# Local application imports
from app.config import settings # Ensure this is correctly imported
from app.services.youtube_service import YouTubeService
from app.services.sentiment_service import SentimentService
from app.services.toxicity_service import ToxicityService
from app.services.keyword_service import KeywordService

# For FastAPI's HTTPException
from fastapi import HTTPException 

logger = logging.getLogger(__name__)

# Global variables to hold initialized models/services
_youtube_service: Optional[YouTubeService] = None
# Change type hint to SentimentIntensityAnalyzer for clarity, as per your service
_sentiment_analyzer: Optional[SentimentIntensityAnalyzer] = None 
_toxicity_model: Optional[Pipeline] = None # This will hold the toxicity pipeline (Hugging Face)
_keyword_model: Optional[KeyBERT] = None # <--- THIS IS THE CORRECT TYPE HINT

async def load_nlp_models():
    """
    Loads all necessary NLP models and initializes services during application startup.
    """
    global _youtube_service, _sentiment_analyzer, _toxicity_model, _keyword_model
    logger.info("Loading NLP models and initializing services...")
    logger.info("Starting NLP model and service loading...")

    # --- YouTubeService Initialization ---
    try:
        logger.info("Initializing YouTube API client...")
        youtube_api_client = build(
            serviceName=settings.YOUTUBE_API_SERVICE_NAME,
            version=settings.YOUTUBE_API_VERSION,
            developerKey=settings.YOUTUBE_API_KEY
        )
        _youtube_service = YouTubeService(youtube_api_client, YouTubeTranscriptApi)
        logger.info("✅ YouTube API client initialized successfully in load_nlp_models.")
    except Exception as e:
        logger.critical(f"❌ CRITICAL ERROR: Failed to initialize YouTubeService during startup: {e}", exc_info=True)
        _youtube_service = None

    # --- Sentiment Analysis Model Initialization (VADER) ---
    logger.info("Initializing VADER sentiment analyzer...")
    if VADER_AVAILABLE: # Use the new VADER_AVAILABLE flag
        try:
            # Instantiate VADER's SentimentIntensityAnalyzer directly
            _sentiment_analyzer = SentimentIntensityAnalyzer() 
            logger.info("✅ VADER SentimentIntensityAnalyzer loaded.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize VADER sentiment analyzer: {e}", exc_info=True)
            _sentiment_analyzer = None
    else:
        logger.warning("Sentiment analysis skipped: VADER library not available.")

    # --- Toxicity Detection Model Initialization (Hugging Face) ---
    logger.info("Loading toxicity detection model...")
    if TRANSFORMERS_AVAILABLE:
        try:
            _toxicity_model = pipeline(
                "text-classification",
                model="unitary/toxic-bert",
                device=-1,  # Use CPU
                truncation=True,
                max_length=512
            )
            logger.info("✅ Toxicity detection model loaded.")
        except Exception as e:
            logger.error(f"❌ Failed to load toxicity model: {e}", exc_info=True)
            _toxicity_model = None
    else:
        logger.warning("Toxicity detection skipped: Hugging Face Transformers not available.")

    # --- Keyword Extraction Model (KeyBERT) Initialization ---
    logger.info("Loading KeyBERT model...")
    # Check both Sentence Transformers and KeyBERT library availability
    if SENTENCE_TRANSFORMERS_AVAILABLE and KEYBERT_LIBRARY_AVAILABLE: # <--- CORRECTED CONDITION
        try:
            # Step 1: Load the SentenceTransformer model
            sentence_transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer model loaded for KeyBERT.")
            
            # Step 2: Initialize KeyBERT with the loaded SentenceTransformer model
            _keyword_model = KeyBERT(sentence_transformer_model) # <--- CRUCIAL FIX HERE
            logger.info("✅ KeyBERT model initialized successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to load or initialize KeyBERT model: {e}", exc_info=True)
            _keyword_model = None
    else:
        logger.warning("KeyBERT model skipped: Sentence Transformers or KeyBERT library not available.")

    logger.info("All NLP models and services loaded successfully (or noted issues).")


# --- Dependency Injectors ---

def get_youtube_service() -> YouTubeService:
    """Provides the YouTubeService instance."""
    if _youtube_service is None:
        logger.error("YouTubeService not initialized. Startup failed or service accessed too early.")
        raise HTTPException(status_code=503, detail="YouTube service not available.")
    return _youtube_service

def get_sentiment_service() -> SentimentService:
    """Provides the SentimentService instance with the VADER analyzer."""
    if _sentiment_analyzer is None:
        logger.error("Sentiment analyzer not initialized. Startup failed or service accessed too early.")
        raise HTTPException(status_code=503, detail="Sentiment analysis service not available.")
    # Pass the correctly initialized VADER analyzer
    return SentimentService(sentiment_analyzer=_sentiment_analyzer)

def get_toxicity_service() -> ToxicityService:
    """Provides the ToxicityService instance with the Hugging Face pipeline."""
    if _toxicity_model is None:
        logger.error("Toxicity model not initialized. Startup failed or service accessed too early.")
        raise HTTPException(status_code=503, detail="Toxicity detection service not available.")
    # Pass the correctly initialized Hugging Face pipeline
    return ToxicityService(toxicity_model=_toxicity_model)

def get_keyword_service() -> KeywordService:
    """Provides the KeywordService instance with the KeyBERT model."""
    if _keyword_model is None:
        logger.error("Keyword model not initialized. Startup failed or service accessed too early.")
        raise HTTPException(status_code=503, detail="Keyword extraction service not available.")
    # Pass the correctly initialized KeyBERT model (which is now guaranteed to be a KeyBERT object)
    return KeywordService(kw_model=_keyword_model)