# test.py
import os
from typing import Optional

# Ensure these imports match your actual file paths
# If your backend directory is the root, these relative imports should work.
from app.services.youtube_service import YouTubeService
from app.models.channel import ChannelData 

# --- Optional: Load environment variables from .env file ---
# If you decide to use python-dotenv, uncomment the following lines:
# from dotenv import load_dotenv
# load_dotenv() # This will load variables from a .env file in the same directory

# --- End Optional ---


youtube_service = YouTubeService()

handle = "@NetflixIndiaOfficial"

print(f"Attempting to retrieve info for handle: {handle}")

# Step 1: Get the Channel ID from the handle
channel_id = youtube_service.get_channel_id_from_handle(handle)

if channel_id:
    print(f"SUCCESS: Found Channel ID for handle '{handle}': {channel_id}")
    # Step 2: Use the Channel ID to get the full channel information
    channel_info: Optional[ChannelData] = youtube_service.get_channel_info(channel_id)
    
    if channel_info:
        print(f"\nSUCCESS: Successfully retrieved full info for channel: '{channel_info.title}'")
        print(f"Description: {channel_info.description[:100]}...") # Print first 100 chars
        print(f"Subscribers: {channel_info.subscriber_count}")
        print(f"Views: {channel_info.view_count}")
        print(f"Videos: {channel_info.video_count}")
        print(f"Published At: {channel_info.published_at}")
        print(f"Thumbnail URL: {channel_info.thumbnail_url}")
    else:
        print(f"\nFAILURE: No detailed channel info found for Channel ID: {channel_id}")
else:
    print(f"\nFAILURE: No Channel ID found for handle: {handle}")