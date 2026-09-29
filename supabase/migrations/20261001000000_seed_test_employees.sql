-- Seed test employees with predefined PINs for development and testing
-- WARNING: These are test credentials only. Remove or change before production deployment.

INSERT INTO public.employees (pin, full_name, role)
VALUES
  ('1234', 'Jan Kowalski', 'inspector'),
  ('5678', 'Anna Nowak', 'inspector'),
  ('0000', 'Admin Test', 'admin')
ON CONFLICT (pin) DO NOTHING;
