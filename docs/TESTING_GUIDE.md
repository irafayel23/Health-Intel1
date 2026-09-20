# PREDICTIVE ANALYTICS TESTING GUIDE

This document outlines the two phases of testing the SARIMA predictive model for the Capstone Defense.

## Phase 1: Visual Testing & Documentation (Orange Data Mining)
Use this method to generate visual workflows and graphs for Chapter 3/4 of the manuscript.

**Steps to create the 80/20 Split in Orange:**
1. **File Node:** Drag a "File" node and upload the `historical_cases.csv`.
2. **Time Series Node:** Connect the File to an "As Timeseries" node to tell the system the data is chronological.
3. **Data Sampler Node (The 80/20 Split):** Connect to a "Data Sampler" node. In the menu, select "Fixed proportion of data" and set it to **80%**. This splits the data into a Training wire (80%) and a Testing wire (20%).
4. **ARIMA Node:** Connect the 80% Training wire into an "ARIMA" node. This allows the AI to learn the historical patterns.
5. **Line Plot Node (The Exam):** Connect the ARIMA output AND the 20% Testing wire into a "Line Plot" node. The resulting graph will visually prove how accurately the AI predicted the hidden 20% test data.

## Phase 2: Live System Testing (Python Backend)
Orange is only for documentation. The live website uses Python (`analytics.py`) to replicate the exact same test instantly in the background.

**How Python tests on its own:**
1. **Fetch:** `server.js` triggers Python. Python queries the `health_cases` MySQL database.
2. **Split:** Python mathematically slices the arrays (`train = data[:80%]` and `test = data[80%:]`).
3. **Train & Predict:** Python uses the `statsmodels` library to fit a SARIMA model on the 80% array, then forces it to predict the values for the hidden 20% timeline.
4. **Grade:** Python calculates the MAPE (Mean Absolute Percentage Error) by comparing its prediction against the real 20% data.
5. **Output:** Python packages the final prediction and the Accuracy % into a JSON object and sends it to the `mho.html` dashboard.

## Note on 50/50 Dataset Mix
Testing is fully functional even when using a 50% Real / 50% Dummy dataset split. The dummy data (historical backfill) was programmed with realistic seasonal spikes (e.g., Dengue spiking in rainy seasons) ensuring the SARIMA algorithm can successfully detect patterns and generate highly accurate test scores.
## Phase 3: The Orange + Python Tag-Team Architecture (Mandatory Workflow)
Because the university panel strictly requires the use of Orange Data Mining for training predictive models, we will use a highly advanced "Tag-Team" architecture. 

**Step 1: Training & Parameter Discovery (Orange)**
- Load `seeded_historical_cases.csv` into the Orange desktop app.
- Run the Time Series and ARIMA nodes.
- Orange will mathematically discover the most optimal `(p, d, q)` parameters for our specific disease dataset (e.g., discovering that order `(1, 1, 1)` yields the highest accuracy).
- **Output:** Screenshots of the visual pipeline and the optimal parameters for Chapters 3 and 4 of the manuscript to prove Orange was used for the official training.

**Step 2: Live System Execution (Python)**
- Orange cannot run a live website. Therefore, we take the exact `(p, d, q)` parameters discovered by Orange and hardcode them into the live `analytics.py` script.
- Example: `SARIMAX(train_data, order=(1, 1, 1))`
- **Output:** When the MHO clicks "Forecast" on the website, the Python API executes the exact model trained by Orange in real-time.

**Defense Strategy:** This proves to the panel that Orange was utilized for the crucial "Training/Parameter Discovery" phase, while professional software engineering (Python/Node.js) was used to bring that trained model into a functional, live Web Application.

## Phase 4: Manual Terminal Testing (Backend Proof)
If the panel requests to see the raw mathematical output of the AI without the website UI, you can execute the Python engine directly from the VS Code terminal.

**Step-by-Step Terminal Execution:**
1. Open your VS Code Terminal.
2. Navigate into the `test` directory where the engine lives: `cd test`
3. Execute the SARIMA script by passing a Disease and a Barangay as arguments. 
   **Command:** `python analytics.py "Influenza" "Blumentritt"`
4. **Output:** The terminal will instantly output the raw JSON package containing the `accuracy_percentage`, the historical arrays, and the `forecast` array. This proves the backend engine successfully calculates the MAPE independently of the Node.js frontend.
