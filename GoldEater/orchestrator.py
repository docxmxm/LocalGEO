"""
GoldEater Orchestrator - 调度所有 GoldEater 执行扫描任务
"""
import uuid
import h3
from datetime import datetime
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

from shared import (
    PLATFORMS, PROMPT_TYPES, H3_RESOLUTION, TAP_COUNT,
    DISTRICT_BOUNDS, DatabaseClient, ScanJob, ScanResult
)
from chatgpt import ChatGPTEater
from perplexity import PerplexityEater
from gemini import GeminiEater
from claude import ClaudeEater
from places import PlacesEater

class Orchestrator:
    """GoldEater 调度器"""
    
    def __init__(self):
        self.eaters = {
            'chatgpt': ChatGPTEater(),
            'perplexity': PerplexityEater(),
            'gemini': GeminiEater(),
            'claude': ClaudeEater()
        }
        self.places_eater = PlacesEater()
        self.db = DatabaseClient()
    
    def generate_h3_grid(self, district: str) -> List[Tuple[str, float, float]]:
        """
        生成区域的 H3 网格
        
        Returns:
            List of (h3_index, center_lat, center_lng)
        """
        bounds = DISTRICT_BOUNDS.get(district)
        if not bounds:
            raise ValueError(f"Unknown district: {district}")
        
        # 创建多边形覆盖区域
        polygon = [
            (bounds['west'], bounds['south']),
            (bounds['east'], bounds['south']),
            (bounds['east'], bounds['north']),
            (bounds['west'], bounds['north']),
            (bounds['west'], bounds['south'])
        ]
        
        # 生成 H3 格子
        h3_indexes = h3.polygon_to_cells(polygon, H3_RESOLUTION)
        
        # 获取每个格子的中心点
        grid = []
        for idx in h3_indexes:
            lat, lng = h3.cell_to_latlng(idx)
            grid.append((idx, lat, lng))
        
        return grid
    
    def run_full_scan(
        self,
        district: str,
        platforms: List[str] = None,
        prompt_types: List[str] = None,
        parallel: bool = True
    ):
        """
        执行完整扫描
        
        Args:
            district: 区域名称
            platforms: 要扫描的平台列表 (默认全部)
            prompt_types: 要扫描的场景列表 (默认全部)
            parallel: 是否并行执行
        """
        platforms = platforms or PLATFORMS
        prompt_types = prompt_types or PROMPT_TYPES
        
        scan_run_id = f"run-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
        grid = self.generate_h3_grid(district)
        
        print(f"Starting scan run: {scan_run_id}")
        print(f"District: {district}")
        print(f"Grid cells: {len(grid)}")
        print(f"Platforms: {platforms}")
        print(f"Prompt types: {prompt_types}")
        print(f"Total API calls: {len(grid) * len(platforms) * len(prompt_types) * TAP_COUNT}")
        
        all_jobs = []
        all_results = []
        
        # 生成所有任务
        tasks = []
        for h3_index, lat, lng in grid:
            for platform in platforms:
                for prompt_type in prompt_types:
                    for tap in range(1, TAP_COUNT + 1):
                        tasks.append({
                            'h3_index': h3_index,
                            'lat': lat,
                            'lng': lng,
                            'district': district,
                            'platform': platform,
                            'prompt_type': prompt_type,
                            'scan_run_id': scan_run_id,
                            'tap_number': tap
                        })
        
        if parallel:
            # 并行执行
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = {
                    executor.submit(self._execute_single_scan, task): task 
                    for task in tasks
                }
                
                for future in as_completed(futures):
                    task = futures[future]
                    try:
                        job, results = future.result()
                        all_jobs.append(job)
                        all_results.extend(results)
                        print(f"✓ {task['platform']} | {task['h3_index'][:8]}... | {task['prompt_type']} | tap{task['tap_number']}")
                    except Exception as e:
                        print(f"✗ {task['platform']} | {task['h3_index'][:8]}... | Error: {e}")
        else:
            # 串行执行
            for task in tasks:
                try:
                    job, results = self._execute_single_scan(task)
                    all_jobs.append(job)
                    all_results.extend(results)
                    print(f"✓ {task['platform']} | {task['h3_index'][:8]}... | {task['prompt_type']}")
                except Exception as e:
                    print(f"✗ {task['platform']} | Error: {e}")
        
        # 保存到数据库
        print(f"\nSaving {len(all_jobs)} jobs and {len(all_results)} results to database...")
        for job in all_jobs:
            self.db.insert_scan_job(job)
        self.db.insert_scan_results(all_results)
        
        # 补全位置信息
        print("\nResolving business locations...")
        self._resolve_locations(all_results, district)
        
        print(f"\n✅ Scan complete: {scan_run_id}")
        return scan_run_id
    
    def _execute_single_scan(self, task: dict) -> Tuple[ScanJob, List[ScanResult]]:
        """执行单次扫描"""
        eater = self.eaters[task['platform']]
        return eater.scan(
            h3_index=task['h3_index'],
            lat=task['lat'],
            lng=task['lng'],
            district=task['district'],
            prompt_type=task['prompt_type'],
            scan_run_id=task['scan_run_id'],
            tap_number=task['tap_number']
        )
    
    def _resolve_locations(self, results: List[ScanResult], district: str):
        """补全所有结果的位置信息"""
        # 去重 raw_name
        unique_names = set(r.raw_name for r in results if r.raw_name)
        
        for name in unique_names:
            try:
                # 使用区域中心点搜索
                bounds = DISTRICT_BOUNDS[district]
                business = self.places_eater.resolve_and_create_business(
                    raw_name=name,
                    lat=bounds['center']['lat'],
                    lng=bounds['center']['lng'],
                    district=district
                )
                
                if business:
                    # 更新所有匹配的结果
                    for r in results:
                        if r.raw_name == name:
                            r.google_place_id = business.google_place_id
                            r.business_lat = business.lat
                            r.business_lng = business.lng
                            r.business_address = business.address
                            r.normalized_name = business.official_name
                    
                    # 保存商户
                    self.db.upsert_business(business)
                    print(f"  ✓ Resolved: {name} → {business.official_name}")
                else:
                    print(f"  ✗ Not found (hallucination?): {name}")
                    
            except Exception as e:
                print(f"  ✗ Error resolving {name}: {e}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='GoldEater Orchestrator')
    parser.add_argument('--district', default='surry_hills', help='District to scan')
    parser.add_argument('--platforms', nargs='+', help='Platforms to scan')
    parser.add_argument('--prompt-types', nargs='+', help='Prompt types to scan')
    parser.add_argument('--full-scan', action='store_true', help='Run full scan')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel execution')
    
    args = parser.parse_args()
    
    orchestrator = Orchestrator()
    
    if args.full_scan:
        orchestrator.run_full_scan(
            district=args.district,
            platforms=args.platforms,
            prompt_types=args.prompt_types,
            parallel=not args.no_parallel
        )
    else:
        # 测试模式: 只扫描一个格子
        grid = orchestrator.generate_h3_grid(args.district)
        print(f"Generated {len(grid)} H3 cells for {args.district}")
        print(f"First cell: {grid[0]}")
