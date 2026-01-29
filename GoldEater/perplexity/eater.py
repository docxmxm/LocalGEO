"""
Perplexity GoldEater - Perplexity API 数据采集
特点: 支持 citation_urls 引用来源
"""
import json
import requests
from typing import List
from datetime import datetime

from ..shared import (
    ScanJob, ScanResult, APIConfig,
    SYSTEM_PROMPT, get_user_prompt
)

class PerplexityEater:
    """Perplexity 数据采集器"""
    
    PLATFORM = 'perplexity'
    MODEL_VERSION = 'llama-3.1-sonar-large-128k-online'
    API_URL = 'https://api.perplexity.ai/chat/completions'
    
    def __init__(self, api_config: APIConfig = None):
        self.config = api_config or APIConfig()
    
    def scan(
        self,
        h3_index: str,
        lat: float,
        lng: float,
        district: str,
        prompt_type: str,
        scan_run_id: str,
        tap_number: int,
        system_prompt_version: str = "v1.0.0"
    ) -> tuple[ScanJob, List[ScanResult]]:
        """执行单次扫描"""
        
        user_prompt = get_user_prompt(prompt_type, lat, lng, district)
        
        # 调用 Perplexity API
        headers = {
            'Authorization': f'Bearer {self.config.perplexity_api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': self.MODEL_VERSION,
            'messages': [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            'temperature': 0.7,
            'return_citations': True  # Perplexity 特有: 返回引用
        }
        
        response = requests.post(self.API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        raw_content = data['choices'][0]['message']['content']
        citations = data.get('citations', [])  # 引用 URL 列表
        
        try:
            parsed = json.loads(raw_content)
            recommendations = parsed.get('recommendations', [])
        except json.JSONDecodeError:
            recommendations = []
        
        # 创建 ScanJob
        job = ScanJob(
            h3_index=h3_index,
            grid_center_lat=lat,
            grid_center_lng=lng,
            district=district,
            prompt_type=prompt_type,
            system_prompt_version=system_prompt_version,
            platform=self.PLATFORM,
            model_version=self.MODEL_VERSION,
            scan_run_id=scan_run_id,
            tap_number=tap_number,
            user_prompt_template=user_prompt,
            scanned_at=datetime.utcnow()
        )
        
        # 创建 ScanResults (带 citation)
        results = []
        for rec in recommendations:
            result = ScanResult(
                job_id=job.id,
                raw_name=rec.get('name', ''),
                rank_position=rec.get('rank', 0),
                reasoning=rec.get('reasoning', ''),
                vibe_tags=rec.get('vibe_tags', []),
                negative_flags=rec.get('negative_flags', []),
                citation_urls=citations,  # Perplexity 特有
                citation_count=len(citations),
                raw_json_response=rec
            )
            results.append(result)
        
        return job, results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Perplexity GoldEater')
    parser.add_argument('--h3-index', required=True)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lng', type=float, required=True)
    parser.add_argument('--district', default='surry_hills')
    parser.add_argument('--prompt-type', default='generic_best')
    
    args = parser.parse_args()
    
    eater = PerplexityEater()
    job, results = eater.scan(
        h3_index=args.h3_index,
        lat=args.lat,
        lng=args.lng,
        district=args.district,
        prompt_type=args.prompt_type,
        scan_run_id='test-run',
        tap_number=1
    )
    
    print(f"Job ID: {job.id}")
    print(f"Citations: {results[0].citation_urls if results else []}")
