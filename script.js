/* =========================================================
   Chinês SRS — Digitação
   Vanilla JS · Offline PWA · SweetAlert2
   ========================================================= */

const SRS_INTERVALS = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 7, 7: 9, 8: 12,
  9: 16, 10: 22, 11: 29, 12: 38, 13: 50, 14: 65,
  15: 86, 16: 114, 17: 150
};
const MAX_SRS_LEVEL = 17;

const defaultPhrases = [
  {"id":1,"hanzi":"我早上四点起床去上班。","pinyin":"Wǒ zǎoshang sì diǎn qǐchuáng qù shàngbān.","traducao":"Eu acordo às quatro da manhã e vou trabalhar."},
  {"id":2,"hanzi":"我的朋友周末喜欢去电影院。","pinyin":"Wǒ de péngyou zhōumò xǐhuan qù diànyǐngyuàn.","traducao":"Meu amigo gosta de ir ao cinema no fim de semana."},
  {"id":3,"hanzi":"爸爸喜欢下班后在家看电影。","pinyin":"Bàba xǐhuan xiàbān hòu zài jiā kàn diànyǐng.","traducao":"Papai gosta de assistir filme em casa depois do trabalho."},
  {"id":4,"hanzi":"我昨天买了一本很好看的书。","pinyin":"Wǒ zuótiān mǎile yì běn hěn hǎokàn de shū.","traducao":"Eu comprei um livro muito bom ontem."},
  {"id":5,"hanzi":"妈妈会开车，还会说中文。","pinyin":"Māma huì kāichē, hái huì shuō Zhōngwén.","traducao":"Mamãe sabe dirigir e também sabe falar chinês."},
  {"id":6,"hanzi":"他喜欢喝茶，她喜欢喝牛奶。","pinyin":"Tā xǐhuan hē chá, tā xǐhuan hē niúnǎi.","traducao":"Ele gosta de beber chá, ela gosta de beber leite."},
  {"id":7,"hanzi":"她们都喜欢热咖啡。","pinyin":"Tāmen dōu xǐhuan rè kāfēi.","traducao":"Elas todas gostam de café quente."},
  {"id":8,"hanzi":"我今天中午吃了豆腐和面。","pinyin":"Wǒ jīntiān zhōngwǔ chīle dòufu hé miàn.","traducao":"Eu comi tofu e macarrão no almoço de hoje."},
  {"id":9,"hanzi":"老师明天早上去医院看病。","pinyin":"Lǎoshī míngtiān zǎoshang qù yīyuàn kànbìng.","traducao":"O professor vai ao hospital consultar o médico amanhã de manhã."},
  {"id":10,"hanzi":"弟弟喜欢粥和日本汤。","pinyin":"Dìdi xǐhuan zhōu hé Rìběn tāng.","traducao":"O irmão mais novo gosta de mingau e sopa japonesa."},
  {"id":11,"hanzi":"医生跟我说中文。","pinyin":"Yīshēng gēn wǒ shuō Zhōngwén.","traducao":"O médico fala chinês comigo."},
  {"id":12,"hanzi":"我想去超市买两个苹果。","pinyin":"Wǒ xiǎng qù chāoshì mǎi liǎng ge píngguǒ.","traducao":"Eu quero ir ao supermercado comprar duas maçãs."},
  {"id":13,"hanzi":"我的好朋友在商店里买的那个东西多少钱？","pinyin":"Wǒ de hǎo péngyou zài shāngdiàn lǐ mǎi de nàge dōngxi duōshǎo qián?","traducao":"Quanto custa aquela coisa que meu bom amigo comprou na loja?"},
  {"id":14,"hanzi":"你现在在房间里吗？","pinyin":"Nǐ xiànzài zài fángjiān lǐ ma?","traducao":"Você está no quarto agora?"},
  {"id":15,"hanzi":"外边那个男人非常高兴。","pinyin":"Wàibian nàge nánrén fēicháng gāoxìng.","traducao":"Aquele homem lá fora está muito feliz."},
  {"id":16,"hanzi":"明天天气很冷，也会下雪。","pinyin":"Míngtiān tiānqì hěn lěng, yě huì xià xuě.","traducao":"Amanhã o tempo vai estar muito frio e também vai nevar."},
  {"id":17,"hanzi":"昨天天气很热，我和朋友没有去跑步。","pinyin":"Zuótiān tiānqì hěn rè, wǒ hé péngyou méiyǒu qù pǎobù.","traducao":"Ontem o tempo estava muito quente, eu e meu amigo não fomos correr."},
  {"id":18,"hanzi":"晚饭我不喝酒。","pinyin":"Wǎnfàn wǒ bù hējiǔ.","traducao":"No jantar eu não bebo álcool."},
  {"id":19,"hanzi":"你认识那个漂亮的学生。","pinyin":"Nǐ rènshi nàge piàoliang de xuésheng.","traducao":"Você conhece aquele estudante bonito."},
  {"id":20,"hanzi":"我有两只狗，妈妈不喜欢猫。","pinyin":"Wǒ yǒu liǎng zhī gǒu, māma bù xǐhuan māo.","traducao":"Eu tenho dois cachorros, mamãe não gosta de gatos."},
  {"id":21,"hanzi":"弟弟正在大学学习中文。","pinyin":"Dìdi zhèngzài dàxué xuéxí Zhōngwén.","traducao":"O irmão mais novo está estudando chinês na universidade."},
  {"id":22,"hanzi":"晚上我和我爸爸一起去中国工作。","pinyin":"Wǎnshang wǒ hé wǒ bàba yìqǐ qù Zhōngguó gōngzuò.","traducao":"À noite, eu e meu pai vamos juntos trabalhar na China."},
  {"id":23,"hanzi":"我爱我可爱的猫。","pinyin":"Wǒ ài wǒ kě'ài de māo.","traducao":"Eu amo meu gato fofo."},
  {"id":24,"hanzi":"现在他在外边玩。","pinyin":"Xiànzài tā zài wàibian wán.","traducao":"Agora ele está brincando lá fora."},
  {"id":25,"hanzi":"我买了一台新电脑。","pinyin":"Wǒ mǎile yì tái xīn diànnǎo.","traducao":"Eu comprei um computador novo."},
  {"id":26,"hanzi":"星期六上午我睡觉。","pinyin":"Xīngqīliù shàngwǔ wǒ shuìjiào.","traducao":"Sábado de manhã eu durmo."},
  {"id":27,"hanzi":"白天我休息。","pinyin":"Báitiān wǒ xiūxi.","traducao":"Durante o dia eu descanso."},
  {"id":28,"hanzi":"包子很好吃，也便宜。","pinyin":"Bāozi hěn hǎochī, yě piányi.","traducao":"O pão recheado é gostoso e também barato."},
  {"id":29,"hanzi":"你早饭吃什么？","pinyin":"Nǐ zǎofàn chī shénme?","traducao":"O que você come no café da manhã?"},
  {"id":30,"hanzi":"桌子上有杯子。","pinyin":"Zhuōzi shàng yǒu bēizi.","traducao":"Em cima da mesa tem um copo."},
  {"id":31,"hanzi":"午饭不是包子。","pinyin":"Wǔfàn bú shì bāozi.","traducao":"O almoço não é pão recheado."},
  {"id":32,"hanzi":"我醒了，向妈妈看。","pinyin":"Wǒ xǐng le, xiàng māma kàn.","traducao":"Eu acordei e olhei para a mamãe."},
  {"id":33,"hanzi":"请问你们下午能来学校见同学吗？","pinyin":"Qǐngwèn nǐmen xiàwǔ néng lái xuéxiào jiàn tóngxué ma?","traducao":"Com licença, vocês podem vir à escola à tarde para encontrar os colegas de classe?"},
  {"id":34,"hanzi":"请别让爱凋落。","pinyin":"Qǐng bié ràng ài diāoluò.","traducao":"Por favor, não deixe o amor murchar."},
  {"id":35,"hanzi":"今天我去健身房练腿做了杠铃深蹲。","pinyin":"Jīntiān wǒ qù jiànshēnfáng liàn tuǐ zuòle gànglíng shēndūn.","traducao":"Hoje eu fui à academia treinar perna e fiz agachamento com barra."},
  {"id":36,"hanzi":"今天练了杠铃卧推。","pinyin":"Jīntiān liànle gànglíng wòtuī.","traducao":"Hoje treinei supino reto com barra."},
  {"id":37,"hanzi":"你打打电话，问问他去不去饭店。","pinyin":"Nǐ dǎ dǎ diànhuà, wèn wen tā qù bu qù fàndiàn.","traducao":"Faz uma chamada e pergunta se ele vai ou não ao restaurante."},
  {"id":38,"hanzi":"大家觉得这首歌很好听。","pinyin":"Dàjiā juéde zhè shǒu gē hěn hǎotīng.","traducao":"Todo o mundo acha esta música muito boa de ouvir."},
  {"id":39,"hanzi":"我妹妹在公司工作，很忙。","pinyin":"Wǒ mèimei zài gōngsī gōngzuò, hěn máng.","traducao":"A minha irmã mais nova trabalha numa empresa e está muito ocupada."},
  {"id":40,"hanzi":"我每天都去健身房锻炼。","pinyin":"Wǒ měitiān dōu qù jiànshēnfáng duànliàn.","traducao":"Eu vou à academia todo dia treinar."},
  {"id":41,"hanzi":"我喜欢健美和力量举。","pinyin":"Wǒ xǐhuan jiànměi hé lìliàngjǔ.","traducao":"Eu gosto de fisiculturismo e powerlifting."},
  {"id":42,"hanzi":"力量举是一项由深蹲、卧推和硬拉组成的运动。","pinyin":"Lìliàngjǔ shì yì xiàng yóu shēndūn, wòtuī hé yìnglā zǔchéng de yùndòng.","traducao":"Powerlifting é um esporte composto por Agachamento, Supino e Levantamento terra."},
  {"id":43,"hanzi":"我在健身房练力量举。","pinyin":"Wǒ zài jiànshēnfáng liàn lìliàngjǔ.","traducao":"Eu pratico powerlifting na academia."}
];

/* ---------- State ---------- */
let phrasesData = [];
let currentView = 'home';
let selectedMode = 'mixed';
let studyQueue = [];
let studyIndex = 0;
let currentExercise = null; // { phrase, type, options? }
let answered = false;
let sessionLog = []; // { id, type, prompt, expected, userAnswer, systemCorrect, exactMatch, revealed, method, similarity }
let peer = null;
let peerConn = null;
let currentDetailId = null;
const SESSION_KEY = 'chinese_srs_active_session';
let sessionStartedAt = null;

/* Semantic offline model (optional ~100MB) */
const SEMANTIC_MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const SEMANTIC_THRESHOLD = 0.78;
let semanticEnabled = localStorage.getItem('chinese_srs_semantic') === '1';
let semanticReady = false;
let semanticLoading = false;
let semanticExtractor = null;

/* ---------- Utils ---------- */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[。．.！!？?，,、；;：:""''「」『』（）()【】\[\]\s]/g, '');
}

// Remove pontuação, espaços e variações tipográficas do chinês
function normalizeHanzi(str) {
  return (str || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[。．.！!？?，,、；;：:""''「」『』（）()【】\[\]·…—–\-]/g, '');
}

// Contagem de caracteres (aceita mesma frase com ordem diferente)
function charBag(str) {
  const map = Object.create(null);
  for (const ch of str) {
    map[ch] = (map[ch] || 0) + 1;
  }
  return map;
}

function bagsEqual(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => a[k] === b[k]);
}

// Distância de Levenshtein (caractere a caractere)
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarityRatio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1;
  return 1 - levenshtein(a, b) / longer;
}

/**
 * Comparação flexível para Hanzi:
 * 1. Exato (após normalizar pontuação)
 * 2. Mesmos caracteres em qualquer ordem (expressões de tempo/lugar móveis)
 * 3. Similaridade alta (≥ 85%) para erros de digitação leves
 */
function isHanziMatch(user, expected) {
  const u = normalizeHanzi(user);
  const e = normalizeHanzi(expected);
  if (!u || !e) return false;
  if (u === e) return true;
  if (bagsEqual(charBag(u), charBag(e))) return true;
  if (similarityRatio(u, e) >= 0.85) return true;
  return false;
}

/**
 * Comparação flexível para português:
 * 1. Exato normalizado (sem acentos/pontuação)
 * 2. Similaridade ≥ 88% (erros de digitação / artigos)
 */
function isPortugueseMatch(user, expected) {
  const u = normalize(user);
  const e = normalize(expected);
  if (!u || !e) return false;
  if (u === e) return true;
  if (similarityRatio(u, e) >= 0.88) return true;
  return false;
}

/* ---------- Semantic model (optional) ---------- */
function updateSemanticUI() {
  const status = document.getElementById('semantic-status');
  const btnEn = document.getElementById('btn-semantic-enable');
  const btnDis = document.getElementById('btn-semantic-disable');
  const prog = document.getElementById('semantic-progress-wrap');
  if (!status) return;

  if (semanticLoading) {
    status.textContent = 'Status: baixando / carregando modelo…';
    status.classList.remove('active');
    btnEn?.classList.add('hidden');
    btnDis?.classList.add('hidden');
    prog?.classList.remove('hidden');
    return;
  }

  prog?.classList.add('hidden');

  if (semanticEnabled && semanticReady) {
    status.textContent = 'Status: correção semântica ativa (offline)';
    status.classList.add('active');
    btnEn?.classList.add('hidden');
    btnDis?.classList.remove('hidden');
  } else if (semanticEnabled && !semanticReady) {
    status.textContent = 'Status: ativado, mas modelo não carregou — usando regras';
    status.classList.remove('active');
    btnEn?.classList.remove('hidden');
    btnDis?.classList.remove('hidden');
  } else {
    status.textContent = 'Status: algoritmo local (regras)';
    status.classList.remove('active');
    btnEn?.classList.remove('hidden');
    btnDis?.classList.add('hidden');
  }
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedText(text) {
  if (!semanticExtractor) return null;
  const out = await semanticExtractor(text, { pooling: 'mean', normalize: true });
  // transformers.js returns Tensor with .data
  if (out && out.data) return Array.from(out.data);
  if (Array.isArray(out)) return out;
  return null;
}

async function semanticSimilarity(a, b) {
  try {
    const [ea, eb] = await Promise.all([embedText(a), embedText(b)]);
    if (!ea || !eb) return null;
    return cosineSim(ea, eb);
  } catch (err) {
    console.warn('Semantic similarity failed:', err);
    return null;
  }
}

async function loadSemanticModel() {
  if (semanticReady && semanticExtractor) return true;
  if (semanticLoading) return false;
  semanticLoading = true;
  updateSemanticUI();

  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1');
    const { pipeline, env } = mod;
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    semanticExtractor = await pipeline(
      'feature-extraction',
      SEMANTIC_MODEL_ID,
      {
        progress_callback: (p) => {
          if (!p) return;
          const wrap = document.getElementById('semantic-progress-wrap');
          const bar = document.getElementById('semantic-progress-bar');
          const txt = document.getElementById('semantic-progress-text');
          wrap?.classList.remove('hidden');
          let pct = 0;
          if (typeof p.progress === 'number') pct = Math.round(p.progress);
          else if (p.loaded && p.total) pct = Math.round((p.loaded / p.total) * 100);
          if (bar) bar.style.width = pct + '%';
          if (txt) txt.textContent = (p.status ? p.status + ' ' : '') + pct + '%';
        }
      }
    );

    // warm-up
    await embedText('测试 test');
    semanticReady = true;
    semanticEnabled = true;
    localStorage.setItem('chinese_srs_semantic', '1');
    semanticLoading = false;
    updateSemanticUI();
    return true;
  } catch (err) {
    console.error('Failed to load semantic model:', err);
    semanticReady = false;
    semanticExtractor = null;
    semanticLoading = false;
    updateSemanticUI();
    Swal.fire({
      icon: 'error',
      title: 'Falha ao carregar modelo',
      text: 'Não foi possível baixar ou iniciar o modelo. A correção por regras continua ativa.',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f59e0b'
    });
    return false;
  }
}

function disableSemanticModel() {
  semanticEnabled = false;
  semanticReady = false;
  semanticExtractor = null;
  localStorage.setItem('chinese_srs_semantic', '0');
  updateSemanticUI();
  Swal.fire({
    toast: true,
    position: 'top',
    icon: 'info',
    title: 'Correção semântica desativada',
    showConfirmButton: false,
    timer: 1800,
    background: '#1e293b',
    color: '#f1f5f9'
  });
}

async function enableSemanticModel() {
  const res = await Swal.fire({
    title: 'Ativar correção semântica?',
    html: `
      <p style="text-align:left;font-size:0.9rem;color:#94a3b8;line-height:1.5;">
        Será baixado o modelo <strong style="color:#f1f5f9;">paraphrase-multilingual-MiniLM</strong>
        (~100&nbsp;MB) uma vez. Depois funciona <strong style="color:#f1f5f9;">offline</strong> e melhora
        a detecção de paráfrases e ordem das palavras.
      </p>
      <p style="text-align:left;font-size:0.85rem;color:#94a3b8;margin-top:0.5rem;">
        Se cancelar ou falhar o download, a correção por regras locais continua normalmente.
        O relatório da sessão é gerado nos dois modos.
      </p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Baixar e ativar',
    cancelButtonText: 'Agora não',
    background: '#1e293b',
    color: '#f1f5f9',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#475569'
  });
  if (!res.isConfirmed) return;
  const ok = await loadSemanticModel();
  if (ok) {
    Swal.fire({
      icon: 'success',
      title: 'Modelo pronto',
      text: 'Correção semântica ativa nesta e nas próximas sessões.',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f59e0b'
    });
  }
}

/**
 * Hybrid check: semantic if ready, else rules.
 * Returns { correct, exactMatch, method, similarity }
 */
async function evaluateAnswer(type, userAns, phrase) {
  let exactMatch = false;
  let rulesCorrect = false;

  if (type === 'pt2hanzi') {
    exactMatch = normalizeHanzi(userAns) === normalizeHanzi(phrase.hanzi);
    rulesCorrect = isHanziMatch(userAns, phrase.hanzi);
  } else if (type === 'hanzi2pt') {
    exactMatch = normalize(userAns) === normalize(phrase.traducao);
    rulesCorrect = isPortugueseMatch(userAns, phrase.traducao);
  } else {
    exactMatch = normalize(userAns) === normalize(phrase.traducao);
    rulesCorrect = exactMatch;
  }

  // Try semantic for typing modes
  if (semanticEnabled && semanticReady && (type === 'pt2hanzi' || type === 'hanzi2pt')) {
    const expected = type === 'pt2hanzi' ? phrase.hanzi : phrase.traducao;
    const sim = await semanticSimilarity(userAns, expected);
    if (sim !== null) {
      const correct = sim >= SEMANTIC_THRESHOLD || rulesCorrect;
      return {
        correct,
        exactMatch,
        method: 'semantic',
        similarity: Math.round(sim * 1000) / 1000
      };
    }
  }

  return {
    correct: rulesCorrect,
    exactMatch,
    method: 'rules',
    similarity: null
  };
}

function save() {
  localStorage.setItem('chinese_srs_phrases', JSON.stringify(phrasesData));
}

function load() {
  const raw = localStorage.getItem('chinese_srs_phrases');
  if (raw) {
    try {
      phrasesData = JSON.parse(raw);
    } catch {
      phrasesData = JSON.parse(JSON.stringify(defaultPhrases));
    }
  } else {
    phrasesData = JSON.parse(JSON.stringify(defaultPhrases));
  }
  phrasesData.forEach(p => {
    if (!p.srs) {
      p.srs = { nivel: 0, dataEstudo: null, proximaRevisao: null, totalEstudos: 0 };
    }
    if (typeof p.dificil === 'undefined') p.dificil = false;
  });
}

function getDuePhrases() {
  const t = todayStr();
  return phrasesData.filter(p => {
    if (!p.srs.dataEstudo) return true; // novas
    return p.srs.proximaRevisao && p.srs.proximaRevisao <= t;
  });
}

function getNewPhrases() {
  return phrasesData.filter(p => !p.srs.dataEstudo);
}

function getFuturePhrases() {
  const t = todayStr();
  return phrasesData.filter(p => p.srs.dataEstudo && p.srs.proximaRevisao > t);
}

function getHardPhrases() {
  return phrasesData.filter(p => p.dificil);
}

function getSrsPhrases() {
  return phrasesData.filter(p => p.srs.dataEstudo);
}

/* ---------- SRS ---------- */
function markCorrect(phraseId) {
  const item = phrasesData.find(p => p.id === phraseId);
  if (!item) return;

  const t = todayStr();
  let newLevel = (item.srs.nivel || 0) + 1;
  if (newLevel > MAX_SRS_LEVEL) newLevel = MAX_SRS_LEVEL;

  const days = SRS_INTERVALS[newLevel] || 1;
  const next = new Date();
  next.setDate(next.getDate() + days);

  item.srs = {
    nivel: newLevel,
    dataEstudo: t,
    proximaRevisao: next.toISOString().split('T')[0],
    totalEstudos: (item.srs.totalEstudos || 0) + 1
  };
  save();
  syncIfConnected();
}

function markWrong(phraseId) {
  const item = phrasesData.find(p => p.id === phraseId);
  if (!item) return;

  // Errou: volta 1 nível (mínimo 0) e agenda para amanhã
  let newLevel = Math.max(0, (item.srs.nivel || 0) - 1);
  const t = todayStr();
  const next = new Date();
  next.setDate(next.getDate() + 1);

  item.srs = {
    nivel: newLevel,
    dataEstudo: t,
    proximaRevisao: next.toISOString().split('T')[0],
    totalEstudos: (item.srs.totalEstudos || 0) + 1
  };
  save();
  syncIfConnected();
}

/* ---------- UI updates ---------- */
function updateStats() {
  const due = getDuePhrases();
  const neu = getNewPhrases();
  const fut = getFuturePhrases();
  const hard = getHardPhrases();
  const srs = getSrsPhrases();

  document.getElementById('stat-due').textContent = due.length;
  document.getElementById('stat-new').textContent = neu.length;
  document.getElementById('stat-srs').textContent = srs.length;
  document.getElementById('stat-future').textContent = fut.length;
  document.getElementById('stat-hard').textContent = hard.length;

  const sub = document.getElementById('hero-sub');
  if (due.length === 0) {
    sub.textContent = 'Nada pendente. Volte amanhã ou adicione frases.';
  } else {
    const n = neu.length;
    const r = due.length - n;
    sub.textContent = `${n} nova${n !== 1 ? 's' : ''} · ${r} revisão${r !== 1 ? 'ões' : ''}`;
  }

  const btn = document.getElementById('btn-start-study');
  btn.disabled = due.length === 0;

  document.getElementById('m-total').textContent = phrasesData.length;
  document.getElementById('m-new').textContent = neu.length;
  document.getElementById('m-due').textContent = due.length;
  document.getElementById('m-future').textContent = fut.length;
  document.getElementById('m-srs').textContent = srs.length;
  document.getElementById('m-hard').textContent = hard.length;
}

function switchView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === name);
  });
  if (name === 'library') renderLibrary();
  if (name === 'hard') renderHard();
  if (name === 'manage') updateStats();
}

/* ---------- Library / Hard lists ---------- */
function renderPhraseCard(p) {
  const t = todayStr();
  const isDue = !p.srs.dataEstudo || (p.srs.proximaRevisao && p.srs.proximaRevisao <= t);
  const tags = [];
  if (p.srs.nivel > 0) tags.push(`<span class="tag lvl">Nv ${p.srs.nivel}</span>`);
  if (p.dificil) tags.push(`<span class="tag fire"><i class="fa-solid fa-fire"></i></span>`);
  if (isDue) tags.push(`<span class="tag due">Hoje</span>`);

  return `
    <div class="phrase-card" data-id="${p.id}">
      <div class="phrase-card-top">
        <span class="phrase-id">#${p.id}</span>
        <div style="display:flex;gap:0.25rem;">
          <button class="btn-icon ${p.dificil ? 'active-fire' : ''}" style="width:32px;height:32px;" data-action="fire" title="Difícil">
            <i class="fa-solid fa-fire"></i>
          </button>
          <button class="btn-icon" style="width:32px;height:32px;" data-action="audio" title="Ouvir">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        </div>
      </div>
      <div class="phrase-hanzi">${escapeHtml(p.hanzi)}</div>
      <div class="phrase-pinyin">${escapeHtml(p.pinyin)}</div>
      <div class="phrase-pt">${escapeHtml(p.traducao)}</div>
      <div class="phrase-meta">${tags.join('')}</div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLibrary() {
  const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
  let list = phrasesData.slice().sort((a, b) => a.id - b.id);
  if (q) {
    list = list.filter(p =>
      String(p.id).includes(q) ||
      p.hanzi.toLowerCase().includes(q) ||
      p.pinyin.toLowerCase().includes(q) ||
      p.traducao.toLowerCase().includes(q)
    );
  }
  const el = document.getElementById('library-list');
  const empty = document.getElementById('library-empty');
  if (list.length === 0) {
    el.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    el.innerHTML = list.map(renderPhraseCard).join('');
  }
}

function renderHard() {
  const list = getHardPhrases().sort((a, b) => a.id - b.id);
  const el = document.getElementById('hard-list');
  const empty = document.getElementById('hard-empty');
  const btn = document.getElementById('btn-study-hard');
  if (list.length === 0) {
    el.innerHTML = '';
    empty.classList.remove('hidden');
    btn.classList.add('hidden');
  } else {
    empty.classList.add('hidden');
    el.innerHTML = list.map(renderPhraseCard).join('');
    btn.classList.remove('hidden');
  }
}

/* ---------- Study engine ---------- */
function pickExerciseType(forceMode) {
  const mode = forceMode || selectedMode;
  if (mode === 'mixed') {
    const types = ['pt2hanzi', 'hanzi2pt', 'mc'];
    return types[Math.floor(Math.random() * types.length)];
  }
  return mode;
}

function buildMcOptions(correctPhrase) {
  const others = phrasesData
    .filter(p => p.id !== correctPhrase.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(p => p.traducao);
  const opts = [correctPhrase.traducao, ...others].sort(() => Math.random() - 0.5);
  return opts;
}

function persistSession() {
  try {
    if (!studyQueue.length) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    const payload = {
      version: 1,
      selectedMode,
      studyIndex,
      answered,
      sessionLog,
      sessionStartedAt: sessionStartedAt || new Date().toISOString(),
      queueIds: studyQueue.map(p => p.id),
      currentExercise: currentExercise ? {
        phraseId: currentExercise.phrase.id,
        type: currentExercise.type,
        options: currentExercise.options || null
      } : null
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('persistSession failed', e);
  }
}

function clearPersistedSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStartedAt = null;
}

function loadPersistedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.queueIds) || !data.queueIds.length) return null;
    const queue = data.queueIds
      .map(id => phrasesData.find(p => p.id === id))
      .filter(Boolean);
    if (!queue.length) {
      clearPersistedSession();
      return null;
    }
    return { data, queue };
  } catch {
    clearPersistedSession();
    return null;
  }
}

function offerResumeSession() {
  const loaded = loadPersistedSession();
  if (!loaded) return;
  const { data, queue } = loaded;
  const done = Array.isArray(data.sessionLog) ? data.sessionLog.length : 0;
  const total = queue.length;
  const idx = Math.min(data.studyIndex || 0, total - 1);

  Swal.fire({
    title: 'Sessão interrompida',
    html: `
      <p style="color:#94a3b8;font-size:0.9rem;line-height:1.45;text-align:left;">
        Há uma revisão salva: <strong style="color:#f1f5f9;">${done}</strong> respondida(s) de
        <strong style="color:#f1f5f9;">${total}</strong> · posição
        <strong style="color:#f1f5f9;">${idx + 1}/${total}</strong>.
      </p>
      <p style="color:#94a3b8;font-size:0.85rem;text-align:left;margin-top:0.5rem;">
        Pode continuar de onde parou. O relatório final incluirá tudo o que já foi respondido.
      </p>
    `,
    icon: 'info',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Continuar',
    denyButtonText: 'Descartar',
    cancelButtonText: 'Depois',
    background: '#1e293b',
    color: '#f1f5f9',
    confirmButtonColor: '#f59e0b',
    denyButtonColor: '#ef4444',
    cancelButtonColor: '#475569'
  }).then(res => {
    if (res.isConfirmed) {
      resumeSession(data, queue);
    } else if (res.isDenied) {
      clearPersistedSession();
      Swal.fire({
        toast: true, position: 'top', icon: 'info', title: 'Sessão descartada',
        showConfirmButton: false, timer: 1600, background: '#1e293b', color: '#f1f5f9'
      });
    }
  });
}

function resumeSession(data, queue) {
  studyQueue = queue;
  studyIndex = Math.min(data.studyIndex || 0, queue.length - 1);
  sessionLog = Array.isArray(data.sessionLog) ? data.sessionLog : [];
  selectedMode = data.selectedMode || selectedMode;
  sessionStartedAt = data.sessionStartedAt || new Date().toISOString();
  answered = false;

  // If last card was already answered, advance to next
  if (data.answered && studyIndex < studyQueue.length - 1) {
    studyIndex += 1;
  } else if (data.answered && studyIndex >= studyQueue.length - 1) {
    // session was basically done
    clearPersistedSession();
    showSessionSummary(false);
    return;
  }

  // Restore exercise type for current card if same phrase
  const ce = data.currentExercise;
  if (ce && ce.phraseId === studyQueue[studyIndex].id && !data.answered) {
    currentExercise = {
      phrase: studyQueue[studyIndex],
      type: ce.type,
      options: ce.options || null
    };
    document.getElementById('study-screen').classList.add('active');
    showCurrentExercise(true);
  } else {
    currentExercise = null;
    document.getElementById('study-screen').classList.add('active');
    showCurrentExercise(false);
  }
  persistSession();
}

function startStudy(queue) {
  if (!queue || queue.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Nada para estudar',
      text: 'Não há frases pendentes no momento.',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f59e0b'
    });
    return;
  }
  clearPersistedSession();
  studyQueue = queue.slice().sort(() => Math.random() - 0.5);
  studyIndex = 0;
  answered = false;
  sessionLog = [];
  sessionStartedAt = new Date().toISOString();
  document.getElementById('study-screen').classList.add('active');
  showCurrentExercise(false);
  persistSession();
}

function showCurrentExercise(restore) {
  answered = false;
  const phrase = studyQueue[studyIndex];
  if (!phrase) return;

  if (!(restore && currentExercise && currentExercise.phrase && currentExercise.phrase.id === phrase.id)) {
    const type = pickExerciseType();
    currentExercise = { phrase, type };
  } else {
    currentExercise.phrase = phrase;
  }
  const type = currentExercise.type;

  document.getElementById('study-counter').textContent = `${studyIndex + 1}/${studyQueue.length}`;
  const pct = ((studyIndex) / studyQueue.length) * 100;
  document.getElementById('study-bar').style.width = pct + '%';

  const promptEl = document.getElementById('study-prompt');
  const labelEl = document.getElementById('study-label');
  const typingArea = document.getElementById('typing-area');
  const mcArea = document.getElementById('mc-area');
  const answerInput = document.getElementById('study-answer');
  const feedback = document.getElementById('feedback');
  const btnCheck = document.getElementById('btn-check');
  const btnNext = document.getElementById('btn-next');
  const btnReveal = document.getElementById('btn-reveal');

  feedback.className = 'feedback-box';
  feedback.innerHTML = '';
  btnCheck.classList.remove('hidden');
  btnNext.classList.add('hidden');
  btnReveal.classList.remove('hidden');
  answerInput.value = '';
  answerInput.classList.remove('zh');
  answerInput.disabled = false;

  if (type === 'pt2hanzi') {
    labelEl.textContent = 'Digite o hanzi (chinês)';
    promptEl.className = 'study-prompt-pt';
    promptEl.textContent = phrase.traducao;
    typingArea.classList.remove('hidden');
    mcArea.classList.add('hidden');
    document.getElementById('input-label').textContent = 'Hanzi';
    answerInput.classList.add('zh');
    answerInput.placeholder = 'Digite em chinês…';
    answerInput.focus();
  } else if (type === 'hanzi2pt') {
    labelEl.textContent = 'Digite a tradução em português';
    promptEl.className = 'study-prompt-hanzi';
    promptEl.textContent = phrase.hanzi;
    typingArea.classList.remove('hidden');
    mcArea.classList.add('hidden');
    document.getElementById('input-label').textContent = 'Português';
    answerInput.placeholder = 'Digite a tradução…';
    answerInput.focus();
  } else {
    // multiple choice — show hanzi, choose translation
    labelEl.textContent = 'Escolha a tradução correta';
    promptEl.className = 'study-prompt-hanzi';
    promptEl.textContent = phrase.hanzi;
    typingArea.classList.add('hidden');
    mcArea.classList.remove('hidden');
    const opts = (restore && currentExercise.options && currentExercise.options.length)
      ? currentExercise.options
      : buildMcOptions(phrase);
    currentExercise.options = opts;
    mcArea.innerHTML = opts.map((o, i) =>
      `<button class="mc-option" data-idx="${i}">${escapeHtml(o)}</button>`
    ).join('');
    btnCheck.classList.add('hidden'); // auto on select
  }
  persistSession();
}

async function checkAnswer() {
  if (answered || !currentExercise) return;
  const { phrase, type } = currentExercise;
  let userAns = '';

  if (type === 'mc') {
    const selected = document.querySelector('.mc-option.selected');
    if (!selected) {
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'warning',
        title: 'Escolha uma opção',
        showConfirmButton: false,
        timer: 1500,
        background: '#1e293b',
        color: '#f1f5f9'
      });
      return;
    }
    userAns = selected.textContent;
  } else {
    userAns = document.getElementById('study-answer').value;
    document.getElementById('study-answer').disabled = true;
  }

  // Prevent double-tap while evaluating
  answered = true;
  const btnCheck = document.getElementById('btn-check');
  const prevLabel = btnCheck.innerHTML;
  btnCheck.disabled = true;
  if (type !== 'mc') btnCheck.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando…';

  let result;
  if (type === 'mc') {
    const correct = normalize(userAns) === normalize(phrase.traducao);
    result = { correct, exactMatch: correct, method: 'rules', similarity: null };
    document.querySelectorAll('.mc-option').forEach(btn => {
      btn.disabled = true;
      if (normalize(btn.textContent) === normalize(phrase.traducao)) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('wrong');
      }
    });
  } else {
    result = await evaluateAnswer(type, userAns, phrase);
  }

  btnCheck.disabled = false;
  btnCheck.innerHTML = prevLabel;

  const { correct, exactMatch, method, similarity } = result;
  const feedback = document.getElementById('feedback');
  feedback.classList.add('show', correct ? 'ok' : 'fail');

  let promptText = '';
  let expectedText = '';
  if (type === 'pt2hanzi') {
    promptText = phrase.traducao;
    expectedText = phrase.hanzi;
  } else {
    promptText = phrase.hanzi;
    expectedText = phrase.traducao;
  }

  if (correct) {
    let softNote = '';
    if (!exactMatch) {
      if (method === 'semantic' && similarity != null) {
        softNote = `<div style="font-size:0.8rem;opacity:0.85;margin-top:0.25rem;">Aceito por similaridade semântica (${Math.round(similarity * 100)}%).</div>`;
      } else if (type === 'pt2hanzi') {
        softNote = '<div style="font-size:0.8rem;opacity:0.85;margin-top:0.25rem;">Ordem diferente do gabarito, mas aceito.</div>';
      } else if (type === 'hanzi2pt') {
        softNote = '<div style="font-size:0.8rem;opacity:0.85;margin-top:0.25rem;">Quase idêntico ao gabarito — aceito.</div>';
      }
    }
    feedback.innerHTML = `<strong>Correto!</strong>${softNote}`;
    markCorrect(phrase.id);
  } else {
    feedback.innerHTML = `<strong>Incorreto</strong><div class="answer">${escapeHtml(expectedText)}</div>`;
    markWrong(phrase.id);
  }

  sessionLog.push({
    id: phrase.id,
    type,
    prompt: promptText,
    expected: expectedText,
    userAnswer: userAns || '(vazio)',
    systemCorrect: correct,
    exactMatch,
    revealed: false,
    method: method || 'rules',
    similarity,
    hanzi: phrase.hanzi,
    pinyin: phrase.pinyin,
    traducao: phrase.traducao
  });

  document.getElementById('btn-check').classList.add('hidden');
  document.getElementById('btn-reveal').classList.add('hidden');
  document.getElementById('btn-next').classList.remove('hidden');

  const pct = ((studyIndex + 1) / studyQueue.length) * 100;
  document.getElementById('study-bar').style.width = pct + '%';
  persistSession();
}

function revealAnswer() {
  if (answered || !currentExercise) return;
  const { phrase, type } = currentExercise;
  const right = type === 'pt2hanzi' ? phrase.hanzi : phrase.traducao;
  const userAns = type === 'mc'
    ? (document.querySelector('.mc-option.selected')?.textContent || '(não escolheu)')
    : (document.getElementById('study-answer').value || '(vazio)');

  const feedback = document.getElementById('feedback');
  feedback.classList.add('show', 'fail');
  feedback.innerHTML = `<strong>Resposta:</strong><div class="answer">${escapeHtml(right)}</div>`;
  markWrong(phrase.id);
  answered = true;

  sessionLog.push({
    id: phrase.id,
    type,
    prompt: type === 'pt2hanzi' ? phrase.traducao : phrase.hanzi,
    expected: right,
    userAnswer: userAns,
    systemCorrect: false,
    exactMatch: false,
    revealed: true,
    method: semanticEnabled && semanticReady ? 'semantic-available' : 'rules',
    similarity: null,
    hanzi: phrase.hanzi,
    pinyin: phrase.pinyin,
    traducao: phrase.traducao
  });

  document.getElementById('btn-check').classList.add('hidden');
  document.getElementById('btn-reveal').classList.add('hidden');
  document.getElementById('btn-next').classList.remove('hidden');
  document.getElementById('study-answer').disabled = true;
  if (type === 'mc') {
    document.querySelectorAll('.mc-option').forEach(btn => {
      btn.disabled = true;
      if (normalize(btn.textContent) === normalize(phrase.traducao)) btn.classList.add('correct');
    });
  }
  persistSession();
}

function nextExercise() {
  studyIndex++;
  answered = false;
  if (studyIndex >= studyQueue.length) {
    finishStudy();
    return;
  }
  showCurrentExercise(false);
  persistSession();
}

function typeLabel(type) {
  if (type === 'pt2hanzi') return 'PT → Hanzi';
  if (type === 'hanzi2pt') return 'Hanzi → PT';
  if (type === 'mc') return 'Múltipla escolha';
  return type;
}

function buildSessionReport() {
  const total = sessionLog.length;
  const ok = sessionLog.filter(x => x.systemCorrect).length;
  const soft = sessionLog.filter(x => x.systemCorrect && !x.exactMatch).length;
  const fail = sessionLog.filter(x => !x.systemCorrect).length;
  const revealed = sessionLog.filter(x => x.revealed).length;
  const semanticCount = sessionLog.filter(x => x.method === 'semantic').length;
  const date = new Date().toLocaleString('pt-BR');
  const modeDesc = semanticEnabled && semanticReady
    ? 'Correção SEMÂNTICA offline ativa (embedding multilingual ~100MB) + fallback de regras'
    : 'Correção por REGRAS locais (exato / anagrama de caracteres / Levenshtein)';

  let items = '';
  sessionLog.forEach((entry, i) => {
    const status = entry.revealed
      ? 'REVELOU (contado como erro)'
      : entry.systemCorrect
        ? (entry.exactMatch ? 'ACERTO EXATO (sistema)' : 'ACERTO FLEXÍVEL (sistema)')
        : 'ERRO (sistema)';
    const methodLine = entry.method === 'semantic'
      ? `- Método: semântico (similaridade ${entry.similarity != null ? entry.similarity : 'n/d'})`
      : `- Método: regras locais`;
    items += `
### Item ${i + 1} — #${entry.id} — ${typeLabel(entry.type)}
- Status do app: ${status}
${methodLine}
- Enunciado mostrado: ${entry.prompt}
- Gabarito do app: ${entry.expected}
- Resposta do usuário: ${entry.userAnswer}
- Hanzi completo: ${entry.hanzi}
- Pinyin: ${entry.pinyin}
- Tradução PT: ${entry.traducao}
`;
  });

  const prompt = `Você é um professor de chinês mandarim (nível iniciante/intermediário) avaliando um relatório de treino de digitação de FRASES (não palavras isoladas).

Contexto do app:
- Modo de correção desta sessão: ${modeDesc}
- Regras locais: aceitam mesma sequência de caracteres em ordem diferente e similaridade alta de digitação.
- Modo semântico (se ativo): usa embeddings multilingues (paraphrase-multilingual-MiniLM); limiar ~0,78 de similaridade de cosseno.
- Pode haver falsos positivos (ordem que muda o sentido) ou falsos negativos (sinônimos corretos abaixo do limiar).

Sua tarefa:
1. Para cada item, diga se a resposta do usuário está semanticamente CORRETA, PARCIALMENTE CORRETA ou INCORRETA em relação ao enunciado e ao sentido da frase.
2. Se o app marcou acerto flexível ou semântico, confirme se realmente merece acerto.
3. Se o app marcou ERRO mas a resposta estiver correta (sinônimo, ordem natural, variação aceitável), diga que deveria contar como acerto.
4. No final, resumo: acertos reais, erros reais, e 2–3 dicas de estudo.

Responda em português, de forma objetiva, item por item.

--- RELATÓRIO DA SESSÃO ---
Data: ${date}
Modo de correção: ${modeDesc}
Total respondido: ${total}
Marcados corretos pelo app: ${ok} (flexíveis/não-exatos: ${soft}; avaliados por semântica: ${semanticCount})
Marcados errados pelo app: ${fail} (inclui ${revealed} revelação de resposta)
${items}
--- FIM DO RELATÓRIO ---`;

  return prompt;
}

function showSessionSummary(partial) {
  document.getElementById('study-screen').classList.remove('active');
  updateStats();
  if (currentView === 'library') renderLibrary();
  if (currentView === 'hard') renderHard();

  // Sessão completa → limpa retomada. Parcial → mantém no localStorage.
  if (!partial) {
    clearPersistedSession();
  } else {
    persistSession();
  }

  if (sessionLog.length === 0) {
    if (!partial) {
      Swal.fire({
        icon: 'success',
        title: 'Sessão concluída!',
        text: 'Nenhuma resposta registrada.',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#f59e0b'
      });
    }
    return;
  }

  const total = sessionLog.length;
  const ok = sessionLog.filter(x => x.systemCorrect).length;
  const soft = sessionLog.filter(x => x.systemCorrect && !x.exactMatch).length;

  Swal.fire({
    icon: 'success',
    title: partial ? 'Sessão interrompida' : 'Sessão concluída!',
    html: `
      <p style="margin:0.5rem 0;color:#94a3b8;">
        ${total} respondida${total !== 1 ? 's' : ''} ·
        <strong style="color:#22c55e;">${ok} correta${ok !== 1 ? 's' : ''}</strong>
        ${soft ? ` <span style="color:#f59e0b;">(${soft} flexível${soft !== 1 ? 'is' : ''})</span>` : ''}
      </p>
      <p style="font-size:0.85rem;color:#94a3b8;margin-top:0.75rem;">
        Gere um relatório com prompt pronto para colar em uma IA e validar se os acertos/erros estavam realmente corretos.
      </p>
    `,
    background: '#1e293b',
    color: '#f1f5f9',
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-copy"></i> Copiar relatório p/ IA',
    cancelButtonText: 'Fechar',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#475569',
    reverseButtons: true
  }).then(res => {
    if (res.isConfirmed) {
      const report = buildSessionReport();
      navigator.clipboard.writeText(report).then(() => {
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: 'Relatório copiado! Cole em qualquer IA.',
          showConfirmButton: false,
          timer: 2200,
          background: '#1e293b',
          color: '#f1f5f9'
        });
      }).catch(() => {
        // Fallback: mostrar em textarea para copiar manualmente
        Swal.fire({
          title: 'Copie o relatório',
          html: `<textarea id="report-ta" style="width:100%;height:280px;background:#0f172a;color:#f1f5f9;border:1px solid #475569;border-radius:10px;padding:0.75rem;font-size:0.75rem;font-family:ui-monospace,monospace;">${report.replace(/</g, '&lt;')}</textarea>`,
          background: '#1e293b',
          color: '#f1f5f9',
          confirmButtonText: 'Fechar',
          confirmButtonColor: '#f59e0b',
          width: '90%'
        });
      });
    }
  });
}

function finishStudy() {
  showSessionSummary(false);
}

function closeStudy() {
  const stillGoing = studyIndex < studyQueue.length && !(studyIndex === studyQueue.length - 1 && answered);

  if (stillGoing) {
    persistSession();
    Swal.fire({
      title: 'Sair da sessão?',
      text: 'O progresso fica salvo neste aparelho. Na próxima abertura você pode continuar de onde parou e gerar o relatório completo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sair e salvar',
      cancelButtonText: 'Continuar estudando',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#475569'
    }).then(res => {
      if (res.isConfirmed) {
        if (sessionLog.length > 0) {
          showSessionSummary(true);
        } else {
          document.getElementById('study-screen').classList.remove('active');
          updateStats();
        }
      }
    });
  } else if (sessionLog.length > 0) {
    showSessionSummary(false);
  } else {
    clearPersistedSession();
    document.getElementById('study-screen').classList.remove('active');
    updateStats();
  }
}

/* ---------- Detail / Form ---------- */
function openDetail(id) {
  const p = phrasesData.find(x => x.id === id);
  if (!p) return;
  currentDetailId = id;
  document.getElementById('detail-title').textContent = `#${p.id}`;
  document.getElementById('d-hanzi').textContent = p.hanzi;
  document.getElementById('d-pinyin').textContent = p.pinyin;
  document.getElementById('d-pt').textContent = p.traducao;
  document.getElementById('d-lvl').textContent = `${p.srs.nivel} / 17`;
  document.getElementById('d-last').textContent = p.srs.dataEstudo || 'Nunca';
  document.getElementById('d-next').textContent = p.srs.proximaRevisao || 'Pendente';
  document.getElementById('d-count').textContent = p.srs.totalEstudos || 0;

  const fireBtn = document.getElementById('d-fire');
  if (p.dificil) {
    fireBtn.innerHTML = '<i class="fa-solid fa-fire"></i> Remover difícil';
    fireBtn.classList.add('btn-warning-ish');
  } else {
    fireBtn.innerHTML = '<i class="fa-solid fa-fire"></i> Marcar difícil';
  }
  document.getElementById('modal-detail').classList.add('active');
}

function closeDetail() {
  document.getElementById('modal-detail').classList.remove('active');
  currentDetailId = null;
}

function openForm(editId) {
  document.getElementById('phrase-form').reset();
  document.getElementById('form-id').value = editId || '';
  if (editId) {
    const p = phrasesData.find(x => x.id === editId);
    if (p) {
      document.getElementById('f-hanzi').value = p.hanzi;
      document.getElementById('f-pinyin').value = p.pinyin;
      document.getElementById('f-pt').value = p.traducao;
      document.getElementById('form-title').textContent = `Editar #${p.id}`;
    }
  } else {
    document.getElementById('form-title').textContent = 'Nova frase';
  }
  document.getElementById('modal-form').classList.add('active');
}

function closeForm() {
  document.getElementById('modal-form').classList.remove('active');
}

function savePhrase(e) {
  e.preventDefault();
  const idVal = document.getElementById('form-id').value;
  const hanzi = document.getElementById('f-hanzi').value.trim();
  const pinyin = document.getElementById('f-pinyin').value.trim();
  const pt = document.getElementById('f-pt').value.trim();
  if (!hanzi || !pinyin || !pt) return;

  if (idVal) {
    const item = phrasesData.find(p => p.id === parseInt(idVal, 10));
    if (item) {
      item.hanzi = hanzi;
      item.pinyin = pinyin;
      item.traducao = pt;
    }
  } else {
    const newId = phrasesData.length ? Math.max(...phrasesData.map(p => p.id)) + 1 : 1;
    phrasesData.push({
      id: newId,
      hanzi,
      pinyin,
      traducao: pt,
      dificil: false,
      srs: { nivel: 0, dataEstudo: null, proximaRevisao: null, totalEstudos: 0 }
    });
  }
  save();
  syncIfConnected();
  closeForm();
  updateStats();
  if (currentView === 'library') renderLibrary();
  if (currentView === 'hard') renderHard();
  Swal.fire({
    toast: true,
    position: 'top',
    icon: 'success',
    title: 'Frase salva',
    showConfirmButton: false,
    timer: 1400,
    background: '#1e293b',
    color: '#f1f5f9'
  });
}

function deletePhrase(id) {
  Swal.fire({
    title: 'Excluir frase?',
    text: 'Esta ação não pode ser desfeita.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Excluir',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f1f5f9',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#475569'
  }).then(res => {
    if (res.isConfirmed) {
      phrasesData = phrasesData.filter(p => p.id !== id);
      save();
      syncIfConnected();
      closeDetail();
      updateStats();
      if (currentView === 'library') renderLibrary();
      if (currentView === 'hard') renderHard();
    }
  });
}

function toggleHard(id) {
  const p = phrasesData.find(x => x.id === id);
  if (!p) return;
  p.dificil = !p.dificil;
  save();
  syncIfConnected();
  updateStats();
  if (currentView === 'library') renderLibrary();
  if (currentView === 'hard') renderHard();
  if (currentDetailId === id) openDetail(id);
}

function speakChinese(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/* ---------- Import / Export / Reset ---------- */
function exportJSON() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(phrasesData, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = 'Chines_SRS_Backup.json';
  a.click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('not array');
      phrasesData = data;
      phrasesData.forEach(p => {
        if (!p.srs) p.srs = { nivel: 0, dataEstudo: null, proximaRevisao: null, totalEstudos: 0 };
        if (typeof p.dificil === 'undefined') p.dificil = false;
      });
      save();
      syncIfConnected();
      updateStats();
      if (currentView === 'library') renderLibrary();
      Swal.fire({
        icon: 'success',
        title: 'Importado!',
        text: `${data.length} frases carregadas.`,
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#f59e0b'
      });
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Arquivo inválido',
        text: 'O JSON não pôde ser lido.',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#f59e0b'
      });
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetSystem() {
  Swal.fire({
    title: 'Resetar sistema?',
    text: 'Todo o progresso será apagado e as frases padrão restauradas.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, resetar',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f1f5f9',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#475569'
  }).then(res => {
    if (res.isConfirmed) {
      localStorage.removeItem('chinese_srs_phrases');
      phrasesData = JSON.parse(JSON.stringify(defaultPhrases));
      phrasesData.forEach(p => {
        p.srs = { nivel: 0, dataEstudo: null, proximaRevisao: null, totalEstudos: 0 };
        p.dificil = false;
      });
      save();
      syncIfConnected();
      updateStats();
      if (currentView === 'library') renderLibrary();
      if (currentView === 'hard') renderHard();
      Swal.fire({
        icon: 'success',
        title: 'Sistema resetado',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#f59e0b'
      });
    }
  });
}

/* ---------- P2P ---------- */
function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function openP2P() {
  document.getElementById('modal-p2p').classList.add('active');
  if (!peer) {
    document.getElementById('my-peer-id').textContent = 'Gerando…';
    const shortId = 'CHIN-' + generateShortCode();
    peer = new Peer(shortId);
    peer.on('open', id => {
      document.getElementById('my-peer-id').textContent = id;
      const box = document.getElementById('qrcode-box');
      box.innerHTML = '';
      new QRCode(box, { text: id, width: 140, height: 140 });
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        peer.destroy();
        peer = null;
        openP2P();
      }
    });
    peer.on('connection', conn => {
      peerConn = conn;
      setupPeerListeners();
    });
  }
}

function closeP2P() {
  document.getElementById('modal-p2p').classList.remove('active');
}

function copyPeerId() {
  const t = document.getElementById('my-peer-id').textContent;
  if (t && !t.includes('Gerando')) {
    navigator.clipboard.writeText(t);
    Swal.fire({
      toast: true, position: 'top', icon: 'success', title: 'Código copiado',
      showConfirmButton: false, timer: 1200, background: '#1e293b', color: '#f1f5f9'
    });
  }
}

function connectPeer() {
  const remote = document.getElementById('remote-peer-id').value.trim();
  if (!remote || !peer) return;
  document.getElementById('p2p-status').textContent = 'Conectando…';
  peerConn = peer.connect(remote);
  setupPeerListeners();
}

function setupPeerListeners() {
  peerConn.on('open', () => {
    document.getElementById('p2p-status').textContent = 'Conectado! Sincronizando…';
    peerConn.send({ type: 'SYNC_DATA', data: phrasesData });
  });
  peerConn.on('data', payload => {
    if (payload.type === 'SYNC_DATA' && Array.isArray(payload.data)) {
      phrasesData = payload.data;
      save();
      updateStats();
      if (currentView === 'library') renderLibrary();
      document.getElementById('p2p-status').textContent = 'Sincronizado com sucesso!';
    }
  });
  peerConn.on('close', () => {
    document.getElementById('p2p-status').textContent = 'Conexão encerrada.';
  });
}

function syncIfConnected() {
  if (peerConn && peerConn.open) {
    peerConn.send({ type: 'SYNC_DATA', data: phrasesData });
  }
}

/* ---------- Event listeners ---------- */
document.addEventListener('DOMContentLoaded', () => {
  load();
  updateStats();

  // Splash
  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');
    setTimeout(() => {
      document.getElementById('splash')?.remove();
      // Após splash, oferece retomada se houver sessão salva
      offerResumeSession();
    }, 450);
  }, 900);

  // Salva sessão se o app for fechado / segundo plano
  window.addEventListener('pagehide', () => {
    if (studyQueue.length) persistSession();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && studyQueue.length) persistSession();
  });

  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = card.dataset.mode;
    });
  });

  // Start study
  document.getElementById('btn-start-study').addEventListener('click', () => {
    startStudy(getDuePhrases());
  });

  document.getElementById('btn-study-hard').addEventListener('click', () => {
    startStudy(getHardPhrases());
  });

  // Study controls
  document.getElementById('study-close').addEventListener('click', closeStudy);
  document.getElementById('btn-check').addEventListener('click', checkAnswer);
  document.getElementById('btn-next').addEventListener('click', nextExercise);
  document.getElementById('btn-reveal').addEventListener('click', revealAnswer);
  document.getElementById('study-audio-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentExercise && currentExercise.phrase) {
      speakChinese(currentExercise.phrase.hanzi);
    }
  });

  document.getElementById('study-answer').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!answered) checkAnswer();
      else nextExercise();
    }
  });

  // MC click
  document.getElementById('mc-area').addEventListener('click', e => {
    const btn = e.target.closest('.mc-option');
    if (!btn || answered) return;
    document.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    // auto-check after short delay for better UX
    setTimeout(() => {
      if (!answered) checkAnswer();
    }, 180);
  });

  // Search
  document.getElementById('search-input').addEventListener('input', renderLibrary);

  // List clicks (delegation)
  document.getElementById('library-list').addEventListener('click', handleListClick);
  document.getElementById('hard-list').addEventListener('click', handleListClick);

  function handleListClick(e) {
    const card = e.target.closest('.phrase-card');
    if (!card) return;
    const id = parseInt(card.dataset.id, 10);
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.dataset.action;
      if (action === 'fire') toggleHard(id);
      if (action === 'audio') {
        const p = phrasesData.find(x => x.id === id);
        if (p) speakChinese(p.hanzi);
      }
      return;
    }
    openDetail(id);
  }

  // Detail modal
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('modal-detail').addEventListener('click', e => {
    if (e.target.id === 'modal-detail') closeDetail();
  });
  document.getElementById('d-audio').addEventListener('click', () => {
    const p = phrasesData.find(x => x.id === currentDetailId);
    if (p) speakChinese(p.hanzi);
  });
  document.getElementById('d-fire').addEventListener('click', () => {
    if (currentDetailId) toggleHard(currentDetailId);
  });
  document.getElementById('d-edit').addEventListener('click', () => {
    const id = currentDetailId;
    closeDetail();
    openForm(id);
  });
  document.getElementById('d-delete').addEventListener('click', () => {
    if (currentDetailId) deletePhrase(currentDetailId);
  });

  // Form
  document.getElementById('btn-add').addEventListener('click', () => openForm());
  document.getElementById('form-close').addEventListener('click', closeForm);
  document.getElementById('form-cancel').addEventListener('click', closeForm);
  document.getElementById('modal-form').addEventListener('click', e => {
    if (e.target.id === 'modal-form') closeForm();
  });
  document.getElementById('phrase-form').addEventListener('submit', savePhrase);

  // Manage
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('file-input').addEventListener('change', handleImport);
  document.getElementById('btn-reset').addEventListener('click', resetSystem);
  document.getElementById('btn-p2p').addEventListener('click', openP2P);
  document.getElementById('btn-semantic-enable')?.addEventListener('click', enableSemanticModel);
  document.getElementById('btn-semantic-disable')?.addEventListener('click', disableSemanticModel);
  updateSemanticUI();
  // Se já estava ativado antes, tenta recarregar do cache do browser (offline após 1º download)
  if (semanticEnabled) {
    loadSemanticModel().catch(() => {});
  }

  document.getElementById('btn-uninstall-help')?.addEventListener('click', showUninstallHelp);
  document.getElementById('btn-resume-session')?.addEventListener('click', () => {
    const loaded = loadPersistedSession();
    if (loaded) resumeSession(loaded.data, loaded.queue);
    else updateResumeButton();
  });
  updateResumeButton();

  // Chat IA
  loadChatConfig();
  document.getElementById('btn-save-chat-cfg')?.addEventListener('click', saveChatConfig);
  document.getElementById('btn-chat-send')?.addEventListener('click', sendChatMessage);
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChatMessage();
    }
  });
  document.getElementById('btn-chat-report')?.addEventListener('click', () => {
    if (!sessionLog.length) {
      const loaded = loadPersistedSession();
      if (loaded && loaded.data.sessionLog?.length) {
        sessionLog = loaded.data.sessionLog;
      }
    }
    if (!sessionLog.length) {
      Swal.fire({
        toast: true, position: 'top', icon: 'info',
        title: 'Nenhum relatório de sessão disponível',
        showConfirmButton: false, timer: 1800,
        background: '#1e293b', color: '#f1f5f9'
      });
      return;
    }
    const report = buildSessionReport();
    document.getElementById('chat-input').value =
      'Avalie este relatório de estudo e diga o que eu errei de verdade:\n\n' + report;
  });
});

function updateResumeButton() {
  const btn = document.getElementById('btn-resume-session');
  if (!btn) return;
  const has = !!loadPersistedSession();
  btn.classList.toggle('hidden', !has);
}

function showUninstallHelp() {
  Swal.fire({
    title: 'Como desinstalar',
    html: `
      <div style="text-align:left;font-size:0.88rem;color:#94a3b8;line-height:1.5;">
        <p><strong style="color:#f1f5f9;">Android (Chrome)</strong></p>
        <ol style="padding-left:1.1rem;margin:0.35rem 0 0.75rem;">
          <li>Configurações do celular → Apps → Chinês SRS → Desinstalar</li>
          <li>Ou: pressione longo o ícone → Informações do app → Desinstalar</li>
          <li>Depois no Chrome: Configurações de sites → edmilson-hao.github.io → Limpar dados</li>
        </ol>
        <p><strong style="color:#f1f5f9;">Por que não há botão “Desinstalar” no app?</strong></p>
        <p>O navegador / sistema operacional não permite que uma PWA se desinstale sozinha por segurança.</p>
      </div>
    `,
    background: '#1e293b',
    color: '#f1f5f9',
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'Entendi'
  });
}

/* ---------- Chat IA (API opcional) ---------- */
let chatHistory = [
  {
    role: 'system',
    content: 'Você é um tutor de chinês mandarim paciente. Ajuda com frases, pinyin, tradução PT-BR e SRS. Responda em português, de forma clara e objetiva.'
  }
];

function loadChatConfig() {
  const key = localStorage.getItem('chinese_srs_chat_key') || '';
  const base = localStorage.getItem('chinese_srs_chat_base') || 'https://api.x.ai/v1';
  const model = localStorage.getItem('chinese_srs_chat_model') || 'grok-3';
  const k = document.getElementById('chat-api-key');
  const b = document.getElementById('chat-api-base');
  const m = document.getElementById('chat-model');
  if (k) k.value = key;
  if (b) b.value = base;
  if (m) m.value = model;
  const log = document.getElementById('chat-log');
  if (log && !log.children.length) {
    appendChatBubble('system', 'Configure a chave da API acima para conversar. Compatível com xAI (Grok) e APIs no formato OpenAI.');
  }
}

function saveChatConfig() {
  localStorage.setItem('chinese_srs_chat_key', document.getElementById('chat-api-key').value.trim());
  localStorage.setItem('chinese_srs_chat_base', document.getElementById('chat-api-base').value.trim() || 'https://api.x.ai/v1');
  localStorage.setItem('chinese_srs_chat_model', document.getElementById('chat-model').value.trim() || 'grok-3');
  Swal.fire({
    toast: true, position: 'top', icon: 'success', title: 'Config salva neste aparelho',
    showConfirmButton: false, timer: 1400, background: '#1e293b', color: '#f1f5f9'
  });
}

function appendChatBubble(role, text) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + (role === 'user' ? 'user' : role === 'system' ? 'system' : 'assistant');
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  const apiKey = (document.getElementById('chat-api-key')?.value || localStorage.getItem('chinese_srs_chat_key') || '').trim();
  const base = (document.getElementById('chat-api-base')?.value || 'https://api.x.ai/v1').replace(/\/$/, '');
  const model = (document.getElementById('chat-model')?.value || 'grok-3').trim();

  if (!apiKey) {
    Swal.fire({
      icon: 'info',
      title: 'Chave de API necessária',
      text: 'Cole uma chave xAI ou OpenAI-compatible em Config da aba IA. Sem chave, o chat online não funciona (o app continua offline para estudo).',
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  input.value = '';
  appendChatBubble('user', text);
  chatHistory.push({ role: 'user', content: text });
  appendChatBubble('system', 'Pensando…');

  try {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        messages: chatHistory.slice(-20),
        temperature: 0.6
      })
    });
    const data = await res.json();
    // remove "Pensando…"
    const log = document.getElementById('chat-log');
    if (log?.lastChild?.classList.contains('system')) log.lastChild.remove();

    if (!res.ok) {
      throw new Error(data.error?.message || data.message || ('HTTP ' + res.status));
    }
    const reply = data.choices?.[0]?.message?.content || '(sem resposta)';
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatBubble('assistant', reply);
  } catch (err) {
    const log = document.getElementById('chat-log');
    if (log?.lastChild?.classList.contains('system')) log.lastChild.remove();
    appendChatBubble('system', 'Erro: ' + (err.message || String(err)));
  }
}

// Keep resume button in sync when session cleared/saved
const _persistSession = persistSession;
persistSession = function () {
  _persistSession();
  updateResumeButton();
};
const _clearPersistedSession = clearPersistedSession;
clearPersistedSession = function () {
  _clearPersistedSession();
  updateResumeButton();
};
  document.getElementById('p2p-close').addEventListener('click', closeP2P);
  document.getElementById('modal-p2p').addEventListener('click', e => {
    if (e.target.id === 'modal-p2p') closeP2P();
  });
  document.getElementById('btn-copy-id').addEventListener('click', copyPeerId);
  document.getElementById('btn-connect-peer').addEventListener('click', connectPeer);
});

/* Service Worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
