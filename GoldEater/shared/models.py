"""
GoldEater 数据模型
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
import uuid

@dataclass
class ScanJob:
    """扫描任务"""
    h3_index: str
    grid_center_lat: float
    grid_center_lng: float
    district: str
    prompt_type: str
    system_prompt_version: str
    platform: str
    model_version: str
    scan_run_id: str
    tap_number: int
    scanned_at: datetime = field(default_factory=datetime.utcnow)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_prompt_template: Optional[str] = None
    tokens_used: Optional[int] = None

@dataclass
class ScanResult:
    """扫描结果"""
    job_id: str
    raw_name: str
    rank_position: int
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    normalized_name: Optional[str] = None
    business_id: Optional[str] = None
    
    # 位置信息 (由 places GoldEater 补全)
    business_lat: Optional[float] = None
    business_lng: Optional[float] = None
    business_address: Optional[str] = None
    google_place_id: Optional[str] = None
    cuisine_type: Optional[str] = None
    price_level: Optional[int] = None
    
    # 定性评价
    reasoning: Optional[str] = None
    vibe_tags: List[str] = field(default_factory=list)
    negative_flags: List[str] = field(default_factory=list)
    sentiment_score: Optional[float] = None
    
    # 引用数据 (Perplexity 专用)
    citation_urls: List[str] = field(default_factory=list)
    citation_count: Optional[int] = None
    
    # 原始响应
    raw_json_response: Optional[dict] = None

@dataclass
class Business:
    """商户标准档案"""
    google_place_id: str
    official_name: str
    address: str
    lat: float
    lng: float
    district: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    h3_index: Optional[str] = None
    cuisine: Optional[str] = None
    category: Optional[str] = None
    price_range: Optional[str] = None
    description: Optional[str] = None
    ai_tags: List[str] = field(default_factory=list)
