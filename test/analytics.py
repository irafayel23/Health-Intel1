import sys
import json
import pandas as pd
import warnings
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

def generate_predictions(timeframe):
    target_disease = 'Fever (Unknown Origin)'

    try:
        if timeframe == 'weekly':
            # Load Weekly Data
            df = pd.read_csv('weekly_cases.csv')
            df['Date'] = pd.to_datetime(df['Date'])
            df.set_index('Date', inplace=True)
            disease_df = df[df['Disease'] == target_disease].copy()
            time_data = disease_df['Cases'].resample('W').sum() # 'W' means Weeks
            s_param = 52 # 52 weeks in a year
            high_risk = 8 # Lower thresholds for weekly cases
            med_risk = 4
        else:
            # Load Monthly Data
            df = pd.read_csv('historical_cases.csv')
            df['Date'] = pd.to_datetime(df['Date'])
            df.set_index('Date', inplace=True)
            disease_df = df[df['Disease'] == target_disease].copy()
            time_data = disease_df['Cases'].resample('MS').sum() # 'MS' means Months
            s_param = 12 # 12 months in a year
            high_risk = 30
            med_risk = 15

        # Train the SARIMA Model
        model = SARIMAX(time_data,
                        order=(1, 1, 1),
                        seasonal_order=(1, 0, 0, s_param),
                        enforce_stationarity=False,
                        enforce_invertibility=False)
        
        trained_model = model.fit(disp=False)
        forecast = trained_model.forecast(steps=1)
        predicted_total = int(round(forecast.iloc[0]))
        if predicted_total < 0: predicted_total = 0

        # Distribute logic
        results = [
            {
                "barangay": "Blumentritt",
                "predicted_cases": int(predicted_total * 0.45),
                "risk_level": "High/Outbreak" if (predicted_total * 0.45) > high_risk else "Medium",
                "disease": target_disease
            },
            {
                "barangay": "Poblacion",
                "predicted_cases": int(predicted_total * 0.35),
                "risk_level": "Medium" if (predicted_total * 0.35) > med_risk else "Low",
                "disease": target_disease
            },
            {
                "barangay": "San Jose",
                "predicted_cases": int(predicted_total * 0.20),
                "risk_level": "Low",
                "disease": target_disease
            }
        ]
        print(json.dumps(results))

    except Exception as e:
        print(json.dumps({"error": f"Model failed: {str(e)}"}))

if __name__ == "__main__":
    # This listens for Node.js telling it which timeframe to run
    timeframe = sys.argv[1] if len(sys.argv) > 1 else 'monthly'
    generate_predictions(timeframe)