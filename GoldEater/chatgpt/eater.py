"""
ChatGPT GoldEater - OpenAI API 数据采集
"""
import json
from typing import List, Optional
from datetime import datetime
from openai import OpenAI

from ..shared import (
    ScanJob, ScanResult, APIConfig, 
    SYSTEM_PROMPT, get_user_prompt
)

class ChatGPTEater:
    """ChatGPT 数据采集器"""
    
    PLATFORM = 'chatgpt'
    MODEL_VERSION = 'gpt-4o-2024-08-06'
    
    def __init__(self, api_config: APIConfig = None):
        self.config = api_config or APIConfig()
        self.client = OpenAI(api_key=self.config.openai_api_key)
    
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
        """
        执行单次扫描
        
        Returns:
            (ScanJob, List[ScanResult])
        """
        user_prompt = get_user_prompt(prompt_type, lat, lng, district)
        
        # 调用 OpenAI API
        response = self.client.chat.completions.create(
            model=self.MODEL_VERSION,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        # 解析响应
        raw_content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
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
            tokens_used=tokens_used,
            scanned_at=datetime.utcnow()
        )
        
        # 创建 ScanResults
        results = []
        for rec in recommendations:
            result = ScanResult(
                job_id=job.id,
                raw_name=rec.get('name', ''),
                rank_position=rec.get('rank', 0),
                reasoning=rec.get('reasoning', ''),
                vibe_tags=rec.get('vibe_tags', []),
                negative_flags=rec.get('negative_flags', []),
                raw_json_response=rec
            )
            results.append(result)
        
        return job, results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='ChatGPT GoldEater')
    parser.add_argument('--h3-index', required=True)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lng', type=float, required=True)
    parser.add_argument('--district', default='surry_hills')
    parser.add_argument('--prompt-type', default='generic_best')
    
    args = parser.parse_args()
    
    eater = ChatGPTEater()
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
    print(f"Results: {len(results)}")
    for r in results:
        print(f"  #{r.rank_position}: {r.raw_name}")
