-- Fix incorrect seed hash; sets demo users password to: Admin@123
UPDATE users
SET password_hash = '$2a$10$b8dt3Jd9COK5V1ZWrHj8nuoNufVvq1dUVuYPJJvEcxMx80/m1eRky'
WHERE username IN ('superadmin', 'admin', 'staff');
