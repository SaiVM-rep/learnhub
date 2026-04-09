import math
import re


def is_youtube_url(url: str) -> bool:
    """Check if URL is a YouTube video URL."""
    if not url:
        return False
    pattern = r'(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)'
    return bool(re.search(pattern, url))


def get_youtube_duration(url: str) -> dict:
    """
    Fetch YouTube video duration using yt-dlp (no API key required).
    Returns dict with duration_minutes and title, or error key.
    """
    if not is_youtube_url(url):
        return {'error': 'Not a YouTube URL'}

    try:
        import yt_dlp

        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'no_warnings': True,
            'extract_flat': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        duration_seconds = info.get('duration', 0)
        title = info.get('title', '')

        if not duration_seconds:
            return {'error': 'Could not extract duration'}

        duration_minutes = math.ceil(duration_seconds / 60)
        return {
            'duration_minutes': duration_minutes,
            'title': title,
        }

    except Exception as e:
        return {'error': str(e)}
