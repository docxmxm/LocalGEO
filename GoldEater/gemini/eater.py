"""
Gemini GoldEater - Google AI API 数据采集
"""
import json
from typing import List
from datetime import datetime
import google.generativeai as genai

from ..shared import (
    ScanJob, ScanResult, APIConfig,
    SYSTEM_PROMPT, get_user_prompt
)

class GeminiEater:
    """Gemini 数据采集器"""
    
    PLATFORM = 'gemini'
    MODEL_VERSION = 'gemini-1.5-pro'
    
    def __init__(self, api_config: APIConfig = None):
        self.config = api_config or APIConfig()
        genai.configure(api_key=self.config.google_ai_api_key)
        self.model = genai.GenerativeModel(self.MODEL_VERSION)
    
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
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        
        # 调用 Gemini API
        response = self.model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json"
            )
        )
        
        raw_content = response.text
        
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
    
    parser = argparse.ArgumentParser(description='Gemini GoldEater')
    parser.add_argument('--h3-index', required=True)
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lng', type=float, required=True)
    parser.add_argument('--district', default='surry_hills')
    parser.add_argument('--prompt-type', default='generic_best')
    
    args = parser.parse_args()
    
    eater = GeminiEater()
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
