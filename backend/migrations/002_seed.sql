-- password: Admin@123 (bcrypt hash)
INSERT INTO businesses (id, name, brand_name, primary_color, secondary_color, subscription_expires_at)
VALUES
  (1, 'Ramadan Demo Business', 'Ramadan Pro', '#0b2a55', '#c9a227', NOW() + INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (business_id, username, password_hash, role)
VALUES
  (1, 'superadmin', '$2a$10$8f7FGYv6zux1DPZWS9Vy2e5hUQJfUjUlQxw6dyJgbN4S9rbAiSlz2', 'SUPER_ADMIN'),
  (1, 'admin', '$2a$10$8f7FGYv6zux1DPZWS9Vy2e5hUQJfUjUlQxw6dyJgbN4S9rbAiSlz2', 'ADMIN'),
  (1, 'staff', '$2a$10$8f7FGYv6zux1DPZWS9Vy2e5hUQJfUjUlQxw6dyJgbN4S9rbAiSlz2', 'STAFF')
ON CONFLICT (username) DO NOTHING;

