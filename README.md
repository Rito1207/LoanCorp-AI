# 🏛️ LoanCorp API — Зээлийн газрын систем симуляц

> Зээлийн байгууллагын дотоод системийг симуляц хийсэн RESTful API сервер

---

## 🎯 Зорилго

Энэхүү API нь **зээлийн газрын дотоод системийн загвар** бөгөөд `chatbotAI` системээс **Bearer token-оор** холбогдож, бодит цагийн зээлийн мэдээллийг авах боломжийг олгоно.

## ✨ Боломжууд

- 🔐 **Bearer token authentication**
- 👥 Харилцагчийн мэдээлэл удирдах
- 💰 Зээлийн данс удирдах
- 🏦 Олон банкны данс таних (Хаан банк, Голомт банк)
- ⏰ Хугацаа хэтрэлт автомат тооцоо
- 📊 Хэрэглэгчийн ангилал (A/B/C/D/E)

## 🛠️ Технологи

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (production) / SQLite (development)
- **Authentication:** Bearer Token
- **Port:** 4000

## 🚀 Суулгах

```bash
npm install
npm start
```

`.env` файл үүсгэж дараах утгуудыг оруулна:

```env
PORT=4000
API_TOKEN=your_secret_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/loancorp
```

## 🔗 API Endpoints

| Method | Endpoint | Тайлбар |
|---|---|---|
| `GET` | `/api/customers/:registerNumber` | Харилцагчийн мэдээлэл |
| `GET` | `/api/loans/:customerId` | Зээлийн жагсаалт |
| `GET` | `/api/loans/detail/:loanId` | Зээлийн дэлгэрэнгүй |
| `POST` | `/api/loans/request` | Зээлийн хүсэлт |

Бүх endpoint нь `Authorization: Bearer <token>` header шаардана.

## 📞 Хөгжүүлэгч

** Алтангэрэл **

** Холбогдох дугаар : 88045712 **


📧 giko.rito88@gmail.com  
🐙 [GitHub: Rito1207](https://github.com/Rito1207)

---

## 📜 Лиценз

© 2026 All rights reserved. Хувийн төсөл.

## 🔌 Холболт

Энэ API нь [Chatbot-AI](https://github.com/Rito1207/Chatbot-AI) системтэй холбогдоно: