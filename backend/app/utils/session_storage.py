"""
Temporary session storage for YouTube analytics data
"""
import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

from app.config import settings

class SessionStorage:
    """In-memory session storage for temporary data persistence"""
    
    def __init__(self):
        """Initialize session storage"""
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self._last_cleanup = time.time()
    
    def create_session(self) -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'created_at': time.time(),
            'last_accessed': time.time(),
            'data': {}
        }
        
        # Cleanup old sessions if needed
        self._cleanup_expired_sessions()
        
        return session_id
    
    def store_data(self, session_id: str, key: str, data: Any) -> bool:
        """Store data in session"""
        try:
            if session_id not in self.sessions:
                return False
            
            # Update last accessed time
            self.sessions[session_id]['last_accessed'] = time.time()
            
            # Store data (ensure JSON serializable)
            self.sessions[session_id]['data'][key] = self._serialize_data(data)
            
            return True
            
        except Exception as e:
            print(f"Error storing session data: {e}")
            return False
    
    def get_data(self, session_id: str, key: str) -> Optional[Any]:
        """Retrieve data from session"""
        try:
            if session_id not in self.sessions:
                return None
            
            # Update last accessed time
            self.sessions[session_id]['last_accessed'] = time.time()
            
            return self.sessions[session_id]['data'].get(key)
            
        except Exception as e:
            print(f"Error retrieving session data: {e}")
            return None
    
    def get_all_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get all data for a session"""
        try:
            if session_id not in self.sessions:
                return None
            
            # Update last accessed time
            self.sessions[session_id]['last_accessed'] = time.time()
            
            return self.sessions[session_id]['data'].copy()
            
        except Exception as e:
            print(f"Error retrieving all session data: {e}")
            return None
    
    def delete_session_data(self, session_id: str, key: str) -> bool:
        """Delete specific data from session"""
        try:
            if session_id not in self.sessions:
                return False
            
            if key in self.sessions[session_id]['data']:
                del self.sessions[session_id]['data'][key]
                return True
            
            return False
            
        except Exception as e:
            print(f"Error deleting session data: {e}")
            return False
    
    def clear_session(self, session_id: str) -> bool:
        """Clear all data from a session"""
        try:
            if session_id in self.sessions:
                self.sessions[session_id]['data'] = {}
                return True
            return False
            
        except Exception as e:
            print(f"Error clearing session: {e}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete entire session"""
        try:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False
            
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False
    
    def session_exists(self, session_id: str) -> bool:
        """Check if session exists"""
        return session_id in self.sessions
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session metadata"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return {
            'session_id': session_id,
            'created_at': datetime.fromtimestamp(session['created_at']).isoformat(),
            'last_accessed': datetime.fromtimestamp(session['last_accessed']).isoformat(),
            'data_keys': list(session['data'].keys()),
            'data_count': len(session['data']),
            'expires_at': datetime.fromtimestamp(
                session['created_at'] + settings.SESSION_TIMEOUT
            ).isoformat()
        }
    
    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all active sessions"""
        sessions_info = []
        current_time = time.time()
        
        for session_id, session in self.sessions.items():
            if not self._is_expired(session, current_time):
                sessions_info.append(self.get_session_info(session_id))
        
        return sessions_info
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get session storage statistics"""
        current_time = time.time()
        active_sessions = 0
        expired_sessions = 0
        total_data_items = 0
        
        for session in self.sessions.values():
            if self._is_expired(session, current_time):
                expired_sessions += 1
            else:
                active_sessions += 1
                total_data_items += len(session['data'])
        
        return {
            'active_sessions': active_sessions,
            'expired_sessions': expired_sessions,
            'total_sessions': len(self.sessions),
            'total_data_items': total_data_items,
            'memory_usage_mb': self._estimate_memory_usage()
        }
    
    def clear_all(self) -> None:
        """Clear all sessions (used on application shutdown)"""
        self.sessions = {}
    
    def _cleanup_expired_sessions(self) -> None:
        """Remove expired sessions"""
        current_time = time.time()
        
        # Only cleanup every 5 minutes
        if current_time - self._last_cleanup < 300:
            return
        
        expired_sessions = []
        for session_id, session in self.sessions.items():
            if self._is_expired(session, current_time):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.sessions[session_id]
        
        self._last_cleanup = current_time
        
        if expired_sessions:
            print(f"Cleaned up {len(expired_sessions)} expired sessions")
    
    def _is_expired(self, session: Dict[str, Any], current_time: float) -> bool:
        """Check if session is expired"""
        session_age = current_time - session['created_at']
        return session_age > settings.SESSION_TIMEOUT
    
    def _serialize_data(self, data: Any) -> Any:
        """Ensure data is JSON serializable"""
        try:
            # Try to serialize to JSON and back to ensure it's serializable
            json_str = json.dumps(data, default=str)
            return json.loads(json_str)
        except (TypeError, ValueError):
            # If data is not serializable, convert to string
            return str(data)
    
    def _estimate_memory_usage(self) -> float:
        """Estimate memory usage in MB (rough approximation)"""
        try:
            total_size = 0
            for session in self.sessions.values():
                # Rough estimate: 100 bytes overhead per session + data size
                total_size += 100
                for key, value in session['data'].items():
                    # Estimate size of key and value
                    total_size += len(str(key)) + len(str(value))
            
            return round(total_size / (1024 * 1024), 2)  # Convert to MB
        except:
            return 0.0

# Global session storage instance
session_storage = SessionStorage()