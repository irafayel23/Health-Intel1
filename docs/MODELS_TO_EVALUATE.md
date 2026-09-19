# PREDICTIVE MODELS TO EVALUATE

## MODEL #1: SARIMA (Seasonal Autoregressive Integrated Moving Average)

### Source: 
"A Gentle Introduction to SARIMA for Time Series Forecasting in Python" (Machine Learning Mastery)

### Mechanism:
- **Step 1: Define Model**: `SARIMAX(data, order=(p,d,q), seasonal_order=(P,D,Q,m))` 
- **Step 2: Train/Fit**: `model_fit = model.fit()` to train the algorithm on historical data so it learns the patterns.
- **Step 3: Test/Predict**: `model_fit.forecast(steps=N)` to predict future out-of-sample data, or `model_fit.predict(start, end)` to test the model against historical data to see how accurate it was.

### Evaluation Notes:
- **Testing Duration:** The article acts as a syntax guide and does not dictate a strict testing duration. For our disease prediction (monthly data), the standard practice would be to use an 80/20 split or hold out the last 12 to 24 months as the "test" dataset.
- **Pipeline Details:** The article is a "Gentle Introduction" and *does not* cover a full Machine Learning Pipeline (Data Cleaning, Feature Engineering, Cross-validation). This actually perfectly aligns with our manuscript, which explicitly states we are using classical statistical predictive analytics rather than complex Machine Learning pipelines!
- **AI Recommendation Integration:** **HIGHLY COMPATIBLE.** The numerical forecast outputs (e.g., "Predicted Dengue cases: 45") can easily be passed into an AI module to automatically generate plain-text recommendations (e.g., "Predicted cases are high; recommend immediate community fogging operations").

## MODEL #2: exploringIHSG (Indonesian Stock Exchange Forecasting)

### Source:
GitHub Repository: `https://github.com/apricitea/exploringIHSG`

### Mechanism & Pipeline Analysis:
Unlike the first article, this repository demonstrates a **full, rigorous Data Science Pipeline**:
1. **Data Cleaning (Imputation):** They check for missing values and use Spline Interpolation (`na_interpolation`) to fill in gaps in the data.
2. **Train/Test Split:** They explicitly split the historical data using an **80% Training / 20% Testing** ratio.
3. **Data Transformation & Checks:** They run Box-Cox transformations and Augmented Dickey-Fuller (ADF) tests for stationarity.
4. **Model Training & Testing:** They fit a SARIMA model on the 80% training set and then test it by forecasting the remaining 20%. They evaluate the results using standard accuracy metrics.

### System Compatibility (Can we use it?):
- **Code Compatibility:** **NO.** This repository is written entirely in **R** (using R Markdown), while our backend uses **Python** (`analytics.py`). We cannot copy-paste this code into our system.
- **Methodology Compatibility:** **YES.** The *logic* and *pipeline* they use is a gold standard. We can easily translate their 80/20 split and missing-value imputation pipeline into Python using `pandas` and `scikit-learn` to make our Python SARIMA model much more robust!

### AI-Powered Recommendations Integration:
*Note on combining Predictive and Descriptive Analytics with AI:*
Once the SARIMA pipeline (from either Model #1 or Model #2) generates the mathematical forecast, **we can pipe those numerical results directly into an AI system (like an LLM).** The AI can combine the Predictive (the forecast numbers) and Descriptive (the historical context) analytics to automatically generate human-readable, Prescriptive Recommendations (e.g., "The model predicts an 80% surge in Dengue cases next month; it is highly recommended to mobilize BHWs for immediate mosquito-clearing operations.").

---

## OUR TARGET IMPLEMENTATION STRATEGY (Based on Model #2)
*Per the Adviser's rigorous testing requirements, we will implement the following pipeline natively in Python (`analytics.py`):*

### 1. The 80/20 Train/Test Split (Scientific Validation)
- **The 80% (Training):** We slice the municipal database and give the SARIMA algorithm the first 80% of historical data (e.g., years 2022 to 2024). This allows the algorithm to study the data and learn the seasonal patterns of diseases like Dengue.
- **The 20% (Testing):** We hide the most recent 20% of data (e.g., the year 2025) to act as an "answer key". We ask the algorithm to predict 2025, and then overlay its prediction against the *real* 2025 data. This completely proves to the panel that the system can accurately forecast the future.

### 2. Missing Value Imputation
If BHWs fail to encode data for certain weeks, we use Python's `pandas.interpolate()` to intelligently estimate the missing days, preventing the algorithm from failing due to empty database cells.

### 3. Stationarity Transformation
We use mathematical transformations (like Box-Cox via `Scipy`) to smooth out wild, unpredictable spikes in disease outbreaks. This allows the SARIMA algorithm to lock onto the underlying seasonal trends more efficiently.

---

## MODEL #3: TimesSeriesForecasting (Python Flask Engine)

### Source:
GitHub Repository: `https://github.com/suvvaammmm/TimesSeriesForecasting`

### Mechanism & Pipeline Analysis:
This repository is an absolute goldmine. It is a full Python web app that implements almost exactly what we mapped out in Model #2, but natively in Python!
1. **Core Forecasting:** Uses `statsmodels.tsa.statespace.sarimax` (the exact library we have in our `analytics.py`).
2. **Testing (The 80/20 Split):** Has a dedicated script (`model/backtest/backtest.py`) containing a `backtest()` function that automatically splits data into an 80/20 Training/Testing ratio and calculates the RMSE and MAPE (accuracy metrics).
3. **Advanced Testing (Walk-Forward Validation):** Includes a `rolling_backtest()` function which constantly re-trains the model as new data comes in to simulate real-world conditions.
4. **Data Transformation:** Converts data to Log Returns (`np.log()`) before training to handle wild spikes, ensuring the data is stationary.
5. **Anomaly Detection:** Flags extreme outliers automatically.

### System Compatibility (Can we use it?):
- **Code Compatibility:** **100% YES.** This is written entirely in Python and uses Flask. It matches our exact technology stack.
- **Domain Adaptation Required:** The repository is built for Quantitative Stock Trading (it pulls stock data and generates "BUY/SELL" signals). To use it in Health-Intel, we will easily strip out the stock-trading logic (e.g., Angel One API connections) and keep the core SARIMA math and backtesting scripts to predict *Disease Cases* instead of *Stock Prices*. 

### AI-Powered Recommendations Integration:
This repository already has a "Signals Engine". We can replace its stock "BUY/SELL" signals with our AI-powered descriptive analytics. Instead of generating a "SELL" signal when cases drop, the AI will generate: "Cases are trending downward; recommend scaling back emergency clinic hours."

---

## MODEL #4: Auto-Forecasting (Python Flask API)

### Source:
GitHub Repository: `https://github.com/SughoshKulkarni/Auto-Forecasting`

### Mechanism & Pipeline Analysis:
This is another Python/Flask application built to automate SARIMA forecasting using an uploaded Excel or CSV file. 
1. **Data Cleaning:** It automatically checks if the uploaded data is daily or monthly. If it's daily, it automatically groups and sums the data into monthly totals using `pandas.resample()`.
2. **Model Selection (Grid Search):** Instead of manually picking parameters, it runs a loop to test every possible combination of SARIMA `(p,d,q)` parameters.
3. **Testing Methodology (AIC Scoring):** Unlike Model #2 and #3 which use an 80/20 split, this model tests its accuracy using the **Akaike Information Criterion (AIC)**. It compares the AIC score of every model combination and automatically selects the one with the lowest score (the best fit).
4. **Forecasting:** Once the best model is found, it fits the model to 100% of the data and spits out a forecast with a Confidence Interval (90%, 95%, or 99%) chosen by the user.

### System Compatibility (Can we use it?):
- **Code Compatibility:** **YES.** Like Model #3, this uses Python, Flask, Pandas, and `statsmodels.tsa.statespace.SARIMAX`. We could absolutely use their Grid Search code to automatically find the best SARIMA parameters for our disease data!
- **Testing Compatibility:** **NO.** Your adviser specifically wants rigorous testing. Relying *only* on the AIC score without doing a real-world 80/20 holdout test (like Model #2 and #3 do) is generally frowned upon in academic capstone defenses. 

---

## MODEL #5: Forecasting-ARIMA (Jupyter Notebook Analysis)

### Source:
GitHub Repository: `https://github.com/bennicholson2/Forecasting-ARIMA-Time-Series-Analysis`

### Mechanism & Pipeline Analysis:
This repository contains multiple university-level data science projects exploring ARIMA and SARIMA forecasting (e.g., forecasting ticket sales for a Dinosaur Park, Sunspots, Electricity usage).
1. **Data Cleaning:** It relies heavily on visual exploratory data analysis (EDA), plotting autocorrelation graphs to manually check for seasonality before modeling.
2. **Testing (The 80/20 Split):** It completely matches our exact testing requirements! The code explicitly calculates `split_index = int(len(dinosaur)*0.8)` to force a perfect 80% Training and 20% Testing holdout split.
3. **Evaluation Metrics:** It uses standard Machine Learning metrics like Mean Absolute Error (MAE) and Mean Squared Error (MSE) from `scikit-learn` to grade how accurate the prediction was compared to the hidden 20% test data.

### System Compatibility (Can we use it?):
- **Code Compatibility:** **YES.** This project was written in Python using exactly the same mathematical libraries we are using (`statsmodels` and `pandas`).
- **Testing Compatibility:** **YES.** This repository validates that the 80/20 train/test split is the standard academic method for validating SARIMA models in Python. We can copy their exact testing and grading (MAE/MSE) logic for our Capstone.

---

## OUR TESTING WORKFLOW & TOOLS

To ensure the SARIMA predictive analytics pipeline is scientifically valid and presentable to the panel, we will follow a rigorous 4-step testing and implementation workflow, utilizing professional development tools rather than data-science scratchpads (like Jupyter).

### Tools We Will Use
- **Python / VS Code Terminal:** To isolate and test the raw mathematical logic (80/20 splitting, SARIMA fitting, MAE/MSE/MAPE calculations) in `analytics.py`.
- **Postman / Browser Network Tab:** To test the API bridge between the Node.js backend (`server.js`) and the Python script, ensuring JSON data (like accuracy percentages) passes correctly.
- **Web Browser (Chrome):** The final presentation layer for the panel, rendering the accuracy metrics and AI-powered recommendations on a clean HTML/JS dashboard.

### The 4-Step Implementation Game Plan
1. **The Terminal Test:** We code the 80/20 split and the MAPE (Mean Absolute Percentage Error) logic directly into `analytics.py`. We run it in the VS Code terminal to verify the math is flawless and it successfully calculates accuracy metrics (e.g., 92%).
2. **The API Test:** We configure `server.js` to execute `analytics.py` and capture the resulting JSON package (containing both the forecast numbers and the accuracy metrics).
3. **The Frontend UI Test:** We update the web dashboard (e.g., `admin.html`) with Javascript to fetch the JSON from the Node.js API and render a visual "Model Accuracy" card on the screen.
4. **The Live Mock-Defense:** We conduct an end-to-end test mimicking the live defense: loading the admin dashboard, triggering the forecast, and ensuring the accurate prediction and percentage display instantly on the UI.

---

## MODEL #6: Time-Series-Forecasting-using-ARIMA-SARIMA (PyCharm / Jupyter)

### Source:
GitHub Repository: `https://github.com/javaidiqbal11/Time-Series-Forecasting-using-ARIMA-SARIMA`

### Mechanism & Pipeline Analysis:
This is another Python-based Jupyter Notebook project (built using the PyCharm IDE) that focuses purely on the raw math of ARIMA/SARIMA forecasting.
1. **Testing (Train/Test Split):** Just like the previous models, this repository mathematically proves its accuracy by slicing the dataset into two chunks. The code explicitly uses `train = df.value[:85]` (giving the first 85 rows to the algorithm to study) and `test = df.value[85:]` (hiding the remaining rows to use as an answer key). 
2. **Modeling:** It fits the ARIMA model purely on the training data (`model = ARIMA(train, order=(1, 1, 1))`) and then plots the forecast against the hidden test data.

### System Compatibility (Can we use it?):
- **Code Compatibility:** **YES.** It is written in Python and uses `statsmodels`, which matches our backend stack perfectly.
- **Testing Compatibility:** **YES.** This repository acts as even more proof for your panel that slicing your database into a Training Set and a Testing Set is the universal, industry-standard way to validate a predictive algorithm in Python!

---

## MODEL #7: AlphaPy (Machine Learning Framework)

### Source:
GitHub Repository: `https://github.com/ScottfreeLLC/AlphaPy`

### Mechanism & Pipeline Analysis:
AlphaPy is **not** a simple script or a forecasting algorithm. It is a massive, heavy, open-source **Machine Learning Framework** built on top of `scikit-learn`, `pandas`, and Deep Learning libraries like `Keras`, `xgboost`, and `CatBoost`. It is primarily designed to build stock-market trading systems (MarketFlow) and sports betting algorithms (SportFlow).

### System Compatibility (Can we use it?):
- **Code Compatibility:** Technically yes (it is Python), but practically **NO.** 
- **Academic Conflict:** Your manuscript explicitly states that Health-Intel provides predictive analytics *"without using AI"* and *"does not adopt machine learning methods"*. AlphaPy is a hardcore Machine Learning and Deep Learning framework. If you use it, you will completely contradict your manuscript, and your panel will flag it immediately.
- **Overkill:** You are doing univariate time-series forecasting (Dengue cases over time). You only need the classical `statsmodels` SARIMA formula. Installing a massive AI framework like AlphaPy to do simple forecasting is like buying a Ferrari just to drive to the mailbox.
