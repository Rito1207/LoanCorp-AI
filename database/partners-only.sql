-- ═══════════════════════════════════════════════════
-- 🤝 PARTNER (API KEY) СИСТЕМ — АЮУЛГҮЙ хувилбар
-- ═══════════════════════════════════════════════════
--
-- ⚠️ Энэ файл нь DROP TABLE АШИГЛАХГҮЙ —
--    тиймээс одоо байгаа ямар ч өгөгдлийг УСТГАХГҮЙ.
--    Байгаа хүснэгтийг алгасч, байхгүйг л үүсгэнэ.
--
-- 📍 ХЭРХЭН АЖИЛЛУУЛАХ:
--    Энэ файлыг loancorp-ийн database фолдерт хадгалаад:
--      psql $DATABASE_URL -f database/partners-only.sql
--
--    Эсвэл локал дээр:
--      psql -U postgres -d loancorp_db -f database/partners-only.sql
--
--    Хэдэн ч удаа ажиллуулсан АЮУЛГҮЙ — давхар үүсгэхгүй.
-- ═══════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- Партнер байгууллагууд (PC-MALL, Unitel гэх мэт)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  partner_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,

  api_key_hash TEXT UNIQUE NOT NULL,
  api_key_prefix TEXT NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  rate_limit_per_min INTEGER DEFAULT 60,
  allowed_scopes TEXT DEFAULT 'read,write',

  total_requests INTEGER DEFAULT 0,
  last_request_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- API хүсэлтийн бүртгэл (audit log)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS api_request_logs (
  id SERIAL PRIMARY KEY,
  partner_id TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Индексүүд (IF NOT EXISTS — давхар үүсгэхгүй)
-- ═══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_partners_key_hash ON partners(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_logs_partner ON api_request_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON api_request_logs(created_at);
