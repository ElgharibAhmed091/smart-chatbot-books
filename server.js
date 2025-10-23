require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const MODEL_NAME = "gemini-2.5-flash"; // نموذج شغال 100% في 2025

// إعداد Express
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ====== Gemini (اختياري) ======
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log("✅ Gemini AI جاهز!");
  } catch (err) {
    console.error("❌ فشل تحميل Gemini:", err.message);
  }
} else {
  console.log("⚠️ GEMINI_API_KEY مفقود → سيتم استخدام الردود الافتراضية");
}

// ====== قاعدة المعرفة (KB) الموسعة ======
function normalize(msg) {
  let normalized = msg.trim().toLowerCase().replace(/[؟,.:!]/g, '').replace(/\s+/g, ' ');
  // دعم synonyms لفهم أسئلة متعددة
  normalized = normalized.replace(/ابغا|أريد|أوصي|اقترح|هات|شوف لي/g, 'اقترح');
  normalized = normalized.replace(/علبكم/g, 'عليكم'); // مثال تصحيح إضافي
  normalized = normalized.replace(/سعاده/g, 'سعادة');
  normalized = normalized.replace(/قرايه|قرائه/g, 'قراءة');
  return normalized;
}

const knowledgeBase = new Map([
  // السلام والوداع
  ["السلام عليكم", ["وعليكم السلام ورحمة الله وبركاته", "وعليكم السلام! كيف أساعدك اليوم؟"]],
  ["مع السلامة", ["مع السلامة! نراك قريبًا في بين الغلافين.", "وداعًا، استمتع بقراءتك!"]],
  ["باي", ["باي! إذا عندك أسئلة أخرى، أنا هنا."]],

  // عن المنصة
  ["من نحن", ["نحن منصة 'بين الغلافين'، مجتمع لعشاق القراءة والكتابة.", "مرحبًا بك في 'بين الغلافين' – استشر، اقرأ، ناقش!"]],
  ["ما هي المنصة", ["'بين الغلافين' هي منصة عربية لاقتراح الكتب، النقاشات، والنقد الأدبي."]],
  ["كيف أنضم", ["زور موقعنا أو حمل التطبيق، وسجل مجانًا!"]],
  ["اتصل بنا", ["إيميل: betweencovers@gmail.com\nX: @betweencovers01\nInstagram: @betweencovers02\nTelegram: @betweencovers03"]],
  ["خدمة العملاء", ["تواصل معنا عبر: إيميل betweencovers@gmail.com أو X @betweencovers01."]],

  // اقتراح كتب عام
  ["كيف حالك", ["الحمدلله أنا كويس، وماذا عنك؟", "أنا بخير، وأنت؟", "تمام! هل لديك استفسار عن الكتب؟"]],
  ["انا مبتدئ بالقراءة اقترح كتب", ["جرب 'نظرية الفستق' لفهد الأحمدي – خفيف ومفيد.", "ابدأ بـ 'الخيميائي' لباولو كويلو – رواية ملهمة.", "أنصحك بـ 'رجال في الشمس' لغسان كنفاني – قصيرة وعميقة."]],
  ["اقترح كتب سعادة", ["كتاب 'فن اللامبالاة' لمارك مانسون – يغير نظرتك للحياة.", "جرب 'مشروع السعادة' لغريتشن روبين – عملي ومفيد جدًا."]],
  ["اقترح كتب علم نفس", ["'التفكير السريع والبطيء' لدانيال كانيمان – عميق ومفيد.", "'الرجال من المريخ والنساء من الزهرة' لجون غراي.", "'قوة العادات' لتشارلز دوهيغ."]],
  ["اقترح كتب تطوير ذاتي", ["'القوة في الداخل' لستيفن كوفي.", "'فكر وازدد ثراء' لنابليون هيل."]],
  ["اقترح كتب روايات", ["'ألف ليلة وليلة' – كلاسيكي عربي.", "'غاتسبي العظيم' لسكوت فيتزجيرالد."]],
  ["اقترح كتب تاريخ", ["'تاريخ العرب' لفيليب حتي.", "'سيرة النبي' لابن هشام."]],
  ["اقترح كتب فلسفة", ["'العالم كما أراه' لألبرت أينشتاين.", "'الجمهورية' لأفلاطون."]],
  ["اقترح كتب أعمال", ["'الأب الغني الأب الفقير' لروبرت كيوساكي.", "'ابدأ باللماذا' لسايمون سينك."]],
  ["اقترح كتب علمية", ["'كون قصير' لستيفن هوكينغ.", "'أصل الأنواع' لداروين."]],
  ["اقترح كتب أدب عربي", ["'الأيام' لطه حسين.", "'زينب' لمحمد حسين هيكل."]],

  // نقد كتب (إذا طلب)
  ["نقد كتاب الخيميائي", ["نقد: رواية ملهمة لكن بعض النقاد يرونها سطحية في الفلسفة، قوية في الرسالة الإيجابية."]],
  ["نقد كتاب فن اللامبالاة", ["نقد: كتاب عملي يركز على الواقعية، لكنه قد يبدو قاسيًا للبعض."]],
  ["نقد كتاب نظرية الفستق", ["نقد: خفيف وممتع للمبتدئين، لكنه يفتقر إلى العمق العلمي."]],
  ["نقد كتاب التفكير السريع والبطيء", ["نقد: علمي ممتاز، لكنه طويل ويحتاج تركيزًا."]],
  ["نقد كتاب الأب الغني الأب الفقير", ["نقد: يعلم الذكاء المالي، لكنه متهم بتبسيط الواقع."]],

  // عام
  ["شكرًا", ["عفوًا! سعيد بمساعدتك."]],
  ["ماذا تقرأ الآن", ["أنا أقرأ كل شيء! اقترح لي كتابًا."]]
]);

// ردود عامة
const fallbackReplies = [
  "سؤال رائع! يمكنك البحث عن كتب في هذا الموضوع على موقعنا.",
  "أنصحك بزيارة قسم 'الكتب الموصى بها' على المنصة.",
  "هل تحب القراءة؟ جرب كتاب 'الخيميائي'، سيعجبك!",
  "لم أجد إجابة دقيقة، لكن يمكنك سؤال المجتمع في 'بين الغلافين'!"
];

// ====== تصحيح إملائي بسيط (موسع) ======
function simpleCorrect(text) {
  const corrections = {
    "قرايه": "قراءة",
    "سعاده": "سعادة",
    "انا": "أنا",
    "بحب": "أحب",
    "جدااا": "جدًا",
    "ليه": "لماذا",
    "ايه": "ماذا",
    "القرايه": "القراءة",
    "علبكم": "عليكم", // مثالك
    "عليكوم": "عليكم",
    "السلام علبكم": "السلام عليكم",
    // أضف المزيد إذا لزم
  };
  let corrected = text;
  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(wrong, 'gi');
    corrected = corrected.replace(regex, right);
  }
  return corrected;
}

// ====== البحث في قاعدة المعرفة ======
function findKBAnswer(message) {
  const key = normalize(message);
  for (const [kbKey, answers] of knowledgeBase.entries()) {
    if (key.includes(kbKey)) {
      return answers[Math.floor(Math.random() * answers.length)];
    }
  }
  return null;
}

// ====== استدعاء Gemini (آمن) ======
async function askGemini(prompt) {
  if (!geminiModel) return null;
  try {
    const result = await geminiModel.generateContent(prompt);
    let reply = result.response.text().trim();
    // إضافة إشعار لـ Gemini
    reply = "هذا الرد من مصادر خارجية (Gemini):\n" + reply;
    return reply;
  } catch (error) {
    console.error("خطأ Gemini:", error.message);
    return null;
  }
}

// ====== نقطة النهاية: /chat ======
app.post('/chat', async (req, res) => {
  let { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ reply: "أرسل رسالة صحيحة!" });
  }

  message = message.trim();
  if (!message) return res.status(400).json({ reply: "الرسالة فارغة!" });

  const original = message;
  const corrected = simpleCorrect(message);

  // 1. البحث في قاعدة المعرفة
  let reply = findKBAnswer(corrected);

  // 2. لو مفيش إجابة → جرب Gemini
  if (!reply && geminiModel) {
    const geminiPrompt = `أنت خبير أدبي ومساعد كتب ذكي. 
المهمة:
1. قم أولاً بتصحيح أي أخطاء إملائية أو نحوية في النص.
2. أجب على السؤال باللغة العربية بشكل واضح، مختصر، ومرتب (استخدم قوائم إذا لزم).
3. إذا كان السؤال عن اقتراح كتب، قدم 2-3 اقتراحات مناسبة للمستوى المطلوب.
4. إذا طلب نقدًا لكتاب، قدم نقدًا موضوعيًا قصيرًا مع نقاط إيجابية وسلبية.
5. استخدم أمثلة عملية أو نصائح للقراءة إن أمكن.
6. اجعل الرد مفيدًا دون حشو زائد.

السؤال: "${corrected}"`;

    reply = await askGemini(geminiPrompt);
  }

  // 3. لو Gemini فشل → رد عام
  if (!reply) {
    reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }

  // 4. إرجاع الرد
  res.json({
    reply,
    corrected: corrected !== original,
    original,
    fixed: corrected
  });
});

// ====== عرض الصفحة ======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على http://localhost:${PORT}`);
});