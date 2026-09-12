# Machine Learning Pipeline & Analytics Strategy

This document serves as the official reference for the HEALTH-INTEL panel defense regarding the implementation of AI and Data Science methodologies.

## 1. The Analytics Flow: Descriptive to Predictive
A core architectural principle of this system is that **Descriptive Analytics must precede Predictive Analytics**.
* **Descriptive Analytics (The "What"):** The system first analyzes historical and real-time data to provide automated insights on current conditions (e.g., "Active cases are down 10% from last month, but Barangay Caliban shows an abnormal concentration of Typhoid").
* **Predictive Analytics (The "Future"):** Only after establishing the descriptive baseline does the system utilize SARIMA modeling to forecast future trajectories and recommend pre-emptive actions (e.g., "Dengue cases predicted to rise by 15% next month; deploy fogging operations to Blumentritt").

## 2. Dataset Strategy (Morbidity Focus)
* **Inclusion:** The dataset strictly focuses on infectious/communicable morbidity (e.g., Dengue, Cholera, Typhoid, Influenza) as these exhibit seasonal patterns required for time-series forecasting.
* **Exclusion:** Non-seasonal anomalies (e.g., Animal Bites, Physical Injuries, Accidents) are excluded from the forecasting pipeline to prevent model confusion.
* **Data Augmentation (50/50 Split):** To combat data sparsity in rural LGUs, the final dataset utilizes a 50/50 split of real-world collected data and synthetically generated (dummy) data that mirrors local seasonal trends. This ensures the dataset is large enough to prevent model underfitting.

## 3. The Machine Learning Pipeline
The system follows a standard 3-phase Machine Learning pipeline:

### Phase 1: Data Cleaning & Preprocessing
* Raw FHSIS data is ingested.
* Irrelevant data (accidents) is filtered out.
* Missing chronological months are filled with zero-values to maintain a perfect time-series sequence.

### Phase 2: Model Training (80/20 Split)
* **The Train/Test Split:** The dataset is divided using the industry-standard **80/20 split** (80% for training, 20% for testing/validation).
  * *Example Calculation:* If the LGU provides 3 years of monthly data (36 months total):
  * **80% Training:** The first 29 months of data are fed into the AI so it can "study" the seasonal patterns.
  * **20% Testing:** The final 7 months are hidden from the AI to test its accuracy.
* **Training:** The SARIMA algorithm uses the 80% training data to "learn" the auto-regressive momentum (AR) and yearly seasonal cycles (S).

### Phase 3: Testing & Validation
* **Validation:** The model is asked to predict the remaining 20% of the timeline (data it has never seen).
* **Error Checking:** The system compares the AI's predictions against the actual 20% testing data to calculate the error rate (e.g., RMSE). Once validated, the model is cleared for deployment on the MHO dashboard.
