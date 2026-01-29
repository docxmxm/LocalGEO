"""
Places GoldEater - Google Places API 数据补全
负责将 AI 返回的 raw_name 转换为真实的商户信息
"""
import requests
from typing import Optional, Dict
from dataclasses import dataclass

from ..shared import APIConfig, Business

@dataclass
class PlaceResult:
    """Google Places 查询结果"""
    google_place_id: str
    name: str
    address: str
    lat: float
    lng: float
    cuisine_type: Optional[str] = None
    price_level: Optional[int] = None
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None

class PlacesEater:
    """Google Places 数据补全器"""
    
    SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'
    
    def __init__(self, api_config: APIConfig = None):
        self.config = api_config or APIConfig()
        self.api_key = self.config.google_places_api_key
    
    def search_place(
        self,
        raw_name: str,
        lat: float,
        lng: float,
        radius: int = 500
    ) -> Optional[PlaceResult]:
        """
        根据名称和位置搜索商户
        
        Args:
            raw_name: AI 返回的原始名称
            lat: 搜索中心纬度
            lng: 搜索中心经度
            radius: 搜索半径 (米)
        
        Returns:
            PlaceResult 或 None (未找到)
        """
        params = {
            'query': raw_name,
            'location': f'{lat},{lng}',
            'radius': radius,
            'type': 'restaurant',
            'key': self.api_key
        }
        
        response = requests.get(self.SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] != 'OK' or not data.get('results'):
            return None
        
        # 取第一个结果
        place = data['results'][0]
        
        return PlaceResult(
            google_place_id=place['place_id'],
            name=place['name'],
            address=place.get('formatted_address', ''),
            lat=place['geometry']['location']['lat'],
            lng=place['geometry']['location']['lng'],
            price_level=place.get('price_level'),
            rating=place.get('rating'),
            user_ratings_total=place.get('user_ratings_total')
        )
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        """
        获取商户详细信息
        
        Args:
            place_id: Google Place ID
        
        Returns:
            详细信息字典
        """
        params = {
            'place_id': place_id,
            'fields': 'name,formatted_address,geometry,types,price_level,rating,user_ratings_total,opening_hours,website,formatted_phone_number',
            'key': self.api_key
        }
        
        response = requests.get(self.DETAILS_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] != 'OK':
            return None
        
        result = data['result']
        
        # 提取菜系类型
        cuisine_type = None
        types = result.get('types', [])
        cuisine_mapping = {
            'chinese_restaurant': 'Chinese',
            'japanese_restaurant': 'Japanese',
            'italian_restaurant': 'Italian',
            'french_restaurant': 'French',
            'indian_restaurant': 'Indian',
            'thai_restaurant': 'Thai',
            'mexican_restaurant': 'Mexican',
            'korean_restaurant': 'Korean',
            'vietnamese_restaurant': 'Vietnamese',
        }
        for t in types:
            if t in cuisine_mapping:
                cuisine_type = cuisine_mapping[t]
                break
        
        return {
            'name': result.get('name'),
            'address': result.get('formatted_address'),
            'lat': result['geometry']['location']['lat'],
            'lng': result['geometry']['location']['lng'],
            'cuisine_type': cuisine_type,
            'price_level': result.get('price_level'),
            'rating': result.get('rating'),
            'user_ratings_total': result.get('user_ratings_total'),
            'opening_hours': result.get('opening_hours', {}).get('weekday_text'),
            'website': result.get('website'),
            'phone': result.get('formatted_phone_number')
        }
    
    def resolve_and_create_business(
        self,
        raw_name: str,
        lat: float,
        lng: float,
        district: str
    ) -> Optional[Business]:
        """
        解析 raw_name 并创建 Business 对象
        
        Returns:
            Business 对象或 None
        """
        place = self.search_place(raw_name, lat, lng)
        if not place:
            return None
        
        details = self.get_place_details(place.google_place_id)
        
        import h3
        h3_index = h3.latlng_to_cell(place.lat, place.lng, 10)
        
        return Business(
            google_place_id=place.google_place_id,
            official_name=place.name,
            address=place.address,
            lat=place.lat,
            lng=place.lng,
            district=district,
            h3_index=h3_index,
            cuisine=details.get('cuisine_type') if details else None,
            price_range=self._price_level_to_range(place.price_level)
        )
    
    def _price_level_to_range(self, level: Optional[int]) -> Optional[str]:
        """转换价格等级"""
        if level is None:
            return None
        mapping = {1: '$', 2: '$$', 3: '$$$', 4: '$$$$'}
        return mapping.get(level)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Places GoldEater')
    parser.add_argument('--name', required=True, help='Restaurant name to search')
    parser.add_argument('--lat', type=float, default=-33.885)
    parser.add_argument('--lng', type=float, default=151.215)
    
    args = parser.parse_args()
    
    eater = PlacesEater()
    result = eater.search_place(args.name, args.lat, args.lng)
    
    if result:
        print(f"Found: {result.name}")
        print(f"Place ID: {result.google_place_id}")
        print(f"Address: {result.address}")
        print(f"Location: ({result.lat}, {result.lng})")
    else:
        print("Not found - possible AI hallucination")
