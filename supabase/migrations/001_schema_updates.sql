-- =============================================================================
-- 1. TAGS: Adicionar coluna color (text, default '#000000')
-- =============================================================================
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#000000';

-- =============================================================================
-- 2. PROFILES: Garantir tabela para dados do usuário (nome, avatar, cargo)
-- Vinculada a auth.users via id
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  avatar text,
  cargo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: usuário só acessa o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_updated_at();

-- =============================================================================
-- 3. CAMPAIGN_RESPONSES: Respostas de NPS por campanha/contato
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaign_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  score int NOT NULL CHECK (score >= 0 AND score <= 10),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- Índices para consultas do relatório
CREATE INDEX IF NOT EXISTS idx_campaign_responses_campaign_id
  ON campaign_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_contact_id
  ON campaign_responses(contact_id);

-- RLS: leitura para usuários autenticados (ajuste conforme sua política)
ALTER TABLE campaign_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_responses_select" ON campaign_responses;
CREATE POLICY "campaign_responses_select" ON campaign_responses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "campaign_responses_insert" ON campaign_responses;
CREATE POLICY "campaign_responses_insert" ON campaign_responses
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "campaign_responses_update" ON campaign_responses;
CREATE POLICY "campaign_responses_update" ON campaign_responses
  FOR UPDATE TO anon, authenticated USING (true);

-- FKs opcionais: descomente se suas tabelas announcements e contacts existirem.
-- ALTER TABLE campaign_responses ADD CONSTRAINT fk_campaign_responses_campaign
--   FOREIGN KEY (campaign_id) REFERENCES announcements(id) ON DELETE CASCADE;
-- ALTER TABLE campaign_responses ADD CONSTRAINT fk_campaign_responses_contact
--   FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
