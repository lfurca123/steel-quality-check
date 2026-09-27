CREATE TABLE public.sko_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product text NOT NULL DEFAULT 'SKO',
  product_number text NOT NULL,
  inspected_at timestamp with time zone NOT NULL DEFAULT now(),
  shift text NOT NULL,
  inspector_id uuid REFERENCES public.employees(id),
  inspector_name text NOT NULL,
  f1_value numeric NOT NULL,
  f1_result text NOT NULL,
  f2_value numeric NOT NULL,
  f2_result text NOT NULL,
  f3_result text NOT NULL,
  zgodne text NOT NULL,
  final_result text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX sko_inspections_product_number_idx ON public.sko_inspections (product_number);
CREATE INDEX sko_inspections_inspected_at_idx ON public.sko_inspections (inspected_at DESC);

GRANT SELECT ON public.sko_inspections TO authenticated;
GRANT ALL ON public.sko_inspections TO service_role;

ALTER TABLE public.sko_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can read sko inspections"
ON public.sko_inspections
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.sko_inspections
  (id, product, product_number, inspected_at, shift, inspector_id, inspector_name,
   f1_value, f1_result, f2_value, f2_result, f3_result, zgodne, final_result)
SELECT id, product, product_number, inspected_at, shift, inspector_id, inspector_name,
   f1_value, f1_result, f2_value, f2_result, f3_result, zgodne, final_result
FROM public.inspections;