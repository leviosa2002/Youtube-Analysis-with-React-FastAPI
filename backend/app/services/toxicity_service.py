"""
Toxicity detection service for YouTube comments using transformers
"""
from typing import List, Dict, Any, Optional
import re
from collections import Counter
import numpy as np
import logging

try:
    from transformers import Pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.getLogger(__name__).warning("Warning: transformers library not available. Using fallback toxicity detection.")

from app.models.video import CommentData # Assuming this path is correct

logger = logging.getLogger(__name__)

class ToxicityService:
    """Service for detecting toxic comments using transformer models"""
    
    # --- GLOBAL CONSTANTS FOR THRESHOLDS (Easier to manage and adjust) ---
    # This threshold determines when a transformer-predicted score is considered "toxic"
    # A value of 0.4 means a comment needs to be at least 40% confident in its toxicity to be flagged.
    # ADJUST THIS VALUE CAREFULLY AFTER TESTING WITH YOUR SPECIFIC TRANSFORMER MODEL.
    TRANSFORMER_TOXICITY_THRESHOLD = 0.6
    
    # This threshold is for the rule-based fallback.
    # Since it's simpler, it might need a higher threshold to avoid false positives.
    RULE_BASED_TOXICITY_THRESHOLD = 0.65 # Kept this as it was reasonably high already
    # --- END GLOBAL CONSTANTS ---

    def __init__(self, toxicity_model: Pipeline):
        self.toxicity_classifier = toxicity_model
        self._model_loaded = (self.toxicity_classifier is not None)
        
        logger.info("ToxicityService initialized with provided toxicity model.")
        logger.info(f"TRANSFORMERS_AVAILABLE: {TRANSFORMERS_AVAILABLE}")
        logger.info(f"Toxicity classifier object loaded successfully: {self._model_loaded}")
        logger.info(f"Using TRANSFORMER_TOXICITY_THRESHOLD: {self.TRANSFORMER_TOXICITY_THRESHOLD}")
        logger.info(f"Using RULE_BASED_TOXICITY_THRESHOLD: {self.RULE_BASED_TOXICITY_THRESHOLD}")

    def analyze_comment_toxicity(self, comments: List[CommentData]) -> Dict[str, Any]:
        """
        Analyze toxicity across all comments, using batch processing for transformer model
        or individual fallback if model is not loaded/fails.
        """
        if not comments:
            return self._empty_toxicity_analysis()
        
        comment_texts = [comment.text for comment in comments]
        processed_results = []

        if self._model_loaded and TRANSFORMERS_AVAILABLE:
            logger.info(f"Processing {len(comments)} comments in a batch using transformer model.")
            try:
                batch_raw_results = self.toxicity_classifier(comment_texts)
                # --- IMPORTANT DEBUGGING POINT ---
                # Temporarily uncomment the line below and set logger level to DEBUG
                # to see the raw scores and labels from your transformer model.
                # This is CRITICAL for fine-tuning TRANSFORMER_TOXICITY_THRESHOLD.
                # logger.debug(f"Batch processing raw results (first 3): {batch_raw_results[:3]}")
                # --- END DEBUGGING POINT ---
                
                for i, raw_result in enumerate(batch_raw_results):
                    is_toxic = False
                    toxicity_score = 0.0
                    detection_method = 'transformer'
                    toxicity_type = None

                    # Handle cases where raw_result might be a list of dicts (e.g., zero-shot classification)
                    if isinstance(raw_result, list) and len(raw_result) > 0:
                        # Try to find 'TOXIC' or similar labels explicitly
                        toxic_entry = next((item for item in raw_result if item['label'].upper() in ['TOXIC', 'TOXICITY', '1']), None)
                        if toxic_entry:
                            # If 'TOXIC' is found, use its score
                            raw_result = toxic_entry
                        else:
                            # If no explicit 'TOXIC' label, take the first result
                            # and infer toxicity if it's 'NON_TOXIC'
                            raw_result = raw_result[0]

                    if 'label' in raw_result and 'score' in raw_result:
                        predicted_label = raw_result['label'].upper()
                        predicted_score = raw_result['score']

                        if predicted_label in ['TOXIC', 'TOXICITY', '1']:
                            toxicity_score = predicted_score
                        else: 
                            # If the model predicts a non-toxic label (e.g., 'NON_TOXIC', 'NEUTRAL')
                            # Infer toxicity score as (1 - non-toxic confidence)
                            toxicity_score = 1 - predicted_score 
                        
                        # --- KEY CHANGE: Use the new TRANSFORMER_TOXICITY_THRESHOLD ---
                        is_toxic = toxicity_score > self.TRANSFORMER_TOXICITY_THRESHOLD 

                        toxicity_type = self._classify_toxicity_type(comment_texts[i]) if is_toxic else None
                    else:
                        logger.warning(f"Batch result for comment {i} missing 'label' or 'score'. Falling back to rule-based.")
                        fallback_res = self._fallback_detection(comment_texts[i])
                        is_toxic = fallback_res['is_toxic']
                        toxicity_score = fallback_res['toxicity_score']
                        toxicity_type = fallback_res['toxicity_type']
                        detection_method = 'rule_based_fallback_from_batch_parse'
                    
                    processed_results.append({
                        'is_toxic': is_toxic,
                        'toxicity_score': round(float(toxicity_score), 4),
                        'toxicity_type': toxicity_type,
                        'detection_method': detection_method
                    })
                
            except Exception as e:
                logger.error(f"Batch transformer detection failed: {e}. Falling back to individual rule-based for all comments.", exc_info=True)
                processed_results = [self._fallback_detection(text) for text in comment_texts]
        else:
            logger.warning(f"Model not loaded or transformers not available. Processing {len(comments)} comments individually using rule-based detection.")
            processed_results = [self._fallback_detection(text) for text in comment_texts]

        toxic_comments = []
        all_toxicity_scores = []
        
        for i, comment in enumerate(comments):
            result = processed_results[i]
            all_toxicity_scores.append(result['toxicity_score'])
            
            if result['is_toxic']:
                toxic_comments.append({
                    'comment_id': comment.id,
                    'text': comment.text[:100] + '...' if len(comment.text) > 100 else comment.text,
                    'author': comment.author,
                    'toxicity_score': result['toxicity_score'],
                    'toxicity_type': result['toxicity_type'],
                    'like_count': comment.like_count,
                    'published_at': comment.published_at.isoformat()
                })
        
        return self._compile_toxicity_analysis(toxic_comments, all_toxicity_scores, len(comments))

    def detect_toxicity(self, text: str) -> Dict[str, Any]:
        """Detect toxicity in a single comment (used primarily for internal fallbacks now)."""
        cleaned_text = self._clean_text(text)
        
        if self._model_loaded and TRANSFORMERS_AVAILABLE:
            logger.debug(f"Attempting single transformer detection for: '{cleaned_text[:50]}...'")
            return self._transformer_detection(cleaned_text)
        else:
            logger.warning(f"Falling back to rule-based detection for: '{cleaned_text[:50]}...' (Model not loaded/available)")
            return self._fallback_detection(cleaned_text)
    
    def _transformer_detection(self, text: str) -> Dict[str, Any]:
        """
        Use transformer model for toxicity detection (now primarily called for fallbacks from batching,
        or if you have other single-comment analysis needs).
        """
        try:
            result = self.toxicity_classifier(text) 
            
            # --- IMPORTANT DEBUGGING POINT ---
            # Temporarily uncomment this to see raw results for single transformer calls.
            # logger.debug(f"Single transformer raw result for '{text[:50]}...': {result}")
            # --- END DEBUGGING POINT ---
            
            if isinstance(result, list) and len(result) > 0:
                toxic_entry = next((item for item in result if item['label'].upper() in ['TOXIC', 'TOXICITY', '1']), None)
                if toxic_entry:
                    result = toxic_entry
                else:
                    result = result[0]
            
            if 'label' in result and 'score' in result:
                predicted_label = result['label'].upper()
                predicted_score = result['score']

                if predicted_label in ['TOXIC', 'TOXICITY', '1']:
                    toxicity_score = predicted_score
                else:
                    toxicity_score = 1 - predicted_score
                
                # --- KEY CHANGE: Use the global transformer threshold ---
                is_toxic = toxicity_score > self.TRANSFORMER_TOXICITY_THRESHOLD
            else:
                logger.warning(f"Single transformer output missing 'label' or 'score' for: '{text[:50]}...'. Falling back.")
                return self._fallback_detection(text)
            
            toxicity_type = self._classify_toxicity_type(text) if is_toxic else None
            
            return {
                'is_toxic': is_toxic,
                'toxicity_score': round(float(toxicity_score), 4),
                'toxicity_type': toxicity_type,
                'detection_method': 'transformer_single'
            }
            
        except Exception as e:
            logger.error(f"Single transformer toxicity detection failed for '{text[:50]}...': {e}", exc_info=True)
            return self._fallback_detection(text)
    
    def _fallback_detection(self, text: str) -> Dict[str, Any]:
        """Rule-based fallback toxicity detection"""
        text_lower = text.lower()
        
        toxic_keywords = {
            'hate_speech': ['hate', 'nazi', 'racist', 'homophobic', 'sexist', 'bigot', 'supremacy'],
            'harassment': ['kill yourself', 'kys', 'die', 'loser', 'pathetic', 'worthless', 'ugly', 'stupid', 'idiot', 'dumb', 'clown'],
            'profanity': ['damn', 'hell', 'crap', 'ass', 'bitch', 'fuck', 'shit', 'piss', 'cunt', 'wanker'],
            'threats': ['threat', 'hurt', 'violence', 'attack', 'destroy', 'bomb', 'shoot', 'murder', 'harm'],
            'spam': ['subscribe', 'follow', 'check out', 'visit my', 'free money', 'giveaway', 'link in bio']
        }
        
        toxicity_score = 0
        toxicity_types = []
        
        for category, keywords in toxic_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    # Adjusted weights remain the same as your previous version, which is good.
                    if category == 'profanity':
                        toxicity_score += 0.05
                    elif category == 'harassment':
                        toxicity_score += 0.15
                    elif category in ['hate_speech', 'threats']:
                        toxicity_score += 0.3
                    elif category == 'spam':
                        toxicity_score += 0.01
                    
                    if category not in toxicity_types:
                        toxicity_types.append(category)
        
        # Check for excessive capitalization (SHOUTING)
        if len(text) > 10 and sum(1 for c in text if c.isupper()) / len(text) > 0.7 and not text.isupper():
            toxicity_score += 0.05
            if 'aggressive' not in toxicity_types:
                toxicity_types.append('aggressive')
        
        # Check for excessive punctuation
        if text.count('!') > 3 or text.count('?') > 3 or text.count('.') > 5:
            toxicity_score += 0.02
        
        toxicity_score = min(1.0, toxicity_score)
        
        # --- KEY CHANGE: Use the global rule-based threshold ---
        is_toxic = toxicity_score > self.RULE_BASED_TOXICITY_THRESHOLD
        
        return {
            'is_toxic': is_toxic,
            'toxicity_score': round(toxicity_score, 4),
            'toxicity_type': toxicity_types[0] if toxicity_types else None,
            'detection_method': 'rule_based'
        }
    
    def _classify_toxicity_type(self, text: str) -> str:
        """Classify the type of toxicity (kept consistent with fallback categories)"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['hate', 'racist', 'nazi', 'homophobic', 'bigot', 'supremacy']):
            return 'hate_speech'
        elif any(word in text_lower for word in ['kill', 'die', 'hurt', 'threat', 'bomb', 'shoot', 'murder', 'harm']):
            return 'threats'
        elif any(word in text_lower for word in ['stupid', 'idiot', 'loser', 'pathetic', 'ugly', 'dumb', 'clown']):
            return 'harassment'
        elif len(text) > 10 and sum(1 for c in text if c.isupper()) / len(text) > 0.7:
            return 'aggressive'
        elif any(word in text_lower for word in ['ass', 'bitch', 'fuck', 'shit', 'piss', 'cunt', 'wanker']):
            return 'profanity'
        elif any(word in text_lower for word in ['subscribe', 'follow', 'check out', 'visit my', 'free money', 'giveaway', 'link in bio']):
            return 'spam'
        else:
            return 'general_toxicity'
    
    def _clean_text(self, text: str) -> str:
        """Clean text for toxicity analysis"""
        text = re.sub(r'http[s]?://\S+', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _compile_toxicity_analysis(self, toxic_comments: List[Dict[str, Any]], 
                                   toxicity_scores: List[float], 
                                   total_comments: int) -> Dict[str, Any]:
        """Compile comprehensive toxicity analysis"""
        if total_comments == 0:
            return self._empty_toxicity_analysis()
        
        toxic_count = len(toxic_comments)
        toxicity_rate = (toxic_count / total_comments) * 100
        avg_toxicity_score = np.mean(toxicity_scores) if toxicity_scores else 0
        
        high_toxicity = [c for c in toxic_comments if c['toxicity_score'] > 0.7]
        medium_toxicity = [c for c in toxic_comments if 0.4 <= c['toxicity_score'] <= 0.7]
        low_toxicity = [c for c in toxic_comments if c['toxicity_score'] < 0.4]
        
        toxicity_types = [c['toxicity_type'] for c in toxic_comments if c['toxicity_type']]
        type_distribution = dict(Counter(toxicity_types))
        
        return {
            'total_comments_analyzed': total_comments,
            'toxic_comments_count': toxic_count,
            'toxicity_rate': round(toxicity_rate, 2),
            'avg_toxicity_score': round(avg_toxicity_score, 4),
            'toxicity_levels': {
                'high': len(high_toxicity),
                'medium': len(medium_toxicity),
                'low': len(low_toxicity)
            },
            'toxicity_type_distribution': type_distribution,
            'most_toxic_comments': sorted(
                toxic_comments, 
                key=lambda x: x['toxicity_score'], 
                reverse=True
            )[:5],
            'community_health_score': self._calculate_health_score(toxicity_rate, avg_toxicity_score)
        }
    
    def _calculate_health_score(self, toxicity_rate: float, avg_score: float) -> Dict[str, Any]:
        """Calculate community health score"""
        health_score = 100 - (toxicity_rate * 2) - (avg_score * 50)
        health_score = max(0, min(100, health_score))
        
        if health_score >= 80:
            health_level = 'Excellent'
        elif health_score >= 60:
            health_level = 'Good'
        elif health_score >= 40:
            health_level = 'Moderate'
        elif health_score >= 20:
            health_level = 'Poor'
        else:
            health_level = 'Very Poor'
        
        return {
            'score': round(health_score, 1),
            'level': health_level,
            'description': self._get_health_description(health_level)
        }
    
    def _get_health_description(self, level: str) -> str:
        """Get description for community health level"""
        descriptions = {
            'Excellent': 'Very healthy community with minimal toxic content',
            'Good': 'Generally positive community with occasional toxic comments',
            'Moderate': 'Mixed community with some concerning toxic content',
            'Poor': 'Community with significant toxicity issues',
            'Very Poor': 'Highly toxic community requiring immediate attention'
        }
        return descriptions.get(level, 'Unknown community health status')
    
    def _empty_toxicity_analysis(self) -> Dict[str, Any]:
        """Return empty toxicity analysis structure"""
        return {
            'total_comments_analyzed': 0,
            'toxic_comments_count': 0,
            'toxicity_rate': 0.0,
            'avg_toxicity_score': 0.0,
            'toxicity_levels': {'high': 0, 'medium': 0, 'low': 0},
            'toxicity_type_distribution': {},
            'most_toxic_comments': [],
            'community_health_score': {
                'score': 100.0,
                'level': 'Excellent',
                'description': 'No data available for analysis'
            }
        }