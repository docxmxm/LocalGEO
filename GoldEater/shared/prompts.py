"""
GoldEater Prompt 模板
"""

SYSTEM_PROMPT = """You are a local restaurant recommendation expert. 
When asked about restaurants, provide specific recommendations with:
1. Restaurant name (exact name as it appears on Google Maps)
2. Why you recommend it (2-3 sentences)
3. Vibe tags (e.g., Romantic, Casual, Trendy, Family-friendly)
4. Any potential downsides

Always respond in valid JSON format."""

# 用户 Prompt 模板
USER_PROMPTS = {
    'generic_best': """I'm currently at coordinates ({lat}, {lng}) in {district}, Sydney.
What are the top 5 best restaurants near me?

Respond in this JSON format:
{{
  "recommendations": [
    {{
      "name": "Restaurant Name",
      "rank": 1,
      "reasoning": "Why this restaurant is recommended",
      "vibe_tags": ["Tag1", "Tag2"],
      "negative_flags": ["Any downsides"]
    }}
  ]
}}""",

    'date_night': """I'm at ({lat}, {lng}) in {district}, Sydney.
I'm looking for a romantic restaurant for a date night. 
What are the top 5 best options nearby?

Respond in JSON format with: name, rank, reasoning, vibe_tags, negative_flags""",

    'business_lunch': """I'm at ({lat}, {lng}) in {district}, Sydney.
I need a restaurant for a business lunch - professional atmosphere, good for conversation.
What are the top 5 best options nearby?

Respond in JSON format with: name, rank, reasoning, vibe_tags, negative_flags""",

    'avoid_tourist': """I'm at ({lat}, {lng}) in {district}, Sydney.
I want to eat like a local - no tourist traps, authentic neighborhood spots.
What are the top 5 best hidden gems nearby?

Respond in JSON format with: name, rank, reasoning, vibe_tags, negative_flags""",

    'coffee_spot': """I'm at ({lat}, {lng}) in {district}, Sydney.
I'm looking for a great coffee shop or cafe to work from.
What are the top 5 best options nearby?

Respond in JSON format with: name, rank, reasoning, vibe_tags, negative_flags"""
}

def get_user_prompt(prompt_type: str, lat: float, lng: float, district: str) -> str:
    """生成用户 Prompt"""
    template = USER_PROMPTS.get(prompt_type, USER_PROMPTS['generic_best'])
    return template.format(lat=lat, lng=lng, district=district)
