-- password: Admin@123 (bcrypt hash)
INSERT INTO businesses (id, name, brand_name, primary_color, secondary_color, subscription_expires_at)
VALUES
  (1, 'Ramadan Demo Business', 'Ramadan Pro', '#0b2a55', '#c9a227', NOW() + INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (business_id, username, password_hash, role)
VALUES
  (1, 'superadmin', '$2a$10$b8dt3Jd9COK5V1ZWrHj8nuoNufVvq1dUVuYPJJvEcxMx80/m1eRky', 'SUPER_ADMIN'),
  (1, 'admin', '$2a$10$b8dt3Jd9COK5V1ZWrHj8nuoNufVvq1dUVuYPJJvEcxMx80/m1eRky', 'ADMIN'),
  (1, 'staff', '$2a$10$b8dt3Jd9COK5V1ZWrHj8nuoNufVvq1dUVuYPJJvEcxMx80/m1eRky', 'STAFF')
ON CONFLICT (username) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  business_id = EXCLUDED.business_id;
