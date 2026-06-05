// ═══════════════════════════════════════════════════
// 🤝 ПАРТНЕР БҮРТГЭХ ХЭРЭГСЭЛ (CLI)
// ═══════════════════════════════════════════════════
// PC-MALL гэх мэт шинэ байгууллагад API key үүсгэж өгөхөд
// ашиглана.
//
// АЖИЛЛУУЛАХ:
//   node register-partner.js <partner_id> "<нэр>" [email] [rate_limit] [scopes]
//
// ЖИШЭЭ:
//   node register-partner.js pcmall "PC-MALL ХХК" info@pcmall.mn 120 read,write
//   node register-partner.js unitel "Юнител ХХК" api@unitel.mn
//
// ⚠️ Үр дүнд гарах API key-г НЭГ Л УДАА харуулна.
//    Тухайн партнерт аюулгүйгээр дамжуулаад, хадгалаарай.
//    Дахин сэргээх боломжгүй (зөвхөн hash хадгалагдана).
// ═══════════════════════════════════════════════════

require('dotenv').config();
const db = require('./database/db');
const { generateApiKey } = require('./services/apiKeys');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
❌ Параметр дутуу байна.

ХЭРЭГЛЭЭ:
  node register-partner.js <partner_id> "<нэр>" [email] [rate_limit] [scopes]

ЖИШЭЭ:
  node register-partner.js pcmall "PC-MALL ХХК" info@pcmall.mn 120 read,write
  node register-partner.js unitel "Юнител ХХК"

ТАЙЛБАР:
  partner_id  — латин жижиг үсэг, тоо (жишээ: pcmall, unitel)
  нэр         — байгууллагын бүтэн нэр (хашилтан дотор)
  email       — холбоо барих и-мэйл (заавал биш)
  rate_limit  — минутэд хэдэн хүсэлт (default: 60)
  scopes      — read эсвэл read,write (default: read,write)
`);
    process.exit(1);
  }

  const [partnerId, name, email, rateLimit, scopes] = args;

  // partner_id зөв форматтай эсэхийг шалгах
  if (!/^[a-z0-9_]+$/.test(partnerId)) {
    console.error('❌ partner_id зөвхөн латин жижиг үсэг, тоо, доогуур зураас агуулна (жишээ: pcmall)');
    process.exit(1);
  }

  try {
    // API key үүсгэх
    const { fullKey, hash, prefix } = generateApiKey(partnerId);

    // Database-д хадгалах
    await db.createPartner({
      partner_id: partnerId,
      name: name,
      contact_email: email || null,
      api_key_hash: hash,
      api_key_prefix: prefix,
      rate_limit_per_min: rateLimit ? parseInt(rateLimit) : 60,
      allowed_scopes: scopes || 'read,write'
    });

    console.log(`
╔════════════════════════════════════════════════════╗
║  ✅ ПАРТНЕР АМЖИЛТТАЙ БҮРТГЭГДЛЭЭ                    ║
╚════════════════════════════════════════════════════╝

  🏢 Байгууллага: ${name}
  🆔 Partner ID:  ${partnerId}
  ⚡ Rate limit:  ${rateLimit || 60} хүсэлт/мин
  🔓 Эрх:         ${scopes || 'read,write'}

╔════════════════════════════════════════════════════╗
║  🔑 API KEY (НЭГ Л УДАА ХАРАГДАНА!)                 ║
╚════════════════════════════════════════════════════╝

  ${fullKey}

  ⚠️  ЭНЭ KEY-Г ОДОО ХУУЛЖ АВААРАЙ!
  ⚠️  Дахин харуулах боломжгүй (зөвхөн hash хадгалагдсан).
  📧  ${name}-д аюулгүй сувгаар дамжуулна уу.

  Тэд ингэж ашиглана:
    Authorization: Bearer ${fullKey}
`);

    process.exit(0);
  } catch (err) {
    if (err.message.includes('duplicate') || err.code === '23505') {
      console.error(`❌ "${partnerId}" partner_id аль хэдийн бүртгэлтэй байна. Өөр нэр сонгоно уу.`);
    } else {
      console.error('❌ Алдаа:', err.message);
    }
    process.exit(1);
  }
}

main();
