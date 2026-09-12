import pandas as pd
import numpy as np
import mysql.connector
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings
import json
import sys

warnings.filterwarnings("ignore") # Ignore convergence warnings for small datasets

# ==========================================
# STEP 1: CONNECT TO DATABASE & FETCH DATA
# ==========================================
def fetch_disease_data(disease_name):
    """
    Fetches monthly aggregated case counts for the entire municipality.
    We fetch MUNICIPALITY-WIDE data to solve the "Sparse Data" problem.
    """
    try:
        db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="health_intel"
        )
        cursor = db.cursor(dictionary=True)
        
        # Group cases by Month and Year
        query = """
            SELECT 
                DATE_FORMAT(date_recorded, '%Y-%m-01') as month_date, 
                COUNT(id) as total_cases 
            FROM health_cases 
            WHERE disease = %s AND status != 'Archived'
            GROUP BY month_date 
            ORDER BY month_date ASC
        """
        cursor.execute(query, (disease_name,))
        rows = cursor.fetchall()
        db.close()
        
        if len(rows) < 12:
            return None # Not enough data for seasonality (need at least 1 year)

        # Convert to Pandas DataFrame
        df = pd.DataFrame(rows)
        df['month_date'] = pd.to_datetime(df['month_date'])
        df.set_index('month_date', inplace=True)
        
        # Ensure missing months are filled with 0 cases
        df = df.resample('MS').sum().fillna(0)
        return df
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

# ==========================================
# STEP 2: THE SARIMA MATHEMATICAL MODEL
# ==========================================
def run_sarima_prediction(df):
    """
    SARIMA Math Breakdown: (p, d, q) x (P, D, Q, s)
    """
    # We use typical parameters for monthly disease data:
    model = SARIMAX(df['total_cases'], 
                    order=(1, 1, 1), 
                    seasonal_order=(1, 1, 1, 12),
                    enforce_stationarity=False,
                    enforce_invertibility=False)
    
    # Train the model 
    fitted_model = model.fit(disp=False)
    
    # Predict the next 3 months
    forecast = fitted_model.get_forecast(steps=3)
    prediction_values = forecast.predicted_mean
    
    # Ensure no negative predictions
    prediction_values = np.maximum(prediction_values, 0)
    
    return prediction_values

# ==========================================
# STEP 3: SOLVING THE "SPARSE DATA" PROBLEM 
# ==========================================
def calculate_barangay_forecast(municipal_predictions, barangay_name, disease_name):
    """
    Hierarchical Downscaling for Barangays with Sparse Data.
    """
    db = mysql.connector.connect(host="localhost", user="root", password="", database="health_intel")
    cursor = db.cursor(dictionary=True)
    
    # Total historical cases in municipality
    cursor.execute("SELECT COUNT(id) as total FROM health_cases WHERE disease = %s", (disease_name,))
    total_mun = cursor.fetchone()['total']
    
    # Total historical cases in this specific barangay
    cursor.execute("""
        SELECT COUNT(h.id) as total 
        FROM health_cases h 
        JOIN barangays b ON h.barangay_id = b.id 
        WHERE h.disease = %s AND b.name = %s
    """, (disease_name, barangay_name))
    total_brgy = cursor.fetchone()['total']
    db.close()
    
    # What percentage of cases does this barangay usually get?
    barangay_weight = total_brgy / total_mun if total_mun > 0 else 0
    
    # Downscale the forecast!
    brgy_predictions = municipal_predictions * barangay_weight
    return brgy_predictions.round(0).tolist()

# ==========================================
# MAIN EXECUTION (Callable via Node.js)
# ==========================================
if __name__ == "__main__":
    # If arguments are passed from Node.js (e.g. node calls python analytics.py Dengue Blumentritt)
    if len(sys.argv) >= 3:
        target_disease = sys.argv[1]
        target_barangay = sys.argv[2]
        
        df_municipal = fetch_disease_data(target_disease)
        
        if df_municipal is not None:
            mun_preds = run_sarima_prediction(df_municipal)
            brgy_preds = calculate_barangay_forecast(mun_preds, target_barangay, target_disease)
            
            # Print JSON so Node.js can parse it easily
            print(json.dumps({
                "success": True,
                "disease": target_disease,
                "barangay": target_barangay,
                "predictions_next_3_months": brgy_preds
            }))
        else:
            print(json.dumps({"success": False, "error": "Not enough historical data to run SARIMA."}))
    else:
        print("Usage: python analytics.py <Disease> <Barangay>")
