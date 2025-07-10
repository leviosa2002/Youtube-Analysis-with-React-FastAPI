# backend/app/services/keyword_service.py

import logging
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer # Keep for type hinting the underlying model if needed, but KeyBERT is passed
from typing import List, Dict, Any, Optional
import re
from collections import Counter, defaultdict
import numpy as np

from app.models.video import CommentData # Assuming this path is correct

logger = logging.getLogger(__name__)

class KeywordService:
    """Service for extracting keywords from YouTube content using KeyBERT."""
    
    def __init__(self, kw_model: KeyBERT):
        """Initialize KeywordService with an already loaded KeyBERT model."""
        self.kw_extractor = kw_model # Renamed for clarity: kw_extractor holds the KeyBERT instance
        self._model_loaded = (kw_model is not None)
        if not self._model_loaded:
            logger.warning("KeywordService initialized with a non-loaded KeyBERT model. Keyword extraction will be disabled.")
        else:
            logger.info("KeywordService initialized with KeyBERT extractor.")
    
    def extract_keywords_from_comments(self, comments: List[CommentData], 
                                     top_k_per_comment: int = 3, # New parameter: top N keywords per comment
                                     overall_top_k: int = 20) -> List[Dict[str, Any]]:
        """
        Extracts keywords from a list of comments by processing each comment individually 
        and then aggregating the results. This is generally more scalable for many short texts.
        """
        if not comments:
            return self._empty_keyword_analysis()

        if not self._model_loaded:
            logger.warning("KeywordService: KeyBERT model not loaded, falling back to simple extraction for comments.")
            return self._fallback_keyword_extraction([c.text for c in comments], overall_top_k)
        
        all_extracted_keywords_with_scores = defaultdict(list) # To store scores for averaging
        
        logger.info(f"KeywordService: Starting individual KeyBERT extraction for {len(comments)} comments.")

        for i, comment in enumerate(comments):
            cleaned_text = self._clean_text(comment.text)
            
            if len(cleaned_text.strip()) < 10:
                # logger.debug(f"Comment {i+1} text too short for KeyBERT extraction.")
                continue # Skip very short or empty comments

            try:
                # Extract keywords from EACH comment individually
                # Reduced nr_candidates and removed use_maxsum for performance
                keywords_for_comment = self.kw_extractor.extract_keywords(
                    docs=cleaned_text,
                    keyphrase_ngram_range=(1, 2), # Typically 1 or 2 words for comments
                    stop_words='english',
                    top_n=top_k_per_comment, # Get a few keywords per comment
                    nr_candidates=10 # Reduced for performance
                )
                
                for keyword, score in keywords_for_comment:
                    all_extracted_keywords_with_scores[keyword.lower()].append(score) # Store all scores
            except Exception as e:
                logger.error(f"KeywordService: Error extracting keywords from comment (ID: {comment.id if hasattr(comment, 'id') else 'N/A'}, text: '{comment.text[:50]}...'): {e}", exc_info=True)
                # Continue processing other comments even if one fails
        
        if not all_extracted_keywords_with_scores:
            logger.info("No keywords extracted from comments after processing.")
            return self._empty_keyword_analysis()

        # Aggregate and rank keywords
        compiled_keywords = []
        for keyword, scores in all_extracted_keywords_with_scores.items():
            # Calculate average relevance score
            avg_relevance_score = np.mean(scores)
            
            # Count total occurrences of the keyword across all original comments
            # This is slightly different from `len(scores)` if a comment has the same keyword multiple times
            occurrence_count = sum(
                1 for comment in comments 
                if keyword.lower() in self._clean_text(comment.text).lower()
            )

            compiled_keywords.append({
                'keyword': keyword,
                'relevance_score': round(float(avg_relevance_score), 4),
                'occurrence_count': occurrence_count,
                'type': 'extracted_from_comments',
                'ngram_size': len(keyword.split())
            })
        
        # Sort by occurrence_count (most frequent) then by relevance_score (for ties)
        compiled_keywords.sort(key=lambda x: (x['occurrence_count'], x['relevance_score']), reverse=True)
        
        logger.info(f"KeywordService: Aggregated {len(compiled_keywords)} unique keywords from comments.")
        
        return compiled_keywords[:overall_top_k] # Return only the top overall_top_k

    def extract_keywords_from_text(self, text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Extract keywords from a single text (title, description)"""
        if not text:
            return []
            
        if not self._model_loaded:
            logger.warning("KeywordService: Model not loaded, falling back to simple extraction for single text.")
            return self._fallback_single_text_extraction(text, top_k)
        
        cleaned_text = self._clean_text(text)
        
        if len(cleaned_text.strip()) < 10:
            logger.info("KeywordService: Cleaned text too short for KeyBERT extraction from single text, returning empty.")
            return []
        
        try:
            logger.info(f"KeywordService: Extracting keywords from single text using KeyBERT.")
            # For a single text, use_mmr and diversity are good for variety
            keywords = self.kw_extractor.extract_keywords(
                cleaned_text,
                keyphrase_ngram_range=(1, 2),
                stop_words='english',
                top_n=top_k,
                use_mmr=True, # Good for single document diversity
                diversity=0.7 # Adjust as needed
            )
            logger.info(f"KeywordService: KeyBERT extracted {len(keywords)} keywords from single text.")
            
            return [
                {
                    'keyword': keyword,
                    'relevance_score': round(float(score), 4),
                    'type': 'title_description'
                }
                for keyword, score in keywords
            ]
            
        except Exception as e:
            logger.error(f"KeywordService: KeyBERT single text extraction failed: {e}", exc_info=True)
            return self._fallback_single_text_extraction(text, top_k)
    
    def extract_trending_keywords(self, video_titles: List[str], 
                                  top_k: int = 15) -> List[Dict[str, Any]]:
        """Extract trending keywords from multiple video titles"""
        if not video_titles:
            return []
        
        # Combine all titles for overall trend analysis
        combined_titles = ' '.join([self._clean_text(title) for title in video_titles])
        
        if not self._model_loaded:
            logger.warning("KeywordService: Model not loaded, falling back to simple extraction for trending.")
            return self._fallback_keyword_extraction(video_titles, top_k) # Pass raw titles
        
        if len(combined_titles.strip()) < 10:
            logger.info("KeywordService: Combined titles text too short for KeyBERT trending extraction, returning empty.")
            return []

        try:
            logger.info(f"KeywordService: Extracting trending keywords using KeyBERT from {len(video_titles)} titles.")
            # Use use_maxsum here as we are treating combined titles as one document
            keywords = self.kw_extractor.extract_keywords(
                combined_titles,
                keyphrase_ngram_range=(1, 2),
                stop_words='english',
                top_n=top_k,
                use_maxsum=True # Keep for trending as it's a combined document
            )
            logger.info(f"KeywordService: KeyBERT extracted {len(keywords)} trending keywords.")
            
            # Count occurrences across original titles for 'trend_strength'
            keyword_results = []
            for keyword, score in keywords:
                occurrence_count = sum(
                    1 for title in video_titles 
                    if keyword.lower() in title.lower() # Check against original titles
                )
                
                keyword_results.append({
                    'keyword': keyword,
                    'relevance_score': round(float(score), 4),
                    'occurrence_count': occurrence_count,
                    'trend_strength': self._calculate_trend_strength(
                        occurrence_count, len(video_titles)
                    ),
                    'type': 'trending'
                })
            
            # Sort by occurrence_count then relevance_score
            keyword_results.sort(key=lambda x: (x['occurrence_count'], x['relevance_score']), reverse=True)
            
            return keyword_results
            
        except Exception as e:
            logger.error(f"KeywordService: KeyBERT trending extraction failed: {e}", exc_info=True)
            return self._fallback_keyword_extraction(video_titles, top_k)
    
    def analyze_keyword_sentiment_correlation(self, comments: List[CommentData],
                                              keywords: List[str]) -> Dict[str, Any]:
        """
        Analyze correlation between keywords and comment sentiment.
        Assumes comments already have sentiment scores from SentimentService.
        """
        if not comments or not keywords:
            return {}
        
        keyword_sentiment_compound_scores = defaultdict(list)
        
        for comment in comments:
            comment_text = comment.text.lower()
            
            # Use the actual VADER compound score from the comment if available
            # Assuming comment.sentiment has a 'compound' key from VADER
            sentiment_compound_score = comment.sentiment.get('compound', 0.0) if comment.sentiment else 0.0
            
            # Check which keywords appear in this comment
            for keyword in keywords:
                if keyword.lower() in comment_text:
                    keyword_sentiment_compound_scores[keyword].append(sentiment_compound_score)
        
        results = {}
        for keyword, scores in keyword_sentiment_compound_scores.items():
            if scores:
                results[keyword] = {
                    'avg_sentiment_compound': round(float(np.mean(scores)), 4),
                    'comment_count': len(scores),
                    'sentiment_std_dev': round(float(np.std(scores)), 4) if len(scores) > 1 else 0.0
                }
        
        return results
    
    def _clean_text(self, text: str) -> str:
        """Clean text for keyword extraction"""
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove very short words (typically single letters or 2-letter words like 'is', 'am', 'it')
        words = [word for word in text.split() if len(word) > 2] # Increased minimum length
        
        return ' '.join(words).strip()
    
    def _fallback_keyword_extraction(self, texts: List[str], top_k: int) -> List[Dict[str, Any]]:
        """Fallback keyword extraction using simple frequency analysis"""
        if not texts:
            return []
        
        # Combine all texts and clean
        combined_text = ' '.join([self._clean_text(text) for text in texts])
        words = combined_text.lower().split()
        
        # Remove common stop words (can be extended)
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
            'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
            'our', 'their', 'a', 'an', 'not', 'so', 'very', 'just', 'like', 'what',
            'how', 'when', 'where', 'why', 'who', 'which', 'from', 'about', 'can', 'get',
            'up', 'out', 'don', 't', 's' # Added some common short words/contractions
        }
        
        filtered_words = [word for word in words if word not in stop_words and len(word) > 3] # Increased min word length
        
        # Count word frequencies
        word_counts = Counter(filtered_words)
        
        # Create keyword results
        results = []
        for word, count in word_counts.most_common(top_k):
            results.append({
                'keyword': word,
                'relevance_score': round(float(count / (len(filtered_words) + 1e-9)), 4), # Normalized frequency
                'occurrence_count': count,
                'type': 'frequency_based'
            })
        
        return results
    
    def _fallback_single_text_extraction(self, text: str, top_k: int) -> List[Dict[str, Any]]:
        """Fallback for single text keyword extraction"""
        return self._fallback_keyword_extraction([text], top_k)
    
    def _calculate_trend_strength(self, occurrence_count: int, total_videos: int) -> str:
        """Calculate trend strength based on occurrence frequency"""
        if total_videos == 0:
            return 'N/A'
        ratio = occurrence_count / total_videos
        
        if ratio >= 0.3:
            return 'Very Strong'
        elif ratio >= 0.2:
            return 'Strong'
        elif ratio >= 0.1:
            return 'Moderate'
        elif ratio >= 0.05:
            return 'Weak'
        else:
            return 'Very Weak'

    def _empty_keyword_analysis(self) -> List[Dict[str, Any]]:
        """Return an empty structure for keyword analysis."""
        return [] # Return an empty list, consistent with other methods' return type