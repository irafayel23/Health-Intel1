# Database Design (MySQL)

## Schema Definition
The core schema is defined below. 
> [!WARNING]
> See `CHANGELOG.md` regarding discrepancies between this official schema and the prototype Node.js server.

### 1. `users` (Identity & Access Management)
Stores all personnel (BHW, MHO, Admins).
```sql
CREATE TABLE users (
    system_id VARCHAR(50) PRIMARY KEY, -- e.g., 'SYS-1001'
    employee_hr_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('BHW', 'MHO', 'LGU Admin', 'Super Admin') NOT NULL,
    assigned_barangay VARCHAR(100) NULL, -- Null for MHO/Admins
    status ENUM('Pending', 'Active', 'Suspended', 'Archived') DEFAULT 'Pending',
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. `disease_registry` (Master Reference)
The centralized list of valid diseases.
```sql
CREATE TABLE disease_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    category ENUM('Morbidity', 'Mortality') NOT NULL,
    classification ENUM('Standard', 'High Risk') NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `patient_records` (Transactional Data)
Stores individual health encodings submitted by BHWs.
```sql
CREATE TABLE patient_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birthdate DATE NOT NULL,
    age INT NOT NULL,
    barangay VARCHAR(100) NOT NULL,
    purok VARCHAR(100) NOT NULL,
    disease VARCHAR(150) NOT NULL, -- Matched to disease_registry.name
    remarks TEXT NULL,
    status ENUM('Active', 'Cleared') DEFAULT 'Active',
    is_archived BOOLEAN DEFAULT FALSE,
    encoded_by VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (encoded_by) REFERENCES users(system_id)
);
```

### 4. `audit_logs` (Security)
Append-only ledger automatically recording who did what and when.
```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(150) NOT NULL,
    details TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- No strict foreign key for user_id to retain history if user is deleted.
);
```
