-- One trial per browser device (anti multi-email abuse)

CREATE TABLE IF NOT EXISTS core.signup_device_links (
    device_hash VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_device_links_user
    ON core.signup_device_links(user_id);
