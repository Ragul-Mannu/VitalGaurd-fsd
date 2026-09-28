from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Vitals(BaseModel):
    heartRate: float
    spO2: float
    systolicBP: float
    temperature: float

class AnalysisRequest(BaseModel):
    vitals: Vitals

@app.post("/analyze")
async def analyze_vitals(req: AnalysisRequest):
    v = req.vitals
    score = 0
    messages = []
    tier = "NORMAL"

    # Rules for Heart Rate
    if v.heartRate > 130:
        score += 50
        messages.append(f"Tachycardia detected (HR: {v.heartRate})")
    elif v.heartRate < 45:
        score += 50
        messages.append(f"Bradycardia detected (HR: {v.heartRate})")
    elif v.heartRate > 100:
        score += 20
        messages.append(f"Elevated Heart Rate (HR: {v.heartRate})")

    # Rules for SpO2
    if v.spO2 < 85:
        score += 60
        messages.append(f"Severe Hypoxia (SpO2: {v.spO2}%)")
    elif v.spO2 < 92:
        score += 30
        messages.append(f"Low Oxygen (SpO2: {v.spO2}%)")

    # Rules for Blood Pressure
    if v.systolicBP > 180:
        score += 40
        messages.append(f"Hypertensive Crisis (BP: {v.systolicBP})")
    elif v.systolicBP < 90:
        score += 40
        messages.append(f"Hypotension (BP: {v.systolicBP})")

    # Rules for Temperature
    if v.temperature > 103:
        score += 30
        messages.append(f"High Fever (Temp: {v.temperature}F)")

    # Determine Tier
    if score >= 50:
        tier = "CRITICAL"
    elif score >= 20:
        tier = "WARNING"
    else:
        tier = "NORMAL"
        messages.append("Vitals within acceptable limits")

    return {
        "score": score,
        "tier": tier,
        "message": " | ".join(messages)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
