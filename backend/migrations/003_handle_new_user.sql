-- Create profile row when a new user signs up (auth.users INSERT).
-- Run after 001_core_tables.sql. Ensures every user has a profile without app logic.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      trim((NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name')),
      ''
    ),
    now(),
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log and re-raise so signup fails visibly; fix trigger before retry
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Creates public.profiles row on signup; required by RLS for profile access.';
