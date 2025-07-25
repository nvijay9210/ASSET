const createTableQuery={
    addAsset: `CREATE TABLE IF NOT EXISTS asset (
  asset_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  source_app VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(100) NOT NULL,
  asset_code VARCHAR(50),
  serial_number VARCHAR(100),
  model VARCHAR(100),
  asset_name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50),
  category VARCHAR(50),
  manufacturer VARCHAR(50),
  asset_status VARCHAR(50),
  asset_condition VARCHAR(50),
  quantity INT,
  price DECIMAL(10,2),
  asset_photo VARCHAR(255),
  asset_image_url TEXT,
  description TEXT,
  allocated_to VARCHAR(100),
  purchased_date DATE,
  purchased_by VARCHAR(50),
  vendor_name VARCHAR(100),
  warranty_expiry DATE,
  expired_date DATE,
  invoice_number VARCHAR(50),
  location VARCHAR(100),
  remarks TEXT,
  created_by VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(30),
  updated_time TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_reference (reference_type, reference_id),
  KEY idx_asset_code (asset_code),
  KEY idx_status (asset_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`
  
}

module.exports={createTableQuery}