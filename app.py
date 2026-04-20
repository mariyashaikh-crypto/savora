import os
import random
from flask import Flask, render_template, request, jsonify
import pandas as pd
import pickle

app = Flask(__name__)

# Load the trained model
try:
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None
    print("WARNING: model.pkl not found. Using algorithmic fallbacks.")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/data')
def data_page():
    return render_template('data.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    day_mapping = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6}
    day_name = data.get('day', 'Monday')
    day_of_week = day_mapping.get(day_name, 0)
    weather = data.get('weather', 'Clear')
    is_holiday = 1 if data.get('holiday') == 'Yes' else 0
    special_events = data.get('events', 'None')
    is_simulation = data.get('simulation', False)
    rest_type = data.get('rest_type', 'Casual Dining')
    
    prediction = 150.0
    
    if model:
        try:
            input_data = pd.DataFrame({'DayOfWeek': [day_of_week], 'Weather': [weather], 'IsHoliday': [is_holiday]})
            prediction = model.predict(input_data)[0]
        except Exception as e:
            print(f"Model prediction error: {e}")
            
    # Factors logic
    factors = []
    
    # Base multiplier
    multiplier = 1.0
    
    # Event effect
    if special_events == 'Festival':
        factors.append({'name': 'Local Festival', 'effect': '+40%', 'type': 'positive', 'impact_val': 40})
        multiplier = 1.4
    elif special_events == 'Sports':
        factors.append({'name': 'Sports Game', 'effect': '+60%', 'type': 'positive', 'impact_val': 60})
        multiplier = 1.6
    elif special_events == 'Concert':
        factors.append({'name': 'Music Concert', 'effect': '+50%', 'type': 'positive', 'impact_val': 50})
        multiplier = 1.5
    else:
        factors.append({'name': 'No Special Events', 'effect': 'Neutral', 'type': 'neutral', 'impact_val': 0})
        
    # Weather effect
    if weather == 'Clear':
        factors.append({'name': 'Clear Weather', 'effect': '+15%', 'type': 'positive', 'impact_val': 15})
        multiplier *= 1.15
    elif weather in ['Rain', 'Snow']:
        factors.append({'name': f'{weather} Forecast', 'effect': '-20%', 'type': 'negative', 'impact_val': -20})
        multiplier *= 0.8
    else:
        factors.append({'name': 'Cloudy/Mild', 'effect': 'Neutral', 'type': 'neutral', 'impact_val': 0})
        
    # Day effect
    if day_of_week >= 4:
        factors.append({'name': 'Weekend Rush', 'effect': '+25%', 'type': 'positive', 'impact_val': 25})
        multiplier *= 1.25
    else:
        factors.append({'name': 'Weekday Lull', 'effect': '-10%', 'type': 'negative', 'impact_val': -10})
        multiplier *= 0.9
        
    # Holiday effect
    if is_holiday:
        factors.append({'name': 'Holiday Surge', 'effect': '+30%', 'type': 'positive', 'impact_val': 30})
        multiplier *= 1.3
    # Type multiplier
    cost_multiplier = 2.8
    if rest_type == 'Fine Dining':
        multiplier *= 0.6 # Lower volume
        cost_multiplier = 12.5 # High ingredient cost
    elif rest_type == 'Fast Food':
        multiplier *= 2.5 # High volume
        cost_multiplier = 1.2
    elif rest_type == 'Cafe':
        multiplier *= 0.9
        cost_multiplier = 1.8
        
    final_prediction = prediction * multiplier
    
    # Generate Insight & Alert
    insight = "Operating within normal parameters."
    alert = None
    if final_prediction > 250:
        insight = "Critical high volume expected. Maximize staff shifts and prep stations."
        alert = "HIGH DEMAND SURGE EXPECTED"
    elif final_prediction < 100:
        insight = "Low foot traffic expected. Implement cost-saving skeleton crew."
        alert = "LOW DEMAND WARNING"
    else:
        insight = "Solid steady demand across all services."

    # Breakdown (B/L/D)
    if day_of_week >= 5: # Weekend
        breakdown = {'breakfast': 30, 'lunch': 45, 'dinner': 25}
    else: # Weekday
        breakdown = {'breakfast': 15, 'lunch': 50, 'dinner': 35}

    # Generate 7-day Future Predictions
    base_trend = final_prediction * 0.8
    yesterday_val = round(base_trend + random.randint(-10, 50))
    trend_diff = final_prediction - yesterday_val
    trend_pct = round((abs(trend_diff) / yesterday_val) * 100, 1) if yesterday_val else 0
    trend_direction = "up" if trend_diff > 0 else "down"
    
    future_data = {
        'labels': ['Today', 'Day +1', 'Day +2', 'Day +3', 'Day +4', 'Day +5', 'Day +6'],
        'values': [
            round(final_prediction),
            round(final_prediction * random.uniform(0.8, 1.2)),
            round(final_prediction * random.uniform(0.7, 1.3)),
            round(final_prediction * random.uniform(0.8, 1.2)),
            round(final_prediction * random.uniform(0.9, 1.4)),
            round(final_prediction * random.uniform(1.0, 1.5)),
            round(final_prediction * random.uniform(0.7, 1.1))
        ]
    }
    
    # Inventory
    portions = round(final_prediction)
    ingredients = [
        {"name": "Protein (Chicken/Beef)", "qty": f"{round(portions * 0.25, 1)} kg"},
        {"name": "Fresh Produce", "qty": f"{round(portions * 0.4, 1)} kg"},
        {"name": "Grains/Carbs", "qty": f"{round(portions * 0.15, 1)} kg"},
        {"name": "Sauces/Dairy", "qty": f"{round(portions * 0.1, 1)} kg"}
    ]
    
    # Impact metrics
    waste_reduction = round(random.uniform(18.0, 35.0), 1)
    cost_savings = round(final_prediction * cost_multiplier * (waste_reduction / 100), 2)
    efficiency = round(random.uniform(88.0, 99.0), 1)
    confidence = round(random.uniform(88.5, 96.5), 1)
    
    return jsonify({
        'prediction': portions,
        'insight': insight,
        'alert': alert,
        'confidence': confidence,
        'trend': {'direction': trend_direction, 'percentage': trend_pct},
        'breakdown': breakdown,
        'factors': factors,
        'ingredients': ingredients,
        'future_data': future_data,
        'impact': {
            'waste_reduction': waste_reduction,
            'cost_savings': cost_savings,  # Passed as base USD
            'efficiency': efficiency
        }
    })

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '').lower()
    
    if 'inventory' in message or 'stock' in message:
        reply = "Based on the latest matrix run, I recommend checking the Smart Inventory Log for exact quantities. Your protein and produce levels should be increased by 15%."
    elif 'predict' in message or 'demand' in message:
        reply = "I've analyzed the prediction data. It looks like you'll have a surge this weekend. Have you tried toggling Simulation Mode to check the exact financial impact?"
    elif 'cost' in message or 'save' in message:
        reply = "By following our Neural Model's suggested inventory, you're projected to reduce waste by around 25%, significantly lowering your overall costs this week."
    elif 'weather' in message or 'rain' in message:
        reply = "Adjusting for weather metrics... Rain typically decreases foot traffic by 20%. Ensure your simulation form has the weather properly set before clicking Execute."
    else:
        try:
            import google.generativeai as genai
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                model_ai = genai.GenerativeModel('gemini-1.5-flash')
                response = model_ai.generate_content(
                    f"You are SAVORA, an advanced AI system for culinary demand prediction. Briefly answer this question: {message}"
                )
                reply = response.text
            else:
                reply = f"I've processed '{message}' through the SAVORA Neural Matrix. Without an API Key configured for deep context, I suggest executing a new model run or checking the generated PDF report for insights."
        except Exception as e:
            print(f"Generative AI error: {e}")
            reply = f"I've processed your query about '{message}', but encountered anomalous data. I suggest executing a new model run or checking the generated Dashboard for deeper insights."
            
    return jsonify({'reply': reply})


if __name__ == '__main__':
    app.run(debug=True, port=8080)
