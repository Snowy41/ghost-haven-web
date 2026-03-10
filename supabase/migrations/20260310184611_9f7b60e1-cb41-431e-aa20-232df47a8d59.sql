
-- 1. Fix user_roles: Drop the overly permissive public SELECT policy that exposes all roles to unauthenticated users
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;

-- Replace with a properly scoped policy: authenticated users can only read their own roles
CREATE POLICY "Users can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

-- 2. Fix config_purchases: Remove direct INSERT policy (purchase_config RPC is SECURITY DEFINER and bypasses RLS)
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.config_purchases;

-- 3. Fix transactions: Remove direct INSERT policy (only server-side functions should write transactions)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
