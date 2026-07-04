# 🏪 DzPos — نظام نقطة البيع الجزائري

<div align="center">

**نظام نقطة بيع (POS) متكامل للأعمال الصغيرة في الجزائر**
يدعم الدفع النقدي، ببطاقة CIB/EDAHABIA عبر SofizPay، وإدارة المخزون والتقارير اليومية.

🔗 **التطبيق المباشر:** [dzpos.netlify.app](https://dzpos.netlify.app/)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Turso](https://img.shields.io/badge/Database-Turso%20(LibSQL)-4FF8D2)](https://turso.tech)
[![SofizPay](https://img.shields.io/badge/Payment-SofizPay-green)](https://sofizpay.com)
[![Netlify](https://img.shields.io/badge/Deployed-Netlify-00C7B7?logo=netlify)](https://dzpos.netlify.app)

</div>

---

## 📋 جدول المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [المميزات](#-المميزات)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [هيكل المشروع](#-هيكل-المشروع)
- [التثبيت والتشغيل](#-التثبيت-والتشغيل)
- [الدفع عبر SofizPay](#-الدفع-عبر-sofizpay)
- [متغيرات البيئة](#-متغيرات-البيئة)
- [API Routes](#-api-routes)
- [النشر على Netlify](#-النشر-على-netlify)

---

## 🌟 نظرة عامة

**DzPos** هو تطبيق ويب لنقطة البيع (Point of Sale) مُصمَّم خصيصاً للأعمال الصغيرة والمتوسطة في الجزائر. يعمل مباشرةً من المتصفح دون الحاجة لتثبيت أي برنامج، ويوفر بيئة متعددة المستخدمين حيث يمكن لكل تاجر إدارة متجره بشكل مستقل.

---

## ✨ المميزات

| الميزة | الوصف |
|--------|-------|
| 🛒 **سجل المبيعات** | إضافة المنتجات للسلة وإتمام عمليات البيع بسرعة |
| 💳 **دفع متعدد الطرق** | نقدي، بطاقة، أو عبر SofizPay (CIB / EDAHABIA) |
| 📦 **إدارة المخزون** | إضافة وتعديل وحذف المنتجات مع تتبع الكميات |
| 📊 **التقارير اليومية** | تقارير إغلاق اليوم مع تفصيل طرق الدفع |
| 🧾 **الفواتير الإلكترونية** | طباعة وعرض الفاتورة مع رمز QR للطلب |
| 👤 **تتبع الديون** | تسجيل الديون وتسويتها لاحقاً نقداً أو إلكترونياً |
| 🔐 **نظام متعدد المستخدمين** | حساب منفصل لكل تاجر مع بيانات معزولة تماماً |
| 🌙 **وضع مظلم** | واجهة مصممة بالكامل في الوضع المظلم |

---

## 🛠 التقنيات المستخدمة

- **[Next.js 16](https://nextjs.org)** — إطار عمل React مع App Router
- **[React 19](https://react.dev)** — واجهة المستخدم
- **[Turso / LibSQL](https://turso.tech)** — قاعدة بيانات SQLite موزّعة
- **[SofizPay SDK](https://sofizpay.com)** — بوابة الدفع الجزائرية
- **[Lucide React](https://lucide.dev)** — أيقونات
- **[qrcode.react](https://npmjs.com/package/qrcode.react)** — توليد رموز QR
- **[Tailwind CSS 4](https://tailwindcss.com)** — تنسيق CSS

---

## 📂 هيكل المشروع

```
DzPos/
├── src/
│   ├── app/
│   │   ├── page.js              # الصفحة الرئيسية (Landing Page)
│   │   ├── layout.js            # Layout عام + SEO metadata
│   │   ├── globals.css          # التنسيقات العامة
│   │   ├── login/               # صفحة تسجيل الدخول
│   │   ├── signup/              # صفحة إنشاء الحساب (مع SofizPay key)
│   │   ├── dashboard/           # لوحة التحكم الرئيسية
│   │   │   └── page.js          # POS + إدارة + تقارير + إعدادات
│   │   └── api/
│   │       ├── auth/            # تسجيل الدخول / إنشاء الحساب
│   │       ├── checkout/        # معالجة عمليات البيع وبدء الدفع
│   │       ├── products/        # إدارة المنتجات
│   │       ├── reports/         # تقارير اليوم وإغلاق الجلسة
│   │       ├── debts/           # إدارة الديون
│   │       ├── seed/            # بيانات تجريبية
│   │       └── payments/
│   │           ├── callback/    # Callback من SofizPay (Stellar)
│   │           ├── cib-callback/ # Callback من SofizPay (CIB)
│   │           └── status/      # فحص حالة الدفع
│   └── lib/
│       └── db.js                # اتصال قاعدة البيانات وتهيئة الجداول
├── .env.local                   # متغيرات البيئة (لا تُرفع لـ Git)
├── next.config.mjs
└── package.json
```

---

## 🚀 التثبيت والتشغيل

### المتطلبات الأساسية
- Node.js 18+
- حساب [Turso](https://turso.tech) (مجاني)
- حساب [SofizPay](https://sofizpay.com) (اختياري للوضع التجريبي)

### 1. استنساخ المشروع

```bash
git clone https://github.com/YOUR_USERNAME/DzPos.git
cd DzPos
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد متغيرات البيئة

```bash
cp .env.local.example .env.local
```

عدّل `.env.local` بمعلوماتك (راجع قسم [متغيرات البيئة](#-متغيرات-البيئة)).

### 4. تشغيل خادم التطوير

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

---

## 💳 الدفع عبر SofizPay

SofizPay هي بوابة الدفع الجزائرية التي تتيح قبول المدفوعات عبر بطاقات **CIB** و**EDAHABIA** مباشرةً في متجرك.

### ما هي SofizPay؟

[SofizPay](https://sofizpay.com) منصة دفع جزائرية تُمكّن التجار من استقبال المدفوعات الإلكترونية عبر:
- **بطاقة CIB** (الشبكة البنكية بين الجزائرية)
- **بطاقة EDAHABIA** (بطاقة بريد الجزائر)

---

### 🔧 الإعداد خطوة بخطوة

#### الخطوة 1: إنشاء حساب SofizPay

1. اذهب إلى [sofizpay.com](https://sofizpay.com) وسجّل كتاجر (Merchant).
2. بعد التحقق من حسابك، ستحصل على **مفتاح حسابك العام (Stellar Public Key)** أو **معرّف الحساب**.
3. احتفظ بهذا المفتاح — ستحتاجه في الخطوة التالية.

#### الخطوة 2: إضافة المفتاح عند إنشاء الحساب في DzPos

عند التسجيل في DzPos، أدخل مفتاح SofizPay في حقل:
> **"SofizPay Stellar Public Key"**

يُحفظ هذا المفتاح في قاعدة البيانات ويُستخدم لكل عمليات الدفع الإلكتروني في متجرك.

#### الخطوة 3: تحديث المفتاح لاحقاً (من الإعدادات)

يمكنك في أي وقت تحديث مفتاح SofizPay من لوحة التحكم:

```
Dashboard → Settings → SofizPay Integration → تحديث المفتاح
```

---

### 🔄 كيف تعمل عملية الدفع؟ (تدفق كامل)

```
┌─────────────┐    1. اختيار SofizPay      ┌──────────────────┐
│   البائع    │ ─────────────────────────► │  DzPos Backend   │
│  (Dashboard)│      + بيانات الطلب        │  POST /checkout  │
└─────────────┘                            └────────┬─────────┘
                                                    │
                                   2. طلب إنشاء معاملة CIB
                                      (account + amount + memo)
                                                    │
                                                    ▼
                                           ┌─────────────────────┐
                                           │    SofizPay API     │
                                           │ /make-cib-          │
                                           │  transaction/       │
                                           └────────┬────────────┘
                                                    │
                                  3. رد: cib_transaction_id + paymentUrl
                                                    │
                                                    ▼
┌─────────────┐    4. فتح رابط الدفع      ┌──────────────────┐
│   الزبون   │ ◄──────────────────────── │  DzPos Frontend  │
│             │      (QR / نافذة جديدة)   │                  │
└──────┬──────┘                            └──────────────────┘
       │
       │  5. إدخال بيانات البطاقة
       │     (CIB / EDAHABIA)
       ▼
┌──────────────────┐   6. تأكيد الدفع    ┌──────────────────────┐
│  SofizPay        │ ──────────────────► │ /api/payments/       │
│  Payment Page    │  (Redirect Callback) │  cib-callback/       │
└──────────────────┘                     └──────────┬───────────┘
                                                    │
                                   7. التحقق من الحالة عبر
                                   /cib-transaction-check/
                                                    │
                                     ┌──────────────▼────────────┐
                                     │  orderStatus == 2 (PAID)?  │
                                     │  respCode == "00"?         │
                                     └──────────────┬────────────┘
                                          ✅ نعم          ❌ لا
                                           │                │
                                    completeSale()    failedSale()
                                           │
                                    Redirect → /dashboard?status=success
```

---

### 📡 تفاصيل API Endpoints

#### `POST /api/checkout`

يبدأ عملية الدفع ويُنشئ المعاملة في SofizPay.

**Headers مطلوبة:**
```
x-user-id: <merchant_id>
```

**Request Body:**
```json
{
  "paymentMethod": "sofizpay",
  "items": [
    { "productId": "uuid", "name": "قهوة", "quantity": 2, "price": 150 }
  ],
  "totalAmount": 300,
  "amountPaid": 300,
  "customer": {
    "name": "أحمد بن علي",
    "phone": "+213550123456",
    "email": "ahmed@example.com"
  },
  "sofizpayConfig": {
    "account": "YOUR_SOFIZPAY_MERCHANT_KEY",
    "isSandbox": false
  }
}
```

**Response (نجاح — حساب حقيقي):**
```json
{
  "success": true,
  "paymentMethod": "sofizpay",
  "saleId": "550e8400-e29b-41d4-a716-446655440000",
  "cibTransactionId": "CIB_TX_12345",
  "paymentUrl": "https://sofizpay.com/pay/CIB_TX_12345",
  "isMock": false,
  "amount": 300,
  "account": "YOUR_SOFIZPAY_MERCHANT_KEY"
}
```

**Response (وضع Mock — بدون مفتاح حقيقي):**
```json
{
  "success": true,
  "paymentMethod": "sofizpay",
  "saleId": "550e8400-...",
  "cibTransactionId": "mock_tx_a1b2c3d4",
  "paymentUrl": "/dashboard?payment_simulator=true&cib_id=mock_tx_a1b2c3d4&sale_id=550e8400-...&amount=300",
  "isMock": true,
  "amount": 300
}
```

---

#### `GET /api/payments/cib-callback`

يستقبل إعادة التوجيه من SofizPay بعد إتمام الدفع أو فشله.

**Query Parameters:**
| Parameter | الوصف |
|-----------|-------|
| `saleId` | معرّف البيع في قاعدة البيانات |
| `orderId` | (بديل) رقم الطلب في SofizPay |
| `order_number` | (بديل) رقم الطلب |

**منطق التحقق من الدفع:**

| `orderStatus` | `respCode` | `status` | النتيجة |
|--------------|------------|----------|---------|
| `2` (Captured) | `"00"` أو `"0"` | `"success"` | ✅ مدفوع — إتمام البيع وتحديث المخزون |
| `3` (Cancelled) | أي قيمة أخرى | — | ❌ فشل — تحديث حالة البيع لـ `failed` |
| `6` (Rejected) | — | `"fail"` | ❌ فشل |
| غير محدد | — | — | ⏳ انتظار — إعادة توجيه مع `status=pending` |

---

#### `GET /api/payments/status`

يفحص حالة معاملة بشكل دوري (polling من الـ frontend كل بضع ثوانٍ).

**Query:** `?saleId=<uuid>`

**Response:**
```json
{
  "success": true,
  "status": "pending",
  "sofizpayStatus": "PENDING",
  "saleId": "uuid-here"
}
```

---

### 🧪 الوضع التجريبي (Mock / Sandbox)

إذا لم يكن لديك حساب SofizPay، يعمل DzPos تلقائياً في **وضع المحاكاة الكاملة**:

- يُنشئ رقم معاملة وهمي بصيغة `mock_tx_XXXXXXXX`
- يعرض محاكياً داخلياً لصفحة الدفع
- يُتيح اختبار **التدفق الكامل** من الطلب حتى إتمام البيع
- **لا يتطلب بطاقة بنكية حقيقية**

**كيفية تفعيل الوضع التجريبي:**
- اترك مفتاح SofizPay فارغاً أو استخدم القيمة الافتراضية: `G_MOCK_ACCOUNT`
- في الإعدادات، تأكد من تفعيل خيار **"Sandbox Mode"**

---

### ⚙️ إعدادات SofizPay في لوحة التحكم

من **Dashboard → Settings → SofizPay Integration**:

| الإعداد | القيمة الافتراضية | الوصف |
|---------|-----------------|-------|
| **SofizPay Account Key** | `G_MOCK_ACCOUNT` | مفتاحك العام من منصة SofizPay |
| **Sandbox Mode** | `true` | وضع الاختبار (قم بتعطيله في الإنتاج) |

> **ملاحظة مهمة:** عند تغيير المفتاح من الإعدادات، يُحفظ في كلٍّ من:
> 1. `localStorage` في المتصفح للاستخدام الفوري
> 2. قاعدة البيانات (Turso) لاسترجاعه عند تسجيل الدخول من أجهزة أخرى

---

### 🔒 الأمان والخصوصية

- **لا تُخزَّن بيانات البطاقة** في أي مكان — كل شيء يمر عبر بوابة SofizPay الآمنة
- كل معاملة تحمل **`memo`** فريداً بصيغة `Order #XXXXXXXX` لتسهيل التتبع
- عنوان `return_url` يُشير لـ `/api/payments/cib-callback` لمعالجة النتيجة تلقائياً
- بيانات كل تاجر معزولة تماماً عبر `user_id` في كل استعلام

---

### 🐛 استكشاف الأخطاء الشائعة

| المشكلة | السبب المحتمل | الحل |
|---------|-------------|------|
| الدفع يذهب لوضع Mock رغم إدخال المفتاح | المفتاح خاطئ أو غير مُفعَّل | تحقق من صحة مفتاح SofizPay |
| `SofizPay API returned HTTP status 400` | بيانات الزبون ناقصة | تأكد من إدخال الاسم والهاتف والبريد |
| البيع يبقى في حالة `pending` | Callback لم يصل بعد | انقر "Check Status" يدوياً من لوحة التحكم |
| الـ Callback لا يعمل محلياً | `localhost` لا يمكن الوصول إليه من الخارج | استخدم [ngrok](https://ngrok.com) لكشف المنفذ المحلي |

---

## 🔑 متغيرات البيئة

أنشئ ملف `.env.local` في جذر المشروع:

```env
# قاعدة البيانات Turso
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# مفتاح الجلسة (نص عشوائي طويل)
NEXTAUTH_SECRET=your_super_secret_key_here
```

> **ملاحظة:** مفتاح SofizPay **لا** يُخزَّن في `.env.local`، بل يُدار من واجهة المستخدم ويُحفظ في قاعدة البيانات.

---

## 📡 API Routes

| الـ Route | الطريقة | الوصف |
|-----------|---------|-------|
| `/api/auth` | POST | تسجيل دخول / إنشاء حساب |
| `/api/products` | GET / POST / PUT / DELETE | إدارة المنتجات |
| `/api/checkout` | POST | إتمام عملية البيع |
| `/api/payments/cib-callback` | GET | استقبال نتيجة دفع CIB من SofizPay |
| `/api/payments/status` | GET | فحص حالة دفع قيد الانتظار |
| `/api/reports` | GET | تقارير المبيعات اليومية |
| `/api/debts` | GET / POST | إدارة الديون |
| `/api/seed` | POST | إدراج بيانات تجريبية |

---

## 🚀 النشر على Netlify

التطبيق مُنشر على [dzpos.netlify.app](https://dzpos.netlify.app/).

لنشر نسختك الخاصة:

1. **ارفع المشروع على GitHub**
2. **اربط المستودع بـ Netlify** من [app.netlify.com](https://app.netlify.com)
3. **أضف متغيرات البيئة** في إعدادات Netlify → Environment Variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `NEXTAUTH_SECRET`
4. **إعدادات البناء:**
   - Build Command: `npm run build`
   - Publish Directory: `.next`
5. تأكد من تفعيل **Netlify Functions** لدعم API Routes

---

## 📄 الرخصة

هذا المشروع مُرخَّص تحت رخصة MIT.

---

<div align="center">

صُنع بـ ❤️ للأعمال الجزائرية الصغيرة

[dzpos.netlify.app](https://dzpos.netlify.app/) · [SofizPay Docs](https://docs.sofizpay.com) · [Turso](https://turso.tech)

</div>
