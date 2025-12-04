// compoundWords.js
const fuzz = require('fuzzball');

const compoundWords = {
  "غزوة أحد": ["غزوه احد", "غزوة احد", "غزوه أحد", "غزوة_أحد"],
  "نجيب محفوظ": ["نجيب محفوز", "محفوظ نجيب", "نجيب_محفوظ"],
  "رياض الصالحين": ["رياض الصالحين", "رياض_الصالحين", "كتاب رياض الصالحين"],
  "في ظلال القرآن": ["في ظلال", "ظلال القرآن", "في_ظلال_القرآن"],
  "الفيل الأزرق": ["الفيل الازرق", "فيل ازرق", "الفيل_الأزرق"],
  "هيبتا": ["هيبتا", "رواية هيبتا"],
  "تفسير ابن كثير": ["تفسير ابن كثير", "ابن كثير تفسير"],
  "تفسير الطبري": ["تفسير الطبري", "الطبري تفسير"],
  "حصن المسلم": ["حصن المسلم", "كتاب حصن المسلم"],
  "صفة الصلاة": ["صفة صلاة", "صفة_الصلاة"],
  "المدينة المنورة": ["المدينه", "مدينة منورة"],
  "مكة المكرمة": ["مكه", "مكة", "مكرمة"],
  "جبل أحد": ["جبل احد", "جبل_أحد"],
  "السيرة النبوية": ["سيرة نبوية", "السيرة_النبوية"],
  "العادات السبع": ["العادات السبع", "سبع عادات"],
  "إيقظ العملاق": ["ايقظ العملاق", "العملاق بداخلك"],
  "فن اللامبالاة": ["فن اللامبالاه", "اللامبالاة"],
  "دع القلق": ["دع القلق", "دع القلق وابدأ الحياة"],
};

function findCompoundWord(text) {
  const normalized = text.toLowerCase().replace(/[^ا-ي0-9\s]/g, '').trim();
  for (const [correct, variants] of Object.entries(compoundWords)) {
    const cleanCorrect = correct.toLowerCase().replace(/[^ا-ي0-9\s]/g, '');
    if (normalized.includes(cleanCorrect)) {
      return { matched: correct, confidence: 100, source: 'direct' };
    }
    for (const variant of variants) {
      const cleanVariant = variant.toLowerCase().replace(/[^ا-ي0-9\s]/g, '');
      if (normalized.includes(cleanVariant)) {
        return { matched: correct, confidence: 90, source: variant };
      }
    }
    const ratio = fuzz.ratio(normalized, cleanCorrect);
    if (ratio >= 75) {
      return { matched: correct, confidence: ratio, source: 'fuzzy' };
    }
  }
  return null;
}

function correctCompoundWords(text) {
  let corrected = text;
  for (const [correct, variants] of Object.entries(compoundWords)) {
    const escaped = variants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  }
  return corrected;
}

module.exports = { findCompoundWord, correctCompoundWords };