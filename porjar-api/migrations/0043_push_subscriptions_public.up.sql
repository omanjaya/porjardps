-- Allow anonymous (public) push subscriptions by making user_id nullable
ALTER TABLE push_subscriptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN user_id DROP DEFAULT;
