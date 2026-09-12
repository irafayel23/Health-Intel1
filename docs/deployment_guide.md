# Cloud Deployment Guide (Beta Testing)

This document outlines the professional deployment strategy to make the HEALTH-INTEL system accessible on the public internet 24/7.

## Architecture Overview
* **Database:** Aiven.io (Free Cloud MySQL)
* **Hosting:** Render.com (Free Web Service via Docker)
* **Version Control:** GitHub

---

## Step 1: Cloud Database Setup (Aiven.io)
Your local XAMPP database (`localhost`) must be migrated to the cloud so the internet can access it.

1. Go to [Aiven.io](https://aiven.io/) and sign up for a free account.
2. Create a new **Free MySQL** service.
3. Once created, Aiven will provide you with **Connection Details** (Service URI, Host, Port, User, Password).
4. **Migrate Data:**
   * Open your local XAMPP `phpMyAdmin`.
   * Export the `health_intel` database as a `.sql` file.
   * Import this `.sql` file into your new Aiven database using a tool like MySQL Workbench, DBeaver, or the Aiven Console.

---

## Step 2: Code Preparation (Cloud-Ready)
Before pushing the code to GitHub, we must prepare the environment files. (The AI Assistant will help generate these).

### A. Environment Variables (`.env`)
We must remove `root` and `localhost` from `server.js` and `analytics.py`. Create a `.env` file in the root folder:
```env
DB_HOST=your_aiven_host_url
DB_USER=your_aiven_username
DB_PASSWORD=your_aiven_password
DB_NAME=health_intel
DB_PORT=your_aiven_port
```

### B. Python Dependencies (`requirements.txt`)
Render needs to know which AI libraries to install. Create `requirements.txt`:
```txt
pandas
numpy
mysql-connector-python
statsmodels
```

### C. The Dockerfile
Because the system runs **Node.js** but executes **Python** via child processes for SARIMA forecasting, standard hosting will crash. We must provide a `Dockerfile` to install both environments simultaneously:
```dockerfile
# Start with a Node.js base image
FROM node:18-bullseye

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install -r requirements.txt --break-system-packages

# Copy all project files
COPY . .

# Expose the port
EXPOSE 3000

# Start the Node.js server
CMD ["node", "test/server.js"]
```

---

## Step 3: Deployment (Render.com)
1. Upload the entire project folder (including the new `.env`, `requirements.txt`, and `Dockerfile`) to a new public or private repository on **GitHub**.
2. Go to [Render.com](https://render.com/) and create a free account.
3. Click **New +** > **Web Service**.
4. Connect your GitHub account and select your repository.
5. Render will automatically detect the `Dockerfile`.
6. **Important:** In the Render dashboard, go to the "Environment" tab and add all the variables from your `.env` file.
7. Click **Deploy**. Render will build the hybrid Node/Python environment and provide a public URL (e.g., `https://health-intel.onrender.com`).

*System is now live for Beta Testing.*
