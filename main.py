from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import os
import json
import re

app = FastAPI(title="MarketMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your-gemini-api-key-here")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


# --- Request Models ---

class CampaignRequest(BaseModel):
    product_name: str
    target_audience: str
    campaign_goal: str
    tone: str = "professional"
    channels: list[str] = ["email", "social media"]

class SalesPitchRequest(BaseModel):
    product_name: str
    prospect_name: str
    prospect_industry: str
    pain_points: str
    budget_range: Optional[str] = None
    pitch_style: str = "consultative"

class LeadRequest(BaseModel):
    company_name: str
    industry: str
    company_size: str
    recent_activity: Optional[str] = None
    website: Optional[str] = None

class AnalyticsRequest(BaseModel):
    campaign_type: str
    industry: str
    target_audience: str
    budget: Optional[str] = None


# --- Helpers ---

def call_gemini(prompt: str) -> str:
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


# --- Routes ---

@app.get("/")
def root():
    return {"message": "MarketMind API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/campaign/generate")
def generate_campaign(req: CampaignRequest):
    channels_str = ", ".join(req.channels)
    prompt = f"""You are an expert marketing strategist. Create a comprehensive marketing campaign for:

Product/Service: {req.product_name}
Target Audience: {req.target_audience}
Campaign Goal: {req.campaign_goal}
Tone: {req.tone}
Channels: {channels_str}

Provide a structured campaign with:
1. Campaign Name & Tagline
2. Key Message (2-3 sentences)
3. Channel-specific content:
   - Email subject line and body (150 words)
   - Social media post for each channel (tweet-length and LinkedIn version)
   - Ad copy (headline + description)
4. Call-to-Action options (3 variants)
5. KPIs to track success

Format clearly with headers. Be creative and persuasive."""

    content = call_gemini(prompt)
    return {
        "campaign": content,
        "product": req.product_name,
        "audience": req.target_audience,
        "goal": req.campaign_goal,
        "channels": req.channels
    }


@app.post("/api/pitch/generate")
def generate_pitch(req: SalesPitchRequest):
    budget_info = f"Budget Range: {req.budget_range}" if req.budget_range else ""
    prompt = f"""You are a world-class sales consultant. Create a compelling sales pitch for:

Product/Service: {req.product_name}
Prospect: {req.prospect_name}
Industry: {req.prospect_industry}
Pain Points: {req.pain_points}
{budget_info}
Pitch Style: {req.pitch_style}

Structure the pitch as:
1. Opening Hook (attention-grabbing first line)
2. Empathy Statement (acknowledge their pain points)
3. Value Proposition (how your product solves their specific problems)
4. Social Proof (2-3 realistic case study references)
5. ROI/Business Case (quantified benefits)
6. Objection Handling (top 3 objections + responses)
7. Closing Statement & Next Steps

Make it personalized, persuasive, and specific to their industry. Use {req.pitch_style} sales methodology."""

    content = call_gemini(prompt)
    return {
        "pitch": content,
        "product": req.product_name,
        "prospect": req.prospect_name,
        "industry": req.prospect_industry
    }


@app.post("/api/leads/analyze")
def analyze_lead(req: LeadRequest):
    activity_info = f"Recent Activity: {req.recent_activity}" if req.recent_activity else ""
    website_info = f"Website: {req.website}" if req.website else ""
    prompt = f"""You are a B2B sales intelligence expert. Analyze this lead and provide actionable insights:

Company: {req.company_name}
Industry: {req.industry}
Company Size: {req.company_size}
{activity_info}
{website_info}

Provide:
1. Lead Score (0-100) with reasoning
2. Buyer Persona Profile
3. Likely Pain Points & Challenges (based on industry/size)
4. Buying Intent Signals
5. Best Outreach Strategy (timing, channel, message angle)
6. Competitor Landscape (likely tools/vendors they use)
7. Deal Potential (Low/Medium/High) with deal size estimate
8. Recommended Next Actions (3 specific steps)

Be data-driven and specific. Give actionable intelligence a sales rep can use immediately."""

    content = call_gemini(prompt)
    return {
        "analysis": content,
        "company": req.company_name,
        "industry": req.industry,
        "size": req.company_size
    }


@app.post("/api/analytics/predict")
def predict_analytics(req: AnalyticsRequest):
    budget_info = f"Budget: {req.budget}" if req.budget else ""
    prompt = f"""You are a marketing analytics expert. Provide predictive analytics and benchmarks for:

Campaign Type: {req.campaign_type}
Industry: {req.industry}
Target Audience: {req.target_audience}
{budget_info}

Provide:
1. Expected Performance Metrics:
   - Email: Open rate, CTR, Conversion rate
   - Social: Engagement rate, Reach, CPM
   - Paid Ads: CTR, CPC, ROAS
2. Industry Benchmarks comparison
3. Predicted Lead Generation (monthly)
4. Revenue Impact Forecast (3-month projection)
5. Budget Allocation Recommendations (% per channel)
6. Risk Factors & Mitigation
7. Optimization Tips (top 5)
8. A/B Test Recommendations

Format with specific numbers and percentages. Be realistic based on industry standards."""

    content = call_gemini(prompt)

    # Generate mock chart data
    chart_data = {
        "monthly_leads": [
            {"month": "Month 1", "leads": 45, "conversions": 8},
            {"month": "Month 2", "leads": 78, "conversions": 14},
            {"month": "Month 3", "leads": 112, "conversions": 22},
        ],
        "channel_distribution": [
            {"channel": "Email", "percentage": 35},
            {"channel": "Social Media", "percentage": 28},
            {"channel": "Paid Ads", "percentage": 22},
            {"channel": "Organic", "percentage": 15},
        ]
    }

    return {
        "analysis": content,
        "chart_data": chart_data,
        "campaign_type": req.campaign_type,
        "industry": req.industry
    }


@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Return mock dashboard statistics"""
    return {
        "total_campaigns": 24,
        "active_leads": 187,
        "pitches_generated": 63,
        "avg_lead_score": 72,
        "conversion_rate": 18.4,
        "revenue_pipeline": "$2.4M",
        "top_performing_channel": "Email",
        "monthly_growth": 23.5
    }
