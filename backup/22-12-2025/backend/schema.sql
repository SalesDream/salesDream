-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) DEFAULT '',
  email VARCHAR(190) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads table (matches frontend columns)
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact VARCHAR(120), 
  name VARCHAR(120), 
  phone VARCHAR(30),
  median_income INT,
  address VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(10),
  zip VARCHAR(20)
);
