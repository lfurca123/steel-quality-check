CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  pin text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL DEFAULT 'SKO',
  product_number text NOT NULL,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  shift text NOT NULL,
  inspector_id uuid REFERENCES public.employees(id),
  inspector_name text NOT NULL,
  f1_value numeric(5,1) NOT NULL,
  f1_result text NOT NULL,
  f2_value numeric(5,1) NOT NULL,
  f2_result text NOT NULL,
  f3_result text NOT NULL,
  zgodne text NOT NULL,
  final_result text NOT NULL
);
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE INDEX inspections_inspected_at_idx ON public.inspections (inspected_at DESC);

INSERT INTO public.employees (full_name, pin) VALUES ('Jan Kowalski','1234'),('Anna Nowak','5678');