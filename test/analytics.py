import sys
import json
import pandas as pd
import warnings
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

def generate_predictions():
    try:
        # 1. Read the anonymized data from Node.js via Standard Input (stdin)
        # Expected format: [{"Date": "2023-01", "Barangay": "Blumentritt", "Disease": "Dengue", "Cases": 5}, ...]
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No data provided"}))
            return

        data = json.loads(input_data)
        if not data:
            print(json.dumps({"error": "Empty dataset"}))
            return

        # 2. Convert to Pandas DataFrame
        df = pd.DataFrame(data)
        
        # Convert 'Date' to datetime and set as index
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        
        results = []
        diseases = df['Disease'].unique()
        barangays = df['Barangay'].unique()

        # 3. Run SARIMA for each Disease and Barangay combination
        for disease in diseases:
            for barangay in barangays:
                # Filter data for specific disease and barangay
                subset = df[(df['Disease'] == disease) & (df['Barangay'] == barangay)].copy()
                
                # Resample monthly just to ensure strict timeline
                time_data = subset['Cases'].resample('MS').sum()
                
                # If we don't have enough data points, skip forecasting
                if len(time_data) < 12:
                    continue
                
                # 4. Train the SARIMA Model
                # s_param = 12 for monthly data (yearly seasonality)
                model = SARIMAX(time_data,
                                order=(1, 1, 1),
                                seasonal_order=(1, 0, 0, 12),
                                enforce_stationarity=False,
                                enforce_invertibility=False)
                
                trained_model = model.fit(disp=False)
                
                # Predict the next 1 month
                forecast = trained_model.forecast(steps=1)
                predicted_cases = int(round(forecast.iloc[0]))
                if predicted_cases < 0: predicted_cases = 0

                # Determine Risk Level
                risk_level = "Low"
                if predicted_cases > 30:
                    risk_level = "High/Outbreak"
                elif predicted_cases > 15:
                    risk_level = "Medium"

                results.append({
                    "barangay": barangay,
                    "disease": disease,
                    "predicted_cases": predicted_cases,
                    "risk_level": risk_level
                })

        # 5. Output the results as JSON for Node.js to read
        print(json.dumps({"success": True, "predictions": results}))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Model failed: {str(e)}"}))

if __name__ == "__main__":
    generate_predictions()