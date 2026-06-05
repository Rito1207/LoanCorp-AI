// ═══════════════════════════════════════════════════
// 🔐 AUTHENTICATION — Олон партнер API key дэмждэг
// ═══════════════════════════════════════════════════
// Ажиллах дараалал:
//   1. Authorization header-ээс key авна
//   2. Эхлээд PARTNER key мөн эсэхийг hash-аар шалгана
//      → олдвол: идэвхтэй эсэх, rate limit, scope шалгана
//   3. Партнер биш бол ХУУЧИН API_TOKEN-той тулгана
//      (chatbot хэвээр ажиллана — backward compatible)
//   4. Аль нь ч биш бол → 403
//
// req.partner объектод тухайн партнерын мэдээллийг хийнэ
// (дараагийн route-ууд хэн ирснийг мэднэ — "хольж хутгахгүй")
// ═══════════════════════════════════════════════════

const db = require('../database/db');
const { hashApiKey, extractKey } = require('../services/apiKeys');

// ── Rate limit тоолуур (санах ойд, партнер тус бүрээр) ──
// { partnerId: { count, resetAt } }
const rateBuckets = new Map();

function checkRateLimit(partnerId, limitPerMin) {
  const now = Date.now();
  let bucket = rateBuckets.get(partnerId);

  // Шинэ цонх эхлүүлэх (минут өнгөрсөн бол)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60000 };
    rateBuckets.set(partnerId, bucket);
  }

  bucket.count++;
  return bucket.count <= limitPerMin;
}

// ── Үндсэн authentication middleware ──────────────
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const key = extractKey(authHeader);

  if (!key) {
    return res.status(401).json({
      error: 'Token хэрэгтэй',
      message: 'Authorization header дутуу. Bearer token илгээнэ үү.'
    });
  }

  // ── 1. ПАРТНЕР key мөн эсэхийг шалгах ──
  try {
    const keyHash = hashApiKey(key);
    const partner = await db.findPartnerByKeyHash(keyHash);

    if (partner) {
      // Идэвхтэй эсэх
      if (!partner.is_active) {
        await logRequest(req, res, partner.partner_id, 403);
        return res.status(403).json({
          error: 'Партнер идэвхгүй',
          message: 'Таны API key түр хаагдсан байна. Холбоо барина уу.'
        });
      }

      // Rate limit шалгах
      if (!checkRateLimit(partner.partner_id, partner.rate_limit_per_min)) {
        await logRequest(req, res, partner.partner_id, 429);
        return res.status(429).json({
          error: 'Хэт олон хүсэлт',
          message: `Та минутэд ${partner.rate_limit_per_min} хүсэлтийн хязгаараас хэтэрлээ. Түр хүлээнэ үү.`
        });
      }

      // Scope шалгах (бичих эрхтэй эсэх — POST хүсэлтэд)
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (isWrite && !partner.allowed_scopes.includes('write')) {
        await logRequest(req, res, partner.partner_id, 403);
        return res.status(403).json({
          error: 'Эрх хүрэлцэхгүй',
          message: 'Таны API key зөвхөн унших эрхтэй (read-only).'
        });
      }

      // ✅ Партнер баталгаажлаа — мэдээллийг req-д хийнэ
      req.partner = {
        partner_id: partner.partner_id,
        name: partner.name,
        scopes: partner.allowed_scopes
      };

      // Статистик шинэчлэх + бүртгэх (await хийхгүй — хурдан)
      db.touchPartner(partner.partner_id).catch(() => {});
      logRequest(req, res, partner.partner_id, null).catch(() => {});

      return next();
    }
  } catch (err) {
    console.error('❌ Партнер шалгах алдаа:', err.message);
    // Алдаа гарвал legacy token руу шилжинэ (доош үргэлжилнэ)
  }

  // ── 2. ХУУЧИН API_TOKEN (chatbot) — backward compatible ──
  if (key === process.env.API_TOKEN) {
    req.partner = {
      partner_id: 'legacy_chatbot',
      name: 'Chatbot (legacy token)',
      scopes: 'read,write'
    };
    logRequest(req, res, 'legacy_chatbot', null).catch(() => {});
    return next();
  }

  // ── 3. Аль нь ч биш — татгалзах ──
  await logRequest(req, res, null, 403);
  return res.status(403).json({
    error: 'Token буруу',
    message: 'Таны API key буруу эсвэл бүртгэлгүй байна.'
  });
}

// ── Хүсэлтийг бүртгэх (audit log) ────────────────
async function logRequest(req, res, partnerId, forcedStatus) {
  try {
    const status = forcedStatus !== null ? forcedStatus : res.statusCode;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await db.logApiRequest({
      partner_id: partnerId,
      method: req.method,
      path: req.path,
      status_code: status,
      ip_address: String(ip).split(',')[0].trim()
    });
  } catch (err) {
    // Бүртгэл амжилтгүй болсон ч үндсэн ажиллагаа зогсохгүй
  }
}

module.exports = { authenticate };
