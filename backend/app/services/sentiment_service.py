"""
Sentiment analysis service using VADER for YouTube comments
"""
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Dict, Any, Optional
import re
import logging
from collections import Counter
import datetime # Import datetime for timestamp

from app.models.video import CommentData # Assuming this path is correct

logger = logging.getLogger(__name__)

class SentimentService:
    """Service for analyzing comment sentiment using VADER"""

    TOP_COMMENTS_LIMIT = 5 # Constant for the number of top comments to return

    def __init__(self, sentiment_analyzer: SentimentIntensityAnalyzer):
        """
        Initializes the SentimentService.
        Args:
            sentiment_analyzer: An instance of vaderSentiment.vaderSentiment.SentimentIntensityAnalyzer.
        """
        self.analyzer = sentiment_analyzer
        logger.info("SentimentService initialized with sentiment analyzer (VADER).")

    def analyze_comments(self, comments: List[CommentData]) -> Dict[str, Any]:
        """
        Analyze sentiment for a list of comments, returning detailed analysis
        including individual comment sentiments and top positive/neutral/negative comments.
        """
        if not comments:
            return self._empty_analysis()

        all_comments_with_sentiment: List[Dict[str, Any]] = []

        for comment in comments:
            cleaned_text = self._clean_text(comment.text)
            scores = self.analyzer.polarity_scores(cleaned_text)
            sentiment_label = self._classify_sentiment(scores['compound'])

            individual_comment_data = {
                'comment_id': comment.id,
                'text': comment.text, # Original text
                'author': comment.author,
                'published_at': comment.published_at.isoformat() if comment.published_at else None,
                'like_count': comment.like_count,
                'reply_count': comment.reply_count,
                'sentiment_score': round(scores['compound'], 4), # VADER compound score
                'sentiment_label': sentiment_label,
                'positive_score': round(scores['pos'], 4), # Individual positive score
                'negative_score': round(scores['neg'], 4), # Individual negative score
                'neutral_score': round(scores['neu'], 4),  # Individual neutral score
            }
            all_comments_with_sentiment.append(individual_comment_data)

        # Identify top positive, neutral, and negative comments from all_comments_with_sentiment
        positive_comments = [c for c in all_comments_with_sentiment if c['sentiment_label'] == 'positive']
        neutral_comments = [c for c in all_comments_with_sentiment if c['sentiment_label'] == 'neutral']
        negative_comments = [c for c in all_comments_with_sentiment if c['sentiment_label'] == 'negative']

        top_positive_comments = sorted(
            positive_comments,
            key=lambda x: x['sentiment_score'],
            reverse=True
        )[:self.TOP_COMMENTS_LIMIT]

        # For neutral comments, sort by absolute compound score to get closest to zero
        top_neutral_comments = sorted(
            neutral_comments,
            key=lambda x: abs(x['sentiment_score'])
        )[:self.TOP_COMMENTS_LIMIT]

        top_negative_comments = sorted(
            negative_comments,
            key=lambda x: x['sentiment_score']
        )[:self.TOP_COMMENTS_LIMIT]

        sentiment_analysis_results = {
            'all_comments_sentiment': all_comments_with_sentiment,
            'top_positive_comments': top_positive_comments,
            'top_neutral_comments': top_neutral_comments,
            'top_negative_comments': top_negative_comments,
            'total_comments_analyzed': len(all_comments_with_sentiment) # Adding this here as it's useful for the caller
        }

        logger.info(f"DEBUG: SentimentService.analyze_comments returning keys: {sentiment_analysis_results.keys()}")

        return sentiment_analysis_results

    def analyze_single_comment(self, comment_text: str) -> Dict[str, Any]:
        """Analyze sentiment for a single comment."""
        cleaned_text = self._clean_text(comment_text)
        scores = self.analyzer.polarity_scores(cleaned_text)

        return {
            'text': comment_text,
            'cleaned_text': cleaned_text,
            'scores': scores,
            'sentiment': self._classify_sentiment(scores['compound']),
            'confidence': abs(scores['compound'])
        }

    def get_sentiment_trends(self, comments: List[CommentData]) -> List[Dict[str, Any]]:
        """Get sentiment trends over time."""
        if not comments:
            return []

        # Sort comments by date
        sorted_comments = sorted(comments, key=lambda x: x.published_at)

        trends = []
        window_size = max(1, len(sorted_comments) // 10)  # Aim for 10 data points

        for i in range(0, len(sorted_comments), window_size):
            window_comments = sorted_comments[i:i + window_size]

            if not window_comments:
                continue

            # Process comments in the window to get individual sentiment data
            window_sentiment_data = []
            for comment in window_comments:
                cleaned_text = self._clean_text(comment.text)
                scores = self.analyzer.polarity_scores(cleaned_text)
                sentiment_label = self._classify_sentiment(scores['compound'])
                window_sentiment_data.append({
                    'sentiment_score': scores['compound'],
                    'sentiment_label': sentiment_label,
                    'pos': scores['pos'], 'neg': scores['neg'], 'neu': scores['neu']
                })

            # Extract scores and labels for _calculate_sentiment_metrics
            window_scores = [{'compound': d['sentiment_score'], 'pos': d['pos'], 'neg': d['neg'], 'neu': d['neu']} for d in window_sentiment_data]
            window_labels = [d['sentiment_label'] for d in window_sentiment_data]

            window_analysis = self._calculate_sentiment_metrics(
                window_scores,
                window_labels,
                len(window_comments)
            )

            # Ensure there are comments in the window to calculate avg_date
            if window_comments:
                avg_date = sum([c.published_at.timestamp() for c in window_comments if c.published_at]) / len(window_comments)
                trends.append({
                    'timestamp': int(avg_date),
                    'positive_ratio': round(window_analysis['sentiment_percentages']['positive'], 2),
                    'negative_ratio': round(window_analysis['sentiment_percentages']['negative'], 2),
                    'neutral_ratio': round(window_analysis['sentiment_percentages']['neutral'], 2),
                    'avg_compound_score': round(window_analysis['sentiment_scores']['compound'], 4)
                })

        return trends

    def get_sentiment_by_engagement(self, comments: List[CommentData]) -> Dict[str, Any]:
        """Analyze sentiment correlation with comment engagement."""
        if not comments:
            return {}

        processed_comments = []
        for comment in comments:
            cleaned_text = self._clean_text(comment.text)
            scores = self.analyzer.polarity_scores(cleaned_text)
            sentiment_label = self._classify_sentiment(scores['compound'])
            processed_comments.append({
                'comment_id': comment.id,
                'text': comment.text,
                'like_count': comment.like_count,
                'sentiment_score': scores['compound'],
                'sentiment_label': sentiment_label,
                'pos': scores['pos'], 'neg': scores['neg'], 'neu': scores['neu']
            })

        high_engagement_comments = [c for c in processed_comments if c['like_count'] > 5]
        low_engagement_comments = [c for c in processed_comments if c['like_count'] <= 5]

        # Extract scores and labels for aggregation for high engagement
        high_engagement_scores = [
            {'compound': c['sentiment_score'], 'pos': c['pos'], 'neg': c['neg'], 'neu': c['neu']}
            for c in high_engagement_comments
        ]
        high_engagement_labels = [c['sentiment_label'] for c in high_engagement_comments]

        high_analysis = self._calculate_sentiment_metrics(
            high_engagement_scores,
            high_engagement_labels,
            len(high_engagement_comments)
        )

        # Extract scores and labels for aggregation for low engagement
        low_engagement_scores = [
            {'compound': c['sentiment_score'], 'pos': c['pos'], 'neg': c['neg'], 'neu': c['neu']}
            for c in low_engagement_comments
        ]
        low_engagement_labels = [c['sentiment_label'] for c in low_engagement_comments]

        low_analysis = self._calculate_sentiment_metrics(
            low_engagement_scores,
            low_engagement_labels,
            len(low_engagement_comments)
        )

        return {
            'high_engagement': {
                'count': len(high_engagement_comments),
                'sentiment_distribution': high_analysis['sentiment_distribution'],
                'avg_compound_score': round(high_analysis['sentiment_scores']['compound'], 4)
            },
            'low_engagement': {
                'count': len(low_engagement_comments),
                'sentiment_distribution': low_analysis['sentiment_distribution'],
                'avg_compound_score': round(low_analysis['sentiment_scores']['compound'], 4)
            }
        }

    def _clean_text(self, text: str) -> str:
        """Clean comment text for better analysis."""
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove excessive punctuation
        text = re.sub(r'[!]{2,}', '!', text)
        text = re.sub(r'[?]{2,}', '?', text)
        # Normalize case for repeated letters (e.g., "sooooo" -> "soo")
        text = re.sub(r'(.)\1{2,}', r'\1\1', text)
        return text.strip()

    def _classify_sentiment(self, compound_score: float) -> str:
        """Classify sentiment based on compound score."""
        if compound_score >= 0.05:
            return 'positive'
        elif compound_score <= -0.05:
            return 'negative'
        else:
            return 'neutral'

    def _calculate_sentiment_metrics(self, scores: List[Dict[str, float]],
                                     labels: List[str], total_comments_count: int) -> Dict[str, Any]:
        """
        Calculate aggregate sentiment metrics from a list of sentiment scores and labels.
        This is a helper function that can be reused by analyze_comments (internally if needed),
        get_sentiment_trends, and get_sentiment_by_engagement.
        """
        if not scores:
            return {
                'total_comments_analyzed': total_comments_count,
                'sentiment_scores': {'positive': 0.0, 'negative': 0.0, 'neutral': 0.0, 'compound': 0.0},
                'sentiment_distribution': {'positive': 0, 'negative': 0, 'neutral': 0},
                'sentiment_percentages': {'positive': 0.0, 'negative': 0.0, 'neutral': 0.0},
                'overall_sentiment': 'neutral',
                'sentiment_strength': 'Neutral',
                'polarization_index': 0.0
            }

        # Calculate average scores
        avg_scores = {
            'positive': sum(s['pos'] for s in scores) / max(1, len(scores)),
            'negative': sum(s['neg'] for s in scores) / max(1, len(scores)),
            'neutral': sum(s['neu'] for s in scores) / max(1, len(scores)),
            'compound': sum(s['compound'] for s in scores) / max(1, len(scores))
        }

        # Count sentiment distribution
        sentiment_counts = Counter(labels)
        total = len(labels)

        sentiment_distribution = {
            'positive': sentiment_counts.get('positive', 0),
            'negative': sentiment_counts.get('negative', 0),
            'neutral': sentiment_counts.get('neutral', 0)
        }

        # Calculate percentages
        sentiment_percentages = {
            'positive': (sentiment_counts.get('positive', 0) / max(1, total)) * 100,
            'negative': (sentiment_counts.get('negative', 0) / max(1, total)) * 100,
            'neutral': (sentiment_counts.get('neutral', 0) / max(1, total)) * 100
        }

        # Overall sentiment classification
        overall_sentiment = self._classify_sentiment(avg_scores['compound'])

        # Sentiment strength
        sentiment_strength = self._get_sentiment_strength(abs(avg_scores['compound']))

        return {
            'total_comments_analyzed': total_comments_count,
            'sentiment_scores': avg_scores,
            'sentiment_distribution': sentiment_distribution,
            'sentiment_percentages': sentiment_percentages,
            'overall_sentiment': overall_sentiment,
            'sentiment_strength': sentiment_strength,
            'polarization_index': self._calculate_polarization(labels)
        }

    def _get_sentiment_strength(self, abs_compound_score: float) -> str:
        """Get sentiment strength description."""
        if abs_compound_score >= 0.6:
            return 'Strong'
        elif abs_compound_score >= 0.3:
            return 'Moderate'
        elif abs_compound_score >= 0.1:
            return 'Weak'
        else:
            return 'Neutral'

    def _calculate_polarization(self, labels: List[str]) -> float:
        """Calculate polarization index (0-1, higher = more polarized)."""
        if not labels:
            return 0.0

        sentiment_counts = Counter(labels)
        total = len(labels)

        positive_ratio = sentiment_counts.get('positive', 0) / total
        negative_ratio = sentiment_counts.get('negative', 0) / total
        neutral_ratio = sentiment_counts.get('neutral', 0) / total

        polarization = (positive_ratio + negative_ratio) * (1 - neutral_ratio)

        return round(polarization, 3)

    def _empty_analysis(self) -> Dict[str, Any]:
        """Return empty structure for detailed sentiment analysis."""
        return {
            'all_comments_sentiment': [],
            'top_positive_comments': [],
            'top_negative_comments': [],
            'top_neutral_comments': [],
            'total_comments_analyzed': 0
        }