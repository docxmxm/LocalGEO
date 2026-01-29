"""
GoldEater 数据库操作
"""
from typing import List, Optional
from dataclasses import asdict
from .models import ScanJob, ScanResult, Business
from .config import DatabaseConfig

class DatabaseClient:
    """Supabase 数据库客户端"""
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig()
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            from supabase import create_client
            self._client = create_client(
                self.config.supabase_url,
                self.config.supabase_key
            )
        return self._client
    
    def insert_scan_job(self, job: ScanJob) -> str:
        """插入扫描任务"""
        data = asdict(job)
        data['scanned_at'] = job.scanned_at.isoformat()
        
        result = self.client.table('raw.scan_jobs').insert(data).execute()
        return result.data[0]['id']
    
    def insert_scan_results(self, results: List[ScanResult]) -> List[str]:
        """批量插入扫描结果"""
        data = [asdict(r) for r in results]
        result = self.client.table('raw.scan_results').insert(data).execute()
        return [r['id'] for r in result.data]
    
    def upsert_business(self, business: Business) -> str:
        """插入或更新商户"""
        data = asdict(business)
        result = self.client.table('stg.businesses').upsert(
            data, 
            on_conflict='google_place_id'
        ).execute()
        return result.data[0]['id']
    
    def get_unresolved_results(self, limit: int = 100) -> List[dict]:
        """获取未补全位置信息的结果"""
        result = self.client.table('raw.scan_results')\
            .select('*')\
            .is_('google_place_id', 'null')\
            .limit(limit)\
            .execute()
        return result.data
    
    def update_result_location(self, result_id: str, location_data: dict):
        """更新结果的位置信息"""
        self.client.table('raw.scan_results')\
            .update(location_data)\
            .eq('id', result_id)\
            .execute()
