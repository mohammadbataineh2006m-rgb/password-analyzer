// قائمة بأشهر الكلمات والأنماط المعرضة لهجوم القاموس
const COMMON_PATTERNS = [
  "password", "123456", "12345678", "qwerty", "admin", "welcome", "login", "jordan", "pass123"
];

const elements = {
  input: document.getElementById("passwordInput"),
  toggle: document.getElementById("toggleVisibility"),
  generate: document.getElementById("generateBtn"),
  copy: document.getElementById("copyBtn"),
  strengthLabel: document.getElementById("strengthLabel"),
  entropyValue: document.getElementById("entropyValue"),
  progressBar: document.getElementById("progressBar"),
  crackTimeValue: document.getElementById("crackTimeValue"),
  sha256Hash: document.getElementById("sha256Hash"),
  rules: {
    length: document.getElementById("rule-length"),
    upper: document.getElementById("rule-uppercase"),
    lower: document.getElementById("rule-lowercase"),
    numbers: document.getElementById("rule-numbers"),
    symbols: document.getElementById("rule-symbols"),
    common: document.getElementById("rule-common"),
  }
};

// مستمع الأحداث عند الكتابة
elements.input.addEventListener("input", analyzePassword);

// إظهار / إخفاء كلمة المرور
elements.toggle.addEventListener("click", () => {
  const isPass = elements.input.type === "password";
  elements.input.type = isPass ? "text" : "password";
  elements.toggle.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
});

// زر التوليد العشوائي
elements.generate.addEventListener("click", generateStrongPassword);

// زر النسخ
elements.copy.addEventListener("click", () => {
  if (!elements.input.value) return;
  navigator.clipboard.writeText(elements.input.value);
  alert("تم نسخ كلمة المرور إلى الحافظة!");
});

async function analyzePassword() {
  const pwd = elements.input.value;
  if (!pwd) {
    resetUI();
    return;
  }

  // 1. فحص الشروط
  const checks = {
    length: pwd.length >= 12,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    numbers: /[0-9]/.test(pwd),
    symbols: /[^A-Za-z0-9]/.test(pwd),
    common: !COMMON_PATTERNS.some(p => pwd.toLowerCase().includes(p))
  };

  updateRuleUI(elements.rules.length, checks.length);
  updateRuleUI(elements.rules.upper, checks.upper);
  updateRuleUI(elements.rules.lower, checks.lower);
  updateRuleUI(elements.rules.numbers, checks.numbers);
  updateRuleUI(elements.rules.symbols, checks.symbols);
  updateRuleUI(elements.rules.common, checks.common);

  // 2. حساب حجم نطاق المحارف (Pool Size R)
  let poolSize = 0;
  if (checks.lower) poolSize += 26;
  if (checks.upper) poolSize += 26;
  if (checks.numbers) poolSize += 10;
  if (checks.symbols) poolSize += 33;
  if (poolSize === 0) poolSize = 1;

  // 3. حساب الإنتروبي الرياضي: E = L * log2(R)
  const entropy = Math.round(pwd.length * Math.log2(poolSize));
  elements.entropyValue.textContent = `الإنتروبي: ${entropy} Bits`;

  // 4. تقييم القوة وشريط التقدم
  updateStrengthUI(entropy, checks.common);

  // 5. تقدير زمن الكسر (بافتراض 10 مليار محاولة بالثانية على كرت شاشة حديث)
  calculateCrackTime(pwd.length, poolSize);

  // 6. توليد SHA-256
  const hash = await computeSHA256(pwd);
  elements.sha256Hash.textContent = hash;
}

function updateRuleUI(el, isValid) {
  el.className = isValid ? "valid" : "invalid";
  const icon = el.querySelector("i");
  icon.className = isValid ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark";
}

function updateStrengthUI(entropy, notCommon) {
  let score = Math.min(entropy, 100);
  if (!notCommon) score = Math.min(score, 25);

  elements.progressBar.style.width = `${score}%`;

  if (score < 40) {
    elements.progressBar.style.backgroundColor = "var(--weak)";
    elements.strengthLabel.textContent = "ضعيفة جداً";
    elements.strengthLabel.style.color = "var(--weak)";
  } else if (score < 70) {
    elements.progressBar.style.backgroundColor = "var(--medium)";
    elements.strengthLabel.textContent = "متوسطة";
    elements.strengthLabel.style.color = "var(--medium)";
  } else {
    elements.progressBar.style.backgroundColor = "var(--strong)";
    elements.strengthLabel.textContent = "قوية جداً وممتازة";
    elements.strengthLabel.style.color = "var(--strong)";
  }
}

function calculateCrackTime(length, poolSize) {
  // إجمالي الاحتمالات = PoolSize ^ Length
  const totalCombinations = Math.pow(poolSize, length);
  const guessesPerSecond = 1e10; // 10 GH/s
  const seconds = totalCombinations / guessesPerSecond;

  let timeText = "";
  if (seconds < 1) timeText = "لحظي (أقل من ثانية)";
  else if (seconds < 60) timeText = `${Math.round(seconds)} ثانية`;
  else if (seconds < 3600) timeText = `${Math.round(seconds / 60)} دقيقة`;
  else if (seconds < 86400) timeText = `${Math.round(seconds / 3600)} ساعة`;
  else if (seconds < 31536000) timeText = `${Math.round(seconds / 86400)} يوم`;
  else if (seconds < 31536000 * 1000) timeText = `${Math.round(seconds / 31536000)} سنة`;
  else timeText = "ملايين السنين (غير قابلة للاختراق)";

  elements.crackTimeValue.textContent = timeText;
}

async function computeSHA256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateStrongPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><,./-=";
  let result = "";
  const randomValues = new Uint32Array(16);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < 16; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  elements.input.value = result;
  analyzePassword();
}

function resetUI() {
  elements.progressBar.style.width = "0%";
  elements.strengthLabel.textContent = "فارغ";
  elements.entropyValue.textContent = "الإنتروبي: 0 Bits";
  elements.crackTimeValue.textContent = "0 ثانية";
  elements.sha256Hash.textContent = "-";
  Object.values(elements.rules).forEach(el => {
    el.className = "";
    el.querySelector("i").className = "fa-solid fa-circle-xmark";
  });
}