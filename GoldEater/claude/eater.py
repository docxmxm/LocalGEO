"""
Claude GoldEater - Anthropic API 数据采集
"""
import json
from typing import List
from datetime import datetime
from anthropic import Anthropic

from ..shared import (
    ScanJob, ScanResult, APIConfig,
    SYSTEM_PROMPT, get_user_prompt
)

class ClaudeEater:
    """Claude 数据采集器"""
    
    PLATFORM = 'claude'
    MODEL_VERSION = 'claude-3-opus-20240229'
    
    def __init__(self, api_config: APIConfig = None):
        self.config = api_config or APIConfig()
        self.client = Anthropic(api_key=self.config.anthropic_api_key)
    
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
        
        # 调用 Claude API
        response = self.client.messages.create(
            model=self.MODEL_VERSION,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        raw_content = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens
        
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
    
    parser = argparse.ArgumentParser(description='Claude GoldEater')
    parser.add_argument('--h3-index', required=True)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lng', type=float, required=True)
    parser.add_argument('--district', default='surry_hills')
    parser.add_argument('--prompt-type', default='generic_best')
    
    args = parser.parse_args()
    
    eater = ClaudeEater()
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
