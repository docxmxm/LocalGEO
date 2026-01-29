"""
GoldEater 共享配置
"""
import os
from pathlib import Path
from dataclasses import dataclass
from typing import List

# 加载根目录的 .env.local
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / '.env.local'
load_dotenv(env_path)

# 支持的 AI 平台
PLATFORMS = ['chatgpt', 'perplexity', 'gemini', 'claude']

# Prompt 类型
PROMPT_TYPES = [
    'generic_best',
    'date_night', 
    'business_lunch',
    'avoid_tourist',
    'coffee_spot'
]

# H3 分辨率 (res 10 约 66m 边长)
H3_RESOLUTION = 10

# Double-Tap 次数
TAP_COUNT = 2

@dataclass
class ScanConfig:
    """扫描配置"""
    district: str
    prompt_type: str
    platform: str
    system_prompt_version: str = "v1.0.0"
    
@dataclass
class APIConfig:
    """API 配置"""
    openai_api_key: str = os.getenv('OPENAI_API_KEY', '')
    perplexity_api_key: str = os.getenv('PERPLEXITY_API_KEY', '')
    google_ai_api_key: str = os.getenv('GOOGLE_AI_API_KEY', '')
    anthropic_api_key: str = os.getenv('ANTHROPIC_API_KEY', '')
    google_places_api_key: str = os.getenv('GOOGLE_PLACES_API_KEY', '')

@dataclass
class DatabaseConfig:
    """数据库配置"""
    supabase_url: str = os.getenv('SUPABASE_URL', '')
    supabase_key: str = os.getenv('SUPABASE_KEY', '')

# 区域边界配置
DISTRICT_BOUNDS = {
    'surry_hills': {
        'north': -33.875,
        'south': -33.895,
        'west': 151.205,
        'east': 151.225,
        'center': {'lat': -33.885, 'lng': 151.215}
    },
    'newtown': {
        'north': -33.890,
        'south': -33.910,
        'west': 151.170,
        'east': 151.190,
        'center': {'lat': -33.897, 'lng': 151.179}
    }
}
