// ═══════════════════════════════════════════════════
// 🔑 API KEY УДИРДЛАГА
// ═══════════════════════════════════════════════════
// Партнер байгууллагуудад зориулсан API key үүсгэх,
// hash хийх, шалгах туслах функцууд.
//
// Аюулгүй байдлын зарчим:
//   - API key-г бүтнээр нь database-д ХАДГАЛАХГҮЙ
//   - Зөвхөн SHA-256 hash-ийг хадгална (нууц үг шиг)
//   - Key-г үүсгэх үед НЭГ Л УДАА харуулна, дараа нь сэргээх боломжгүй
// ═══════════════════════════════════════════════════

const crypto = require('crypto');

// ── Шинэ API key үүсгэх ──────────────────────────
// Жишээ үр дүн:
//   key:    'pcmall_live_a8f3d9e2b1c4...' (партнерт өгнө)
//   prefix: 'pcmall_a8f3'                  (database-д харагдах хэсэг)
//   hash:   'd4e5f6...'                    (database-д хадгална)
function generateApiKey(partnerId) {
  // 32 байт санамсаргүй (256 бит) — таамаглах боломжгүй
  const randomPart = crypto.randomBytes(24).toString('hex');
  const fullKey = `${partnerId}_live_${randomPart}`;

  const hash = hashApiKey(fullKey);
  const prefix = `${partnerId}_${randomPart.substring(0, 4)}`;

  return { fullKey, hash, prefix };
}

// ── Key-г hash болгох (хадгалах болон шалгахад) ──
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ── Authorization header-ээс key салгаж авах ──
// "Bearer pcmall_live_a8f3..." → "pcmall_live_a8f3..."
function extractKey(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  extractKey
};
