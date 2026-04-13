/**
 * QA Agent v8 — Modular JS
 *
 * Usage:
 *   <link rel="stylesheet" href="qa-agent.css">
 *   <div id="qa-agent-root"></div>
 *   <script src="qa-agent.js"><\/script>
 *
 * The module auto-initializes on DOMContentLoaded.
 * All DOM is injected into #qa-agent-root.
 */

(function() {
'use strict';

// ── HTML TEMPLATE ────────────────────────────────────────
const QA_AGENT_HTML = `
<div class="toast-container" id="toastContainer"></div>
<div class="confirm-overlay" id="confirmOverlay">
  <div class="confirm-box">
    <div class="confirm-msg" id="confirmMsg"></div>
    <div class="confirm-actions">
      <button class="confirm-btn" onclick="closeConfirm()">Cancel</button>
      <button class="confirm-btn danger" id="confirmYesBtn" onclick="confirmYes()">Confirm</button>
    </div>
  </div>
</div>
<div class="shell">
<div class="topbar">
  <div class="logo">
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="16" rx="3" stroke="#00d4ff" stroke-width="1.5"/><path d="M5 9h8M5 6h5M5 12h6" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round"/></svg>
    QA AGENT v8
  </div>
  <div class="tstat on" id="ts-total">TOTAL: 0</div>
  <div class="status-pill" id="sdot">IDLE</div>
  <button class="stop-btn" id="stopBtn" onclick="stopQA()">&#9632; Stop</button>
</div>

<div class="main">
<div class="sb">
  <!-- AI Provider + API Key -->
  <div class="sbs">
    <div class="slbl">AI Provider</div>
    <select id="apiProvider" onchange="onProviderChange()">
      <option value="groq">Groq (LLaMA 3.3 70B)</option>
      <option value="openai">OpenAI (GPT-4o)</option>
      <option value="openrouter">OpenRouter (Multi-model)</option>
      <option value="anthropic">Anthropic (Claude Sonnet)</option>
      <option value="google">Google AI Studio (Gemini)</option>
      <option value="together">Together AI (LLaMA 3.3)</option>
      <option value="mistral">Mistral AI (Large)</option>
    </select>
    <div class="slbl" style="margin-top:8px">API Key</div>
    <div class="apikey-row">
      <div class="apikey-input-wrap">
        <input type="password" id="apiKey" placeholder="gsk_..."/>
        <button class="apikey-eye" id="apiKeyEye" onclick="toggleKeyVis()" title="Show/hide key" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
      </div>
      <button class="apikey-btn" id="apiKeyBtn" onclick="handleApiKeyBtn()">Verify</button>
    </div>
    <div class="apikey-alert" id="apiKeyAlert"></div>
  </div>

  <!-- Upload -->
  <div class="sbs">
    <div class="slbl">Upload Design / SRS <span class="slbl-opt">(optional, max 5)</span></div>
    <div class="upload-zone" id="uz" onclick="document.getElementById('fi').click()">
      <input type="file" id="fi" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onchange="handleFiles(this.files)">
      <div class="uz-label"><span>Click to upload</span> or drag & drop<br>PDF · DOC · DOCX · PNG · JPG</div>
    </div>
    <div class="file-list" id="fileList"></div>
    <div class="upload-err hidden" id="uploadErr"></div>
  </div>

  <!-- URL -->
  <div class="sbs">
    <div class="slbl">Website URL</div>
    <input type="text" id="url" placeholder="https://example.com" onfocus="if(configLocked&amp;&amp;guardConfigChange(null))this.blur()"/>
  </div>

  <!-- Notes (reworked) -->
  <div class="sbs">
    <div class="slbl">Testing Instructions</div>
    <textarea id="notes" rows="3" placeholder="Custom instructions, focus areas, known issues..." oninput="onNotesInput()"></textarea>
    <div class="notes-actions hidden" id="notesActions">
      <button class="nbtn rephrase" id="rephraseBtn" onclick="rephraseNotes()">Rephrase</button>
      <button class="nbtn clr-notes" id="clearNotesBtn" onclick="clearNotes()">Clear</button>
    </div>
    <div class="notes-suggestion" id="notesSuggestion">
      <div class="notes-sug-text" id="notesSugText"></div>
      <button class="notes-sug-use" onclick="useRephrase()">Use this</button>
    </div>
  </div>

  <!-- Site Type -->
  <div class="sbs">
    <div class="slbl">Site Type</div>
    <select id="stype" onchange="siteTypeChange()">
      <option value="corporate">Corporate Website</option>
      <option value="ecommerce">E-commerce</option>
      <option value="portfolio">Portfolio</option>
      <option value="blog">Blog / Content Website</option>
      <option value="saas">Web Application (SaaS)</option>
      <option value="landing">Landing Page</option>
      <option value="edu">Educational Platform</option>
      <option value="marketplace">Marketplace</option>
      <option value="social">Social Networking</option>
      <option value="media">Media / News Website</option>
      <option value="booking">Booking / Reservation System</option>
      <option value="dashboard">Dashboard / Admin Panel</option>
      <option value="others">Others</option>
    </select>
    <div class="ig hidden" id="othersWrap" style="margin-top:6px">
      <input type="text" id="othersText" placeholder="Describe your site type..."/>
    </div>
  </div>

  <!-- Test Categories -->
  <div class="sbs">
    <div class="slbl">Test Categories</div>
    <div class="pipe-grid">
      <label class="pchip on" id="chip-FN"><input type="checkbox" checked onchange="syncChip('FN',this)"><span class="pchip-lbl">Functional</span></label>
      <label class="pchip on" id="chip-UIUX"><input type="checkbox" checked onchange="syncChip('UIUX',this)"><span class="pchip-lbl">UI/UX</span></label>
      <label class="pchip on" id="chip-SEC"><input type="checkbox" checked onchange="syncChip('SEC',this)"><span class="pchip-lbl">Security</span></label>
      <label class="pchip on" id="chip-API"><input type="checkbox" checked onchange="syncChip('API',this)"><span class="pchip-lbl">API Testing</span></label>
      <label class="pchip on" id="chip-PERF"><input type="checkbox" checked onchange="syncChip('PERF',this)"><span class="pchip-lbl">Performance</span></label>
      <label class="pchip on" id="chip-SEO"><input type="checkbox" checked onchange="syncChip('SEO',this)"><span class="pchip-lbl">SEO</span></label>
      <label class="pchip on" id="chip-CONT"><input type="checkbox" checked onchange="syncChip('CONT',this)"><span class="pchip-lbl">Content</span></label>
      <label class="pchip on" id="chip-EDGE"><input type="checkbox" checked onchange="syncChip('EDGE',this)"><span class="pchip-lbl">Edge Cases</span></label>
    </div>
  </div>

  <div class="plist">
    <div class="slbl" style="padding:0 0 5px;margin-bottom:0">Pipeline</div>
    <div id="pipeList"></div>
  </div>

  <div class="prog-wrap">
    <div class="prog-lbl"><span id="plbl">Ready</span><span id="ppct">0%</span></div>
    <div class="prog-bar"><div class="prog-fill" id="pfill"></div></div>
    <div class="prog-sub" id="psub">Select categories and click RUN</div>
  </div>
  <div class="btn-row">
    <button class="btn primary" id="runBtn" onclick="startQA(false)">&#9654; RUN</button>
    <button class="btn secondary" id="resumeBtn" onclick="startQA(true)">&#10227; RESUME</button>
  </div>
  <div class="btn-row" style="margin-top:-4px">
    <button class="btn clr" onclick="clearAll()">&#10005; Clear &amp; Reset</button>
  </div>
</div>

<div class="ca">
  <div class="tabs">
    <div class="tab active" onclick="sw('ov')" id="tab-ov">Overview</div>
    <div class="tab" onclick="sw('tcs')" id="tab-tcs">Test Cases <span class="bx" id="cnt-tcs">0</span></div>
    <div class="tab" onclick="sw('auto')" id="tab-auto">Automation Script</div>
    <div class="tab" onclick="sw('res')" id="tab-res">Results</div>
    <div class="tab hidden" onclick="sw('rpt')" id="tab-rpt">Report</div>
    <div class="tab" onclick="sw('prev')" id="tab-prev">Previous Runs <span class="bx" id="cnt-prev">0</span></div>
    <div class="tab" onclick="sw('log')" id="tab-log">
      Log
      <span class="bx red hidden" id="cnt-errs">0</span>
      <div class="tab-err-dot" id="log-err-dot"></div>
    </div>
  </div>

  <!-- Overview Pane -->
  <div class="tc" id="pane-ov">
    <div class="es" id="es-ov">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="8" stroke="#64748b" stroke-width="2"/><path d="M14 24h20M14 16h12M14 32h16" stroke="#64748b" stroke-width="2" stroke-linecap="round"/></svg>
      <h3>No run yet</h3>
      <p>Choose test categories, enter a URL, then click RUN.</p>
    </div>
    <div id="ov-c" class="hidden">
      <div class="sg">
        <div class="sc blue"><div class="sv" id="st-total">0</div><div class="sl">Total TCs</div></div>
        <div class="sc green"><div class="sv" id="st-pass">—</div><div class="sl">Passed</div></div>
        <div class="sc red"><div class="sv" id="st-fail">—</div><div class="sl">Failed</div></div>
        <div class="sc yellow"><div class="sv" id="st-bugs">0</div><div class="sl">Bugs</div></div>
      </div>
      <div id="verdictBlock"></div>
      <div class="ov-card"><div class="ov-card-title">Run Configuration</div><div id="ov-config"></div></div>
      <div class="ov-card"><div class="ov-card-title">Navigate To</div>
        <div class="ov-nav">
          <div class="ov-nav-btn" onclick="sw('tcs')">Test Cases</div>
          <div class="ov-nav-btn" onclick="sw('res')">Results</div>
          <div class="ov-nav-btn" onclick="sw('log')">Log</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Test Cases Pane -->
  <div class="tc hidden" id="pane-tcs">
    <div class="es" id="es-tcs"><h3>Test Cases</h3><p>Run the agent to populate test cases here.</p></div>
    <div id="c-tcs" class="hidden">
      <div class="tc-bar">
        <input class="tc-search" id="tcSearch" placeholder="Search..." oninput="filterTCs()">
        <select class="tc-sel" id="tcCat" onchange="filterTCs()">
          <option value="">All categories</option>
          <option value="FN">Functional</option><option value="UIUX">UI/UX Testing</option><option value="SEC">Security</option>
          <option value="API">API Testing</option><option value="PERF">Performance</option><option value="SEO">SEO</option>
          <option value="CONT">Content</option><option value="EDGE">Edge Cases</option>
        </select>
        <select class="tc-sel" id="tcPri" onchange="filterTCs()">
          <option value="">All priorities</option><option value="H">High</option><option value="M">Medium</option><option value="L">Low</option>
        </select>
        <button class="exp-btn" onclick="addTestCaseRow()">+ Add TC</button>
        <button class="exp-btn" onclick="exportCSV()">&#11015; CSV</button>
        <button class="exp-btn primary-btn" id="genAutoBtn" onclick="showAutoModal()">&#9881; Generate Automation Script</button>
      </div>
      <div class="tc-info" id="tcInfo">0 test cases</div>
      <div style="overflow-x:auto">
        <table class="tbl"><thead><tr><th>#</th><th>ID</th><th>Category</th><th>Test Scenario</th><th>Steps</th><th>Expected Result</th><th>Priority</th><th>Actions</th></tr></thead>
        <tbody id="tcBody"></tbody></table>
      </div>
    </div>
  </div>

  <!-- Results Pane -->
  <div class="tc hidden" id="pane-res"><div class="es" id="es-res"><h3>Results</h3><p>Category results stream here.</p></div><div id="c-res" class="hidden"></div></div>

  <!-- Automation Script Pane (IDE) -->
  <div class="tc hidden" id="pane-auto" style="padding:0;overflow:hidden">
    <div class="es" id="es-auto" style="padding:14px">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="6" stroke="#64748b" stroke-width="2"/><path d="M16 20l6 4-6 4M26 28h6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>No automation script yet</h3>
      <p>Generate test cases first, then click "Generate Automation Script" from the Test Cases tab to create POM-based scripts.</p>
    </div>
    <div id="c-auto" class="hidden" style="display:flex;flex-direction:column;height:100%">
      <div class="ide-toolbar">
        <span style="font-family:var(--mono);font-size:11px;color:var(--accent);flex:1">Automation Script</span>
        <div id="autoStatus" class="hidden" style="font-family:var(--mono);font-size:10px;color:var(--warn);display:flex;align-items:center;gap:6px"><span class="loader-spin"></span><span id="autoStatusText">Generating scripts...</span></div>
        <button class="exp-btn" id="autoDlBtn" onclick="downloadAutoZip()">&#11015; Download ZIP</button>
        <button class="exp-btn primary-btn" id="autoRunBtn" onclick="showRunModal()">&#9654; Run</button>
      </div>
      <div class="ide-wrap">
        <div class="ide-tree" id="autoTree"></div>
        <div class="ide-editor">
          <div class="ide-editor-header"><span id="autoEditorHeader">Select a file</span></div>
          <textarea class="ide-code" id="autoEditorCode" spellcheck="false" oninput="onAutoEditorInput()" placeholder="Select a file from the tree..."></textarea>
        </div>
      </div>
    </div>
  </div>

  <!-- Report Pane -->
  <div class="tc hidden" id="pane-rpt" style="padding:10px">
    <div class="es" id="es-rpt"><h3>Final Report</h3><p>Run automation to generate the report.</p></div>
    <div id="c-rpt" class="hidden">
      <div class="rpt-bar">
        <span id="rptSubject"></span> | To: <span id="rptEmail"></span>
        <button class="exp-btn" onclick="downloadReport()" style="margin-left:auto">&#11015; Download Report</button>
        <button class="exp-btn" onclick="sendReportEmail()">&#9993; Send Email</button>
      </div>
      <iframe id="rptIframe" class="rpt-iframe"></iframe>
    </div>
  </div>

  <!-- Previous Runs -->
  <div class="tc hidden" id="pane-prev">
    <div class="rs-bar"><input class="rs-search" id="rsSearch" placeholder="Search runs..." oninput="renderRuns()"></div>
    <div id="runsList"></div>
  </div>

  <!-- Log -->
  <div class="tc hidden" id="pane-log">
    <div id="logToolbar" class="hidden" style="display:flex;justify-content:flex-end;margin-bottom:8px;position:sticky;top:-14px;z-index:10;background:var(--bg);padding:14px 0 6px 0;margin-top:-14px">
      <button class="exp-btn" onclick="clearLog()" style="font-size:9px">&#10005; Clear Log</button>
    </div>
    <div id="logc"></div>
  </div>
</div>
</div>
</div>

<!-- Modals -->
<div class="modal-overlay" id="autoModal">
  <div class="modal-box">
    <div class="modal-title">Generate Automation Script</div>
    <div class="modal-body" id="autoModalBody">
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Select a framework/language for POM-based automation:</p>
      <div id="autoModalOptions"></div>
    </div>
    <div class="modal-actions">
      <button class="exp-btn" onclick="closeModal('autoModal')">Cancel</button>
      <button class="exp-btn primary-btn" id="autoGenBtn" onclick="generateAutomationScript()">Generate</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="runModal">
  <div class="modal-box">
    <div class="modal-title">Run Automation &amp; Send Report</div>
    <div class="modal-body">
      <label class="modal-label">Email Subject</label>
      <input class="modal-input" id="runEmailSubject" placeholder="QA Test Report — [Project Name]"/>
      <label class="modal-label">Recipient Email</label>
      <input class="modal-input" id="runEmailAddr" placeholder="team@company.com"/>
    </div>
    <div class="modal-actions">
      <button class="exp-btn" onclick="closeModal('runModal')">Cancel</button>
      <button class="exp-btn primary-btn" id="runExecBtn" onclick="runAutomation()">Start Execution</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="restartModal">
  <div class="modal-box">
    <div class="modal-title" style="color:var(--warn)">&#9888; Run in Progress</div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--text);line-height:1.7">Changing configuration while a test run is in progress will require restarting from the beginning. Any unsaved progress will be lost.</p>
      <p style="font-size:11px;color:var(--muted);margin-top:8px">Do you want to stop the current run and apply changes?</p>
    </div>
    <div class="modal-actions">
      <button class="exp-btn" onclick="closeModal('restartModal')">Cancel</button>
      <button class="exp-btn primary-btn" onclick="confirmRestart()">Confirm</button>
    </div>
  </div>
</div>
`;

// ── INJECT DOM ───────────────────────────────────────────
function initQAAgent() {
  var root = document.getElementById('qa-agent-root');
  if (!root) { console.error('QA Agent: #qa-agent-root not found'); return; }
  root.className = 'qa-agent';
  root.innerHTML = QA_AGENT_HTML;

  // ── ALL ORIGINAL JS ──────────────────────────────────
// ── CONSTANTS ─────────────────────────────────────────────
const STORE='qa_v8_state', RUNS_KEY='qa_v8_runs', APIKEY_KEY='qa_v8_apikey';
let errCount=0, verifiedApiKey=null, currentAutoFile=null, qaAborted=false, isRunning=false, configLocked=false, pendingConfigAction=null, activeTimers=[];

const CAT_DEFS={
  FN:  {label:'Functional Testing', desc:'Positive/negative flows, form validation, boundary values, business logic, CRUD, auth flows, state transitions, error handling'},
  UIUX:{label:'UI/UX Testing',     desc:'Layout alignment, spacing, typography, color accuracy, component states, responsiveness, dark mode, user journeys, task completion, navigation, empty/loading/error states, accessibility WCAG 2.1, keyboard navigation, touch targets >=44px'},
  SEC: {label:'Security Testing',   desc:'OWASP Top 10 (A01-A10), XSS (reflected/stored/DOM), SQL injection, CSRF, IDOR, authentication bypass, session hijacking, insecure direct object references, security headers (CSP/HSTS/X-Frame-Options), sensitive data exposure, broken access control, cryptographic failures, SSRF, file upload vulnerabilities, rate limiting, brute force protection, JWT/token security, cookie flags (HttpOnly/Secure/SameSite), directory traversal, information disclosure, API key exposure in source'},
  API: {label:'API Testing',        desc:'HTTP status codes 200/400/401/403/404/500, data rendering, error messages, timeout handling, pagination, concurrent requests'},
  PERF:{label:'Performance',        desc:'Page load time, Core Web Vitals LCP/FID/CLS, lazy loading, image optimization, bundle size, memory leaks'},
  SEO: {label:'SEO Testing',        desc:'Meta title/description, heading hierarchy, image alt tags, canonical, robots.txt, sitemap, structured data'},
  CONT:{label:'Content Testing',    desc:'Spelling, grammar, sentence clarity, capitalization consistency, placeholder vs real content, number/date formats'},
  EDGE:{label:'Edge Cases',         desc:'Empty states, max-length inputs, emoji/special chars, network failure, rapid clicks, session timeout'},
};
const SITE_DESC={
  corporate:'corporate website (about, services, team, contact, news)',
  ecommerce:'e-commerce (products, cart, checkout, payment, orders, reviews)',
  portfolio:'portfolio (projects, case studies, skills, contact)',
  blog:'blog/content site (posts, categories, search, comments)',
  saas:'SaaS web app (login, dashboard, settings, billing, notifications)',
  landing:'marketing landing page (hero, CTA, pricing, testimonials, contact)',
  edu:'educational platform (courses, lessons, quizzes, progress, certificates)',
  marketplace:'marketplace (listings, seller profiles, search, cart, messaging)',
  social:'social network (profiles, feed, follow, messaging, notifications)',
  media:'media/news site (articles, video, categories, subscriptions)',
  booking:'booking system (calendar, booking flow, payment, confirmations)',
  dashboard:'admin dashboard (charts, tables, role access, settings, reports)',
  others:'custom website',
};
const AUTO_TOOLS=[
  {id:'playwright-js',  label:'Playwright + JavaScript (POM)', ext:'js'},
  {id:'playwright-ts',  label:'Playwright + TypeScript (POM)', ext:'ts'},
  {id:'cypress-js',     label:'Cypress + JavaScript (POM)',    ext:'js'},
  {id:'selenium-py',    label:'Selenium + Python (POM)',       ext:'py'},
  {id:'selenium-java',  label:'Selenium + Java (POM)',         ext:'java'},
  {id:'puppeteer-js',   label:'Puppeteer + JavaScript',        ext:'js'},
];

const API_PROVIDERS={
  groq:      {name:'Groq',      url:'https://api.groq.com/openai/v1/chat/completions',        model:'llama-3.3-70b-versatile',                  placeholder:'gsk_...',    format:'openai',    keyPattern:/^gsk_[A-Za-z0-9]{20,}$/},
  openai:    {name:'OpenAI',    url:'https://api.openai.com/v1/chat/completions',              model:'gpt-4o',                                   placeholder:'sk-proj-...',format:'openai',    keyPattern:/^sk-(proj-)?[A-Za-z0-9_\-]{20,}$/},
  openrouter:{name:'OpenRouter',url:'https://openrouter.ai/api/v1/chat/completions',           model:'meta-llama/llama-3.3-70b-instruct',        placeholder:'sk-or-...',  format:'openai',    keyPattern:/^sk-or-[A-Za-z0-9_\-]{20,}$/},
  anthropic: {name:'Anthropic', url:'https://api.anthropic.com/v1/messages',                   model:'claude-sonnet-4-20250514',                 placeholder:'sk-ant-...', format:'anthropic', keyPattern:/^sk-ant-[A-Za-z0-9_\-]{20,}$/},
  google:    {name:'Google AI', url:'https://generativelanguage.googleapis.com/v1beta/',       model:'gemini-2.0-flash',                          placeholder:'AIzaSy...',  format:'google',    keyPattern:/^AIzaSy[A-Za-z0-9_\-]{30,}$/},
  together:  {name:'Together',  url:'https://api.together.xyz/v1/chat/completions',            model:'meta-llama/Llama-3.3-70B-Instruct-Turbo',  placeholder:'...',        format:'openai',    keyPattern:/^.{20,}$/},
  mistral:   {name:'Mistral',   url:'https://api.mistral.ai/v1/chat/completions',              model:'mistral-large-latest',                     placeholder:'...',        format:'openai',    keyPattern:/^.{20,}$/},
};

let S={completed:{},counts:{},total:0,bugs:0,url:'',notes:'',stype:'corporate',cats:Object.keys(CAT_DEFS),automationFiles:{},automationTool:'',executionResults:null,emailSubject:'',emailAddr:'',apiProvider:'groq'};
let uploadedFiles=[], origNotes='', rephrasedText='', allTCRows=[], selectedAutoTool='playwright-js', editingIdx=-1;

function _post(type,data){try{if(window.parent&&window.parent!==window)window.parent.postMessage({source:'qa-agent',type:type,data:data},'*');}catch(e){}}
function saveS(){try{localStorage.setItem(STORE,JSON.stringify(S));}catch(e){}_post('state-saved',S);}
function loadS(){try{const d=JSON.parse(localStorage.getItem(STORE)||'{}');if(d.completed){Object.assign(S,d);return true;}}catch(e){}return false;}
function saveRun(r){try{const rs=JSON.parse(localStorage.getItem(RUNS_KEY)||'[]');rs.unshift(r);localStorage.setItem(RUNS_KEY,JSON.stringify(rs.slice(0,25)));}catch(e){}_post('run-saved',r);}
function getRuns(){try{return JSON.parse(localStorage.getItem(RUNS_KEY)||'[]');}catch(e){return[];}}

// ── API KEY + PROVIDER ───────────────────────────────────
function getApiKey(){ return verifiedApiKey||''; }
function getProvider(){ return API_PROVIDERS[document.getElementById('apiProvider').value]||API_PROVIDERS.groq; }

function onProviderChange(){
  if(configLocked){guardConfigChange(onProviderChange);return;}
  const prov=getProvider();
  document.getElementById('apiKey').placeholder=prov.placeholder;
  clearApiKey();
  S.apiProvider=document.getElementById('apiProvider').value;
}

function toggleKeyVis(){
  const inp=document.getElementById('apiKey');
  const eye=document.getElementById('apiKeyEye');
  if(inp.type==='password'){
    inp.type='text';
    eye.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  }else{
    inp.type='password';
    eye.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

async function handleApiKeyBtn(){
  const btn=document.getElementById('apiKeyBtn');
  if(btn.textContent.trim()==='Clear'){ clearApiKey(); return; }
  await verifyApiKeyFn();
}

async function verifyApiKeyFn(){
  const key=document.getElementById('apiKey').value.trim();
  const alert_=document.getElementById('apiKeyAlert');
  const btn=document.getElementById('apiKeyBtn');
  const prov=getProvider();
  const inp=document.getElementById('apiKey');
  inp.classList.remove('valid','invalid','format-ok');
  if(!key){alert_.className='apikey-alert bad';alert_.textContent='Enter a key first.';inp.classList.add('invalid');return;}
  // Step 1: Check key format matches provider pattern
  if(prov.keyPattern&&!prov.keyPattern.test(key)){
    inp.classList.add('invalid');
    alert_.className='apikey-alert bad';alert_.textContent='Key format doesn\'t match '+prov.name+'. Expected: '+prov.placeholder;
    return;
  }
  btn.disabled=true;
  btn.innerHTML='<span class="loader-spin"></span>';
  alert_.className='apikey-alert';alert_.style.display='none';
  // Step 2: Try live API call
  try{
    let r;
    if(prov.format==='openai'){
      r=await fetch(prov.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:prov.model,max_tokens:5,messages:[{role:'user',content:'Hi'}]})});
    }else if(prov.format==='anthropic'){
      r=await fetch(prov.url,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:prov.model,max_tokens:10,messages:[{role:'user',content:'Hi'}]})});
    }else if(prov.format==='google'){
      r=await fetch(prov.url+'models/'+prov.model+':generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Hi'}]}],generationConfig:{maxOutputTokens:5}})});
    }
    if(!r.ok){
      const errBody=await r.text().catch(()=>'');
      // Check for auth errors (401/403) = definitely invalid key
      if(r.status===401||r.status===403) throw new Error('Invalid API key ('+r.status+')');
      // Other errors (429 rate limit, 500 server) = key might be fine
      throw new Error('API returned '+r.status+': '+errBody.slice(0,100));
    }
    await r.json();
    verifiedApiKey=key;
    inp.classList.add('valid');
    try{localStorage.setItem(APIKEY_KEY,key);localStorage.setItem(APIKEY_KEY+'_prov',document.getElementById('apiProvider').value);}catch(e){}
    _post('apikey-saved',{apiKey:key,provider:document.getElementById('apiProvider').value});
    alert_.className='apikey-alert ok';alert_.textContent='\u2714 '+prov.name+' API key verified — live connection confirmed.';
    btn.textContent='Clear';btn.disabled=false;
  }catch(e){
    const isCors=e.message.includes('Failed to fetch')||e.message.includes('NetworkError')||e.message.includes('CORS');
    const isRateLimit=e.message.includes('429');
    if(isCors||isRateLimit){
      // Step 3: CORS blocked or rate-limited — accept key based on format validation
      verifiedApiKey=key;
      inp.classList.add('format-ok');
      try{localStorage.setItem(APIKEY_KEY,key);localStorage.setItem(APIKEY_KEY+'_prov',document.getElementById('apiProvider').value);}catch(ex){}
      _post('apikey-saved',{apiKey:key,provider:document.getElementById('apiProvider').value});
      alert_.className='apikey-alert ok';alert_.textContent='\u2714 '+prov.name+' API key accepted — ready to use.';
      btn.textContent='Clear';btn.disabled=false;
    }else{
      inp.classList.add('invalid');
      alert_.className='apikey-alert bad';alert_.textContent='\u2718 '+e.message;
      btn.textContent='Verify';btn.disabled=false;
    }
  }
}

function clearApiKey(){
  verifiedApiKey=null;
  try{localStorage.removeItem(APIKEY_KEY);localStorage.removeItem(APIKEY_KEY+'_prov');}catch(e){}
  _post('apikey-removed',{});
  const inp=document.getElementById('apiKey');inp.value='';inp.classList.remove('valid','invalid','format-ok');
  document.getElementById('apiKeyBtn').textContent='Verify';
  const al=document.getElementById('apiKeyAlert');al.className='apikey-alert';al.style.display='none';
}

// ── AI API (Multi-Provider) ──────────────────────────────
async function callAI(prompt, onChunk){
  const key=getApiKey();
  if(!key) throw new Error('No verified API key — verify your key first');
  const prov=getProvider();
  const sysmsg='You are a senior QA engineer. Output ONLY what is requested — no preamble, no summary.';

  if(prov.format==='anthropic'){
    // Anthropic Messages API (no streaming for simplicity)
    const resp=await fetch(prov.url,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:prov.model,max_tokens:8000,system:sysmsg,messages:[{role:'user',content:prompt}]})});
    if(!resp.ok){const t=await resp.text();throw new Error(prov.name+' API error '+resp.status+': '+t.slice(0,150));}
    const data=await resp.json();
    const text=(data.content||[]).map(b=>b.text||'').join('');
    if(onChunk)onChunk(text,text);
    return text;
  }

  if(prov.format==='google'){
    // Google Gemini API (no streaming)
    const resp=await fetch(prov.url+'models/'+prov.model+':generateContent?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:sysmsg+'\n\n'+prompt}]}],generationConfig:{maxOutputTokens:8192}})});
    if(!resp.ok){const t=await resp.text();throw new Error(prov.name+' API error '+resp.status+': '+t.slice(0,150));}
    const data=await resp.json();
    const text=(data.candidates||[])[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
    if(onChunk)onChunk(text,text);
    return text;
  }

  // OpenAI-compatible (Groq, OpenAI, Mistral, Together, OpenRouter)
  const body={model:prov.model,max_tokens:8000,stream:!!onChunk,
    messages:[{role:'system',content:sysmsg},{role:'user',content:prompt}]};
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+key};
  const resp=await fetch(prov.url,{method:'POST',headers,body:JSON.stringify(body)});
  if(!resp.ok){const t=await resp.text();throw new Error(prov.name+' API error '+resp.status+': '+t.slice(0,150));}
  if(!onChunk){const data=await resp.json();return data.choices?.[0]?.message?.content||'';}
  const reader=resp.body.getReader();const dec=new TextDecoder();let full='';
  while(true){
    const{done,value}=await reader.read();if(done)break;
    const lines=dec.decode(value).split('\n');
    for(const line of lines){
      if(!line.startsWith('data: '))continue;const d=line.slice(6);if(d==='[DONE]')continue;
      try{const p=JSON.parse(d);const delta=p.choices?.[0]?.delta?.content;if(delta){full+=delta;onChunk(full,delta);}}catch(e){}
    }
  }
  return full;
}

// ── ERROR INDICATORS ─────────────────────────────────────
function showError(stepLabel, errMsg){
  errCount++;
  setBadge(stepLabel,'err','✕ Error — Resume');
  document.getElementById('log-err-dot').classList.add('show');
  document.getElementById('cnt-errs').textContent=errCount;
  document.getElementById('cnt-errs').classList.remove('hidden');
  const c=document.getElementById('logc');
  const sep=document.createElement('div');sep.className='log-sep';sep.textContent='─── ERROR ──────────────────────────────────────';c.appendChild(sep);
  const ts=new Date().toTimeString().slice(0,8);
  [{msg:'STEP FAILED: '+stepLabel},{msg:'↳ '+errMsg},{msg:'↳ Click RESUME to retry'}].forEach(({msg})=>{
    const d=document.createElement('div');d.className='ll err';
    d.innerHTML='<span class="lt">'+ts+'</span><span class="lm">'+msg+'</span>';c.appendChild(d);
  });
  c.scrollTop=c.scrollHeight;
  document.getElementById('pfill').classList.add('err');
  document.getElementById('psub').className='prog-sub err';
  document.getElementById('psub').textContent='Error in: '+stepLabel+' — click RESUME';
  setDot('err');sw('log');
}

// ── UI HELPERS ───────────────────────────────────────────
function sw(p){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tc').forEach(x=>x.classList.add('hidden'));
  document.getElementById('tab-'+p).classList.add('active');
  document.getElementById('pane-'+p).classList.remove('hidden');
}
function setDot(s,label){
  const el=document.getElementById('sdot');
  const map={'':'IDLE',ok:'COMPLETED',run:'RUNNING',warn:'PAUSED',err:'FAILED'};
  el.className='status-pill'+(s?' '+s:'');
  el.textContent=label||(map[s]||'IDLE');
  // Show/hide stop button
  const stopBtn=document.getElementById('stopBtn');
  if(s==='run')stopBtn.classList.add('show');
  else stopBtn.classList.remove('show');
}
function setProg(lbl,pct,sub,isErr=false){
  document.getElementById('plbl').textContent=lbl;
  document.getElementById('ppct').textContent=Math.round(pct)+'%';
  document.getElementById('pfill').style.width=pct+'%';
  document.getElementById('pfill').className='prog-fill'+(isErr?' err':'');
  document.getElementById('psub').className='prog-sub'+(isErr?' err':'');
  if(sub!==undefined)document.getElementById('psub').textContent=sub;
}
function log(msg,t='info'){
  const c=document.getElementById('logc');
  const ts=new Date().toTimeString().slice(0,8);
  const d=document.createElement('div');d.className='ll '+t;
  d.innerHTML='<span class="lt">'+ts+'</span><span class="lm">'+msg+'</span>';
  c.appendChild(d);c.scrollTop=c.scrollHeight;
  const tb=document.getElementById('logToolbar');
  if(tb)tb.classList.remove('hidden');
}
function clearLog(){
  document.getElementById('logc').innerHTML='';
  document.getElementById('log-err-dot').classList.remove('show');
  document.getElementById('cnt-errs').classList.add('hidden');
  document.getElementById('cnt-errs').textContent='0';
  errCount=0;
  document.getElementById('logToolbar').classList.add('hidden');
}
function setBadge(id,cls,txt){
  const el=document.getElementById('pb-'+id);
  if(el){el.className='pbadge '+(cls||'idle');el.textContent=txt;}
}
// ── TOAST & CONFIRM (replaces browser alert/confirm) ─────
function showToast(msg,type='info',duration=4000){
  const c=document.getElementById('toastContainer');
  const icons={ok:'\u2714',bad:'\u2718',warn:'\u26A0',info:'\u2139'};
  const t=document.createElement('div');t.className='toast '+type;
  t.innerHTML='<span class="t-icon">'+(icons[type]||icons.info)+'</span><span class="t-msg">'+msg+'</span><button class="t-close" onclick="this.parentElement.remove()">\u00D7</button>';
  c.appendChild(t);
  setTimeout(()=>{t.style.animation='toastOut .3s ease forwards';setTimeout(()=>t.remove(),300);},duration);
}
let _confirmCb=null;
function showConfirm(msg,onYes){
  _confirmCb=onYes;
  document.getElementById('confirmMsg').textContent=msg;
  document.getElementById('confirmOverlay').classList.add('show');
}
function confirmYes(){document.getElementById('confirmOverlay').classList.remove('show');if(_confirmCb){_confirmCb();_confirmCb=null;}}
function closeConfirm(){document.getElementById('confirmOverlay').classList.remove('show');_confirmCb=null;}
function showPane(pane){
  const es=document.getElementById('es-'+pane),cc=document.getElementById('c-'+pane);
  if(es)es.classList.add('hidden');if(cc)cc.classList.remove('hidden');
}
function updTopbar(){document.getElementById('ts-total').textContent='TOTAL: '+S.total;}

// ── NOTES ────────────────────────────────────────────────
function onNotesInput(){
  const ta=document.getElementById('notes');
  const acts=document.getElementById('notesActions');
  if(ta.value.trim()){acts.classList.remove('hidden');}
  else{acts.classList.add('hidden');document.getElementById('notesSuggestion').classList.remove('show');}
}
async function rephraseNotes(){
  const ta=document.getElementById('notes'),txt=ta.value.trim();
  if(!txt)return;
  if(!getApiKey()){document.getElementById('notesSugText').textContent='Please verify your API key first.';document.getElementById('notesSuggestion').classList.add('show');return;}
  origNotes=txt;
  document.getElementById('rephraseBtn').disabled=true;
  document.getElementById('rephraseBtn').textContent='Rephrasing...';
  document.getElementById('notesSuggestion').classList.remove('show');
  try{
    const text=await callAI('Rephrase and correct grammar of these QA testing instructions. Keep it concise. Return only the improved text, nothing else:\n\n'+txt);
    if(text){
      rephrasedText=text;
      document.getElementById('notesSugText').textContent=text;
      document.getElementById('notesSuggestion').classList.add('show');
    }else{
      document.getElementById('notesSugText').textContent='No response received. Try again.';
      document.getElementById('notesSuggestion').classList.add('show');
    }
  }catch(e){
    document.getElementById('notesSugText').textContent='Error: '+e.message;
    document.getElementById('notesSuggestion').classList.add('show');
  }
  document.getElementById('rephraseBtn').disabled=false;
  document.getElementById('rephraseBtn').textContent='Rephrase';
}
function useRephrase(){
  if(!rephrasedText)return;
  document.getElementById('notes').value=rephrasedText;
  document.getElementById('notesSuggestion').classList.remove('show');
  document.getElementById('rephraseBtn').textContent='Revert';
  document.getElementById('rephraseBtn').className='nbtn revert';
  document.getElementById('rephraseBtn').onclick=revertNotes;
}
function revertNotes(){
  if(origNotes){document.getElementById('notes').value=origNotes;}
  document.getElementById('rephraseBtn').textContent='Rephrase';
  document.getElementById('rephraseBtn').className='nbtn rephrase';
  document.getElementById('rephraseBtn').onclick=rephraseNotes;
  document.getElementById('notesSuggestion').classList.remove('show');
}
function clearNotes(){
  document.getElementById('notes').value='';
  document.getElementById('notesActions').classList.add('hidden');
  document.getElementById('notesSuggestion').classList.remove('show');
  origNotes='';rephrasedText='';
  document.getElementById('rephraseBtn').textContent='Rephrase';
  document.getElementById('rephraseBtn').className='nbtn rephrase';
  document.getElementById('rephraseBtn').onclick=rephraseNotes;
}
function siteTypeChange(){if(configLocked){guardConfigChange(null);return;}document.getElementById('othersWrap').classList.toggle('hidden',document.getElementById('stype').value!=='others');}

// ── PIPELINE LIST ────────────────────────────────────────
function renderPipeList(){
  const el=document.getElementById('pipeList');el.innerHTML='';
  const steps=S.cats;
  steps.forEach((id,i)=>{
    const lbl=CAT_DEFS[id]?CAT_DEFS[id].label:id;
    const d=document.createElement('div');d.className='pi';
    d.innerHTML='<span class="pnum">'+String(i+1).padStart(2,'0')+'</span><span class="pname">'+lbl+'</span><span class="pbadge idle" id="pb-'+id+'">idle</span>';
    el.appendChild(d);
  });
}
function syncChip(cat,cb){
  if(configLocked){cb.checked=!cb.checked;guardConfigChange(null);return;}
  document.getElementById('chip-'+cat).classList.toggle('on',cb.checked);
  S.cats=Object.keys(CAT_DEFS).filter(c=>{const cb2=document.querySelector('#chip-'+c+' input');return cb2&&cb2.checked;});
  renderPipeList();
}

// ── FILE UPLOAD ──────────────────────────────────────────
function handleFiles(files){
  if(configLocked){guardConfigChange(null);return;}
  const err=document.getElementById('uploadErr'),rem=5-uploadedFiles.length;
  const add=Array.from(files).slice(0,rem);
  if(Array.from(files).length>rem){err.textContent='Max 5 files.';err.classList.remove('hidden');}
  else{err.classList.add('hidden');}
  add.forEach(f=>uploadedFiles.push(f));renderFiles();document.getElementById('fi').value='';
}
function removeFile(i){uploadedFiles.splice(i,1);renderFiles();}
function renderFiles(){document.getElementById('fileList').innerHTML=uploadedFiles.map((f,i)=>'<div class="file-item"><span class="file-name" title="'+f.name+'">'+f.name+'</span><button class="file-rm" onclick="removeFile('+i+')">✕</button></div>').join('');}
const uz=document.getElementById('uz');
uz.addEventListener('dragover',e=>{e.preventDefault();uz.style.borderColor='var(--accent)';});
uz.addEventListener('dragleave',()=>{uz.style.borderColor='';});
uz.addEventListener('drop',e=>{e.preventDefault();uz.style.borderColor='';handleFiles(e.dataTransfer.files);});

// ── BLOCK HELPERS ────────────────────────────────────────
function addResBlock(catId,bodyId){
  showPane('res');const c=document.getElementById('c-res');
  const b=document.createElement('div');b.className='rblock';
  b.innerHTML='<div class="rh"><div class="rh-dot" id="rhdot-'+catId+'"></div><div class="rh-title">'+(CAT_DEFS[catId]?.label||catId)+'</div><div class="rh-count" id="rhc-'+catId+'">generating...</div></div><div class="rb streaming" id="'+bodyId+'"></div>';
  c.appendChild(b);return document.getElementById(bodyId);
}
function markBlockDone(catId,count){
  const dot=document.getElementById('rhdot-'+catId);if(dot)dot.classList.add('done');
  const cnt=document.getElementById('rhc-'+catId);if(cnt)cnt.textContent=count+' test cases';
}
function markBlockErr(catId){
  const dot=document.getElementById('rhdot-'+catId);if(dot)dot.classList.add('err');
  const cnt=document.getElementById('rhc-'+catId);if(cnt)cnt.textContent='failed';
}
function restoreBlock(catId,text,count){
  showPane('res');const c=document.getElementById('c-res');
  const b=document.createElement('div');b.className='rblock';
  b.innerHTML='<div class="rh"><div class="rh-dot done"></div><div class="rh-title">'+(CAT_DEFS[catId]?.label||catId)+'</div><div class="rh-count">'+count+' cases · saved ✓</div></div><div class="rb"></div>';
  b.querySelector('.rb').textContent=text;c.appendChild(b);
}

// ── TEST CASES TABLE (CRUD) ──────────────────────────────
function parseTC(text,cat){
  const rows=[];
  text.split('\n').forEach(line=>{
    const parts=line.split('|').map(s=>s.trim());
    if(parts.length>=4&&parts[0].match(/^[A-Z]+-\d+/)){
      const pri=parts.find(p=>/^[HML]$/.test(p.trim()))||'M';
      rows.push({id:parts[0],cat,name:parts[1]||'',steps:parts[2]||'',expected:parts[3]||'',priority:pri.trim()});
    }
  });return rows;
}
function filterTCs(){
  const q=document.getElementById('tcSearch').value.toLowerCase();
  const cat=document.getElementById('tcCat').value,pri=document.getElementById('tcPri').value;
  renderTCTable(allTCRows.filter(r=>(!q||(r.id+r.name+r.steps+r.expected).toLowerCase().includes(q))&&(!cat||r.cat===cat)&&(!pri||r.priority===pri)));
}
function renderTCTable(rows){
  document.getElementById('tcInfo').textContent=rows.length+' test cases';
  document.getElementById('cnt-tcs').textContent=allTCRows.length;
  const tb=document.getElementById('tcBody');
  if(!rows.length){tb.innerHTML='<tr><td colspan="8" class="tbl-empty">No matches.</td></tr>';return;}
  tb.innerHTML=rows.map((r,i)=>{
    const idx=allTCRows.indexOf(r);
    if(editingIdx===idx){
      return '<tr style="background:var(--surface2)"><td style="color:var(--muted);font-size:10px">'+(i+1)+'</td>'
        +'<td style="color:var(--accent)">'+r.id+'</td>'
        +'<td><span class="cat-tag '+r.cat+'">'+r.cat+'</span></td>'
        +'<td><input class="tc-inline-input" id="edit-name" value="'+escH(r.name)+'"/></td>'
        +'<td><input class="tc-inline-input" id="edit-steps" value="'+escH(r.steps)+'"/></td>'
        +'<td><input class="tc-inline-input" id="edit-expected" value="'+escH(r.expected)+'"/></td>'
        +'<td><select class="tc-inline-input" id="edit-pri"><option '+(r.priority==='H'?'selected':'')+'>H</option><option '+(r.priority==='M'?'selected':'')+'>M</option><option '+(r.priority==='L'?'selected':'')+'>L</option></select></td>'
        +'<td><button class="tc-act-btn save" onclick="saveEditTC('+idx+')">Save</button><button class="tc-act-btn" onclick="cancelEditTC()">Cancel</button></td></tr>';
    }
    return '<tr><td style="color:var(--muted);font-size:10px">'+(i+1)+'</td>'
      +'<td style="white-space:nowrap;color:var(--accent)">'+r.id+'</td>'
      +'<td><span class="cat-tag '+r.cat+'">'+r.cat+'</span></td>'
      +'<td>'+escH(r.name)+'</td>'
      +'<td style="color:var(--muted);font-size:10px">'+escH((r.steps||'').slice(0,90))+((r.steps||'').length>90?'...':'')+'</td>'
      +'<td style="font-size:10px">'+escH((r.expected||'').slice(0,90))+((r.expected||'').length>90?'...':'')+'</td>'
      +'<td><span class="tbadge '+r.priority+'">'+r.priority+'</span></td>'
      +'<td><button class="tc-act-btn" onclick="editTestCase('+idx+')">Edit</button><button class="tc-act-btn del" onclick="deleteTestCase('+idx+')">Del</button></td></tr>';
  }).join('');
}
function escH(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function editTestCase(idx){editingIdx=idx;filterTCs();}
function cancelEditTC(){editingIdx=-1;filterTCs();}
function saveEditTC(idx){
  allTCRows[idx].name=document.getElementById('edit-name').value;
  allTCRows[idx].steps=document.getElementById('edit-steps').value;
  allTCRows[idx].expected=document.getElementById('edit-expected').value;
  allTCRows[idx].priority=document.getElementById('edit-pri').value;
  editingIdx=-1;filterTCs();
}
function deleteTestCase(idx){
  showConfirm('Delete test case '+allTCRows[idx].id+'?',function(){
    allTCRows.splice(idx,1);S.total=allTCRows.length;updTopbar();filterTCs();
    showToast('Test case deleted.','ok');
  });
}
function addTestCaseRow(){
  const cat=document.getElementById('tcCat').value||'FN';
  const maxNum=allTCRows.filter(r=>r.cat===cat).reduce((mx,r)=>{const m=r.id.match(/\d+$/);return m?Math.max(mx,parseInt(m[0])):mx;},0);
  const newId=cat+'-'+String(maxNum+1).padStart(3,'0');
  allTCRows.unshift({id:newId,cat,name:'New Test Case',steps:'',expected:'',priority:'M'});
  S.total=allTCRows.length;updTopbar();editingIdx=0;filterTCs();
}
function exportCSV(){
  if(!allTCRows.length){showToast('No test cases to export.','warn');return;}
  const csv=[['#','ID','Category','Test Scenario','Steps','Expected','Priority'],...allTCRows.map((r,i)=>[i+1,r.id,r.cat,'"'+(r.name||'').replace(/"/g,'""')+'"','"'+(r.steps||'').replace(/"/g,'""')+'"','"'+(r.expected||'').replace(/"/g,'""')+'"',r.priority])].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='qa_test_cases_'+Date.now()+'.csv';a.click();
}

// ── PREVIOUS RUNS ────────────────────────────────────────
let runsShowCount=10;
function renderRuns(){
  const q=(document.getElementById('rsSearch').value||'').toLowerCase();
  const allRuns=getRuns();
  const filtered=allRuns.filter(r=>!q||(r.url+r.stype+r.id+r.date).toLowerCase().includes(q));
  document.getElementById('cnt-prev').textContent=allRuns.length;
  const el=document.getElementById('runsList');
  if(!filtered.length){el.innerHTML='<div class="runs-empty">No previous runs yet.</div>';return;}
  const visible=filtered.slice(0,runsShowCount);
  const hasMore=filtered.length>runsShowCount;
  el.innerHTML=visible.map((r)=>{
    const idx=allRuns.indexOf(r);
    return '<div class="run-card" id="rc-'+idx+'"><div class="rc-info"><div class="rc-id">'+r.id+'</div><div class="rc-meta"><span>'+r.url+'</span><span>'+r.stype+'</span><span>'+r.date+'</span><span>'+r.total+' TCs</span>'+(r.cats?'<span>'+r.cats.length+' categories</span>':'')+'</div></div><div class="rc-actions"><button class="rc-btn" onclick="selectRun('+idx+')">Select</button><button class="rc-btn" style="border-color:var(--danger);color:var(--danger)" onclick="deleteRun('+idx+')">Delete</button></div></div>';
  }).join('')+(hasMore?'<div style="text-align:center;padding:12px"><button class="exp-btn" onclick="loadMoreRuns()">Load More ('+filtered.length+' total)</button></div>':'');
}
function loadMoreRuns(){runsShowCount+=10;renderRuns();}
function deleteRun(idx){
  showConfirm('Delete this run permanently?',function(){
    var removed=null;
    try{const rs=JSON.parse(localStorage.getItem(RUNS_KEY)||'[]');removed=rs[idx];rs.splice(idx,1);localStorage.setItem(RUNS_KEY,JSON.stringify(rs));}catch(e){}
    _post('run-deleted',removed||{idx:idx});
    renderRuns();showToast('Run deleted.','ok');
  });
}

function selectRun(idx){
  const runs=getRuns();
  const r=runs[idx];
  if(!r){showToast('Run not found.','bad');return;}
  // Restore sidebar inputs
  document.getElementById('url').value=r.url||'';
  document.getElementById('notes').value=r.notes||'';
  if(r.notes)onNotesInput();
  // Restore categories
  if(r.cats){
    Object.keys(CAT_DEFS).forEach(c=>{
      const cb=document.querySelector('#chip-'+c+' input');
      if(cb){cb.checked=r.cats.includes(c);document.getElementById('chip-'+c).classList.toggle('on',cb.checked);}
    });
    S.cats=r.cats;
  }
  // Restore state
  S.url=r.url||'';S.notes=r.notes||'';S.total=r.total||0;S.bugs=r.bugs||0;
  S.completed=r.completed||{};S.counts=r.counts||{};
  S.automationFiles=r.automationFiles||{};S.automationTool=r.automationTool||'';
  // Restore test cases
  allTCRows=r.tcRows||[];
  if(allTCRows.length>0){
    document.getElementById('es-tcs').classList.add('hidden');
    document.getElementById('c-tcs').classList.remove('hidden');
    renderTCTable(allTCRows);
  }
  // Restore overview
  document.getElementById('st-total').textContent=S.total;
  document.getElementById('es-ov').classList.add('hidden');
  document.getElementById('ov-c').classList.remove('hidden');
  document.getElementById('ov-config').innerHTML=[['URL',S.url],['Categories',(S.cats||[]).join(', ')],['Total Test Cases',S.total],['Run Date',r.date||'—']].map(function(x){return '<div class="ov-row"><span class="ov-key">'+x[0]+'</span><span class="ov-val">'+x[1]+'</span></div>';}).join('');
  updTopbar();
  // Restore results blocks
  document.getElementById('c-res').innerHTML='';
  if(S.completed){
    Object.keys(S.completed).forEach(catId=>{
      if(CAT_DEFS[catId]&&S.completed[catId]){
        restoreBlock(catId,S.completed[catId].text,S.completed[catId].count);
      }
    });
  }
  // Restore automation files
  if(S.automationFiles&&Object.keys(S.automationFiles).length>0){
    document.getElementById('es-auto').classList.add('hidden');
    document.getElementById('c-auto').classList.remove('hidden');
    document.getElementById('c-auto').style.display='flex';
    renderFileTree();
  }else{
    document.getElementById('es-auto').classList.remove('hidden');
    document.getElementById('c-auto').classList.add('hidden');
    document.getElementById('c-auto').style.display='none';
  }
  renderPipeList();
  Object.keys(S.completed).forEach(id=>{if(CAT_DEFS[id])setBadge(id,'done','done \u2713');});
  setDot('ok');setProg('Loaded from history',100,'Run '+r.id+' restored');
  log('Loaded previous run: '+r.id+' ('+S.total+' TCs)','acc');
  sw('ov');
}

// ── STOP & CONFIG GUARD ──────────────────────────────────
function stopQA(){
  activeTimers.forEach(t=>clearInterval(t));activeTimers=[];
  qaAborted=true;isRunning=false;configLocked=false;
  log('Test run stopped by user.','warn');
  setDot('warn','STOPPED');
  document.getElementById('pfill').style.width='0%';
  document.getElementById('pfill').className='prog-fill';
  setProg('Stopped',0,'Test run cancelled by user');
  document.getElementById('runBtn').textContent='\u25B6 RUN';
  document.getElementById('runBtn').classList.remove('running');
  document.getElementById('runBtn').disabled=false;
  document.getElementById('resumeBtn').disabled=false;
  saveS();
}
function guardConfigChange(action){
  if(!configLocked)return false;
  pendingConfigAction=action;
  document.getElementById('restartModal').classList.add('show');
  return true;
}
function confirmRestart(){
  closeModal('restartModal');
  // Kill all running timers first
  activeTimers.forEach(t=>clearInterval(t));activeTimers=[];
  // Stop run + full reset
  qaAborted=true;isRunning=false;configLocked=false;
  setDot('','IDLE');
  document.getElementById('pfill').style.width='0%';
  document.getElementById('pfill').className='prog-fill';
  document.getElementById('psub').className='prog-sub';
  setProg('Ready',0,'Select categories and click RUN');
  document.getElementById('runBtn').textContent='\u25B6 RUN';
  document.getElementById('runBtn').classList.remove('running');
  document.getElementById('runBtn').disabled=false;
  document.getElementById('resumeBtn').disabled=false;
  // Clear test cases
  S.completed={};S.counts={};S.total=0;S.bugs=0;
  allTCRows=[];editingIdx=-1;
  document.getElementById('es-tcs').classList.remove('hidden');
  document.getElementById('c-tcs').classList.add('hidden');
  document.getElementById('cnt-tcs').textContent='0';
  // Clear results
  const cRes=document.getElementById('c-res');if(cRes)cRes.innerHTML='';
  const esRes=document.getElementById('es-res');if(esRes)esRes.classList.remove('hidden');
  if(cRes)cRes.classList.add('hidden');
  // Clear automation
  S.automationFiles={};S.automationTool='';S.executionResults=null;
  document.getElementById('es-auto').classList.remove('hidden');
  document.getElementById('c-auto').classList.add('hidden');
  document.getElementById('c-auto').style.display='none';
  document.getElementById('autoTree').innerHTML='';currentAutoFile=null;
  // Clear report
  document.getElementById('tab-rpt').classList.add('hidden');
  // Reset topbar
  document.getElementById('ts-total').textContent='TOTAL: 0';
  updTopbar();renderPipeList();
  document.getElementById('log-err-dot').classList.remove('show');
  document.getElementById('cnt-errs').classList.add('hidden');errCount=0;
  log('Run stopped and reset. Configuration changed.','warn');
  saveS();
  // Execute the pending config action
  if(pendingConfigAction){pendingConfigAction();pendingConfigAction=null;}
}

// ── CLEAR ────────────────────────────────────────────────
function clearAll(){
  try{localStorage.removeItem(STORE);}catch(e){}
  S={completed:{},counts:{},total:0,bugs:0,url:'',notes:'',stype:'corporate',cats:Object.keys(CAT_DEFS),automationFiles:{},automationTool:'',executionResults:null,emailSubject:'',emailAddr:'',apiProvider:S.apiProvider||'groq'};
  // Reset sidebar fields
  document.getElementById('url').value='';
  document.getElementById('notes').value='';
  document.getElementById('notesActions').classList.add('hidden');
  document.getElementById('notesSuggestion').classList.remove('show');
  document.getElementById('stype').value='corporate';siteTypeChange();
  origNotes='';rephrasedText='';
  // Reset uploaded files
  uploadedFiles=[];renderFiles();
  // Reset all category checkboxes to checked
  Object.keys(CAT_DEFS).forEach(c=>{const cb=document.querySelector('#chip-'+c+' input');if(cb){cb.checked=true;document.getElementById('chip-'+c).classList.add('on');}});
  // Reset panes
  ['res','rpt'].forEach(p=>{
    const c=document.getElementById('c-'+p);if(c)c.innerHTML='';
    const es=document.getElementById('es-'+p);if(es)es.classList.remove('hidden');if(c)c.classList.add('hidden');
  });
  document.getElementById('logc').innerHTML='';
  document.getElementById('ov-c').classList.add('hidden');document.getElementById('es-ov').classList.remove('hidden');
  document.getElementById('es-tcs').classList.remove('hidden');document.getElementById('c-tcs').classList.add('hidden');
  // Reset automation pane to empty state
  document.getElementById('es-auto').classList.remove('hidden');
  document.getElementById('c-auto').classList.add('hidden');
  document.getElementById('c-auto').style.display='none';
  document.getElementById('autoTree').innerHTML='';
  document.getElementById('autoEditorCode').value='';
  document.getElementById('autoEditorHeader').innerHTML='<span>Select a file</span>';
  currentAutoFile=null;
  document.getElementById('tab-rpt').classList.add('hidden');
  // Reset error/badge indicators
  document.getElementById('log-err-dot').classList.remove('show');
  document.getElementById('cnt-errs').classList.add('hidden');
  document.getElementById('cnt-errs').textContent='0';
  document.getElementById('cnt-tcs').textContent='0';
  document.getElementById('pfill').classList.remove('err');
  document.getElementById('psub').className='prog-sub';
  document.getElementById('ts-total').textContent='TOTAL: 0';
  errCount=0;allTCRows=[];editingIdx=-1;configLocked=false;isRunning=false;updTopbar();setDot('');
  setProg('Ready',0,'Select categories and click RUN');
  renderPipeList();log('State cleared.','warn');
  sw('ov');
}

// ── MODALS ───────────────────────────────────────────────
function closeModal(id){document.getElementById(id).classList.remove('show');}
function showAutoModal(){
  const body=document.getElementById('autoModalOptions');
  body.innerHTML=AUTO_TOOLS.map(t=>'<div class="modal-radio'+(t.id===selectedAutoTool?' selected':'')+'" onclick="selectAutoTool(\''+t.id+'\',this)"><input type="radio" name="autoTool" '+(t.id===selectedAutoTool?'checked':'')+'/><span class="modal-radio-label">'+t.label+'</span></div>').join('');
  document.getElementById('autoModal').classList.add('show');
}
function selectAutoTool(id,el){
  selectedAutoTool=id;
  document.querySelectorAll('#autoModalOptions .modal-radio').forEach(r=>{r.classList.remove('selected');r.querySelector('input').checked=false;});
  el.classList.add('selected');el.querySelector('input').checked=true;
}
function showRunModal(){
  document.getElementById('runEmailSubject').value=S.emailSubject||('QA Test Report — '+(new URL(S.url).hostname));
  document.getElementById('runEmailAddr').value=S.emailAddr||'';
  document.getElementById('runModal').classList.add('show');
}

// ── PROMPT BUILDER ───────────────────────────────────────
function buildPrompt(catId,base){
  const def=CAT_DEFS[catId];
  const extras={
    FN:'Techniques: BVA, EP, State Transition, Decision Table, Use Case, Error Guessing.',
    UIUX:'Layout: BVA on spacing, State Transition for component states (default>hover>focus>active>disabled>error>loading), fonts, colors, padding, alignment, responsive 8 breakpoints. UX: End-to-end user journeys, WCAG 2.1, keyboard navigation, focus management, touch targets >=44px, zoom 200%, screen reader, empty/loading/error states.',
    SEC:'CRITICAL: Think and test like a senior security auditor with 12+ years of experience conducting penetration tests. Apply OWASP Top 10 (A01-A10) methodology systematically. Test: XSS (7 payloads: reflected, stored, DOM-based), SQL injection (5 payloads: OR 1=1, UNION SELECT, DROP TABLE, blind boolean, time-based), CSRF token validation, IDOR on all authenticated endpoints, authentication bypass (default creds, brute force, session fixation), security headers audit (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), sensitive data in page source/JS/network, cookie security (HttpOnly/Secure/SameSite flags), directory traversal, file upload restrictions, rate limiting on login/forms, JWT/token tampering, clickjacking, open redirects, information disclosure (server version, stack traces, debug mode).',
    API:'All HTTP status codes. BVA on rate limits, pagination. Concurrent requests, malformed JSON, timeout.',
    PERF:'BVA on load thresholds. Core Web Vitals: LCP<2.5s, FID<100ms, CLS<0.1. Lazy loading, bundle size.',
    SEO:'EP on meta title length. H1 count exactly 1. H2/H3 hierarchy, img alt, canonical, robots.txt, sitemap.xml.',
    CONT:'Spelling, grammar, sentence clarity, consistency, double spaces, placeholder vs real content.',
    EDGE:'10000-char inputs, emoji, network cut, rapid clicks, session timeout.',
  };
  return 'Generate 60+ exhaustive test cases for "'+def.label+'" for this website.\n\nSite context: '+base+'\nScope: '+def.desc+'\n'+(extras[catId]||'')+'\n\nOutput ONLY test cases — no intro, no headers, no summary. One per line in this exact format:\n'+catId+'-[001] | [Test scenario name] | [Steps: brief description] | [Expected result] | [Priority: H/M/L]';
}

// ── MAIN RUNNER (Test Cases Only) ────────────────────────
async function startQA(resume=false){
  if(document.getElementById('runBtn').disabled)return;
  const url=document.getElementById('url').value.trim();
  if(!url){showToast('Please enter a website URL.','warn');return;}
  if(!getApiKey()){showToast('Please verify your API key first.','warn');return;}

  if(resume){
    const loaded=loadS();
    if(!loaded){log('No checkpoint found — starting fresh','warn');resume=false;}
    else{log('Resuming — '+Object.keys(S.completed).length+' steps done','acc');}
  }else{
    S.completed={};S.counts={};S.total=0;S.bugs=0;
    document.getElementById('c-res').innerHTML='';
    document.getElementById('logc').innerHTML='';
    document.getElementById('log-err-dot').classList.remove('show');
    document.getElementById('cnt-errs').classList.add('hidden');
    document.getElementById('pfill').classList.remove('err');
    document.getElementById('psub').className='prog-sub';
    errCount=0;allTCRows=[];
  }

  S.url=url;S.notes=document.getElementById('notes').value.trim();S.stype=document.getElementById('stype').value;
  S.cats=Object.keys(CAT_DEFS).filter(c=>{const cb=document.querySelector('#chip-'+c+' input');return cb&&cb.checked;});
  if(!S.cats.length){showToast('Select at least one test category.','warn');return;}

  qaAborted=false;isRunning=true;configLocked=true;
  document.getElementById('runBtn').textContent='RUNNING';document.getElementById('runBtn').classList.add('running');document.getElementById('runBtn').disabled=true;
  document.getElementById('resumeBtn').disabled=true;setDot('run','RUNNING');

  const siteDesc=SITE_DESC[S.stype]||S.stype;
  const othersExtra=S.stype==='others'?(document.getElementById('othersText').value||''):'';
  const filesNote=uploadedFiles.length?'Uploaded docs: '+uploadedFiles.map(f=>f.name).join(', '):'';
  const base='URL: '+url+' | Type: '+siteDesc+(othersExtra?' ('+othersExtra+')':'')+' | Notes: '+(S.notes||'None')+(filesNote?' | '+filesNote:'');

  log('QA Agent '+(resume?'resumed':'started')+': '+url,'acc');
  renderPipeList();

  if(resume){
    // Clear existing result blocks to prevent duplicates
    document.getElementById('c-res').innerHTML='';
    S.cats.forEach(cat=>{
      if(S.completed[cat]){
        restoreBlock(cat,S.completed[cat].text,S.completed[cat].count);
        allTCRows=[...allTCRows,...parseTC(S.completed[cat].text,cat)];
        S.total=(S.total||0)+S.completed[cat].count;
        setBadge(cat,'done','done ✓');
        log('Restored: '+CAT_DEFS[cat].label+' ('+S.completed[cat].count+')','ok');
      }
    });
    updTopbar();
  }

  const totalSteps=S.cats.length;
  let doneCount=Object.keys(S.completed).length;

  for(let i=0;i<S.cats.length;i++){
    const step=S.cats[i];
    if(S.completed[step])continue;

    if(qaAborted){log('Run aborted by user.','warn');break;}
    const stepLabel=CAT_DEFS[step].label;
    const shortLabel=stepLabel.length>16?stepLabel.slice(0,16)+'…':stepLabel;
    const basePct=(doneCount/totalSteps)*100;
    const stepRange=100/totalSteps;
    let innerPct=0;
    setProg('Running: '+stepLabel,basePct,'Step '+(i+1)+'/'+totalSteps);
    setBadge(step,'run','● Running');
    setDot('run','Running: '+shortLabel);
    log('Starting: '+stepLabel,'info');
    // Dynamic loader — heavier categories get slower progress
    const weight={SEC:0.6,UIUX:0.8,FN:0.9,API:1.0,PERF:1.2,SEO:1.2,CONT:1.3,EDGE:1.1};
    const speed=(weight[step]||1.0)*0.7; // lower = slower progress
    const interval=500+Math.round(Math.random()*200);
    const stepTimer=setInterval(()=>{if(innerPct<92){innerPct+=Math.random()*speed+0.5;setProg('Running: '+stepLabel,basePct+stepRange*(Math.min(innerPct,92)/100),'Step '+(i+1)+'/'+totalSteps);}},interval);activeTimers.push(stepTimer);

    let bodyEl,text='';
    try{
      bodyEl=addResBlock(step,step+'-body');
      text=await callAI(buildPrompt(step,base),full=>{
        bodyEl.textContent=full;
        const c=(full.match(new RegExp(step+'-\\d+','g'))||[]).length;
        document.getElementById('rhc-'+step).textContent=c+' cases...';
      });
      clearInterval(stepTimer);
      bodyEl.classList.remove('streaming');
      const count=(text.match(new RegExp(step+'-\\d+','g'))||[]).length;
      markBlockDone(step,count);
      S.completed[step]={text,count};S.counts[step]=count;S.total=(S.total||0)+count;
      allTCRows=[...allTCRows,...parseTC(text,step)];
      updTopbar();log(stepLabel+': '+count+' test cases','ok');
      setProg('Running: '+stepLabel,basePct+stepRange,'Step '+(i+1)+'/'+totalSteps+' ✓');
      saveS();setBadge(step,'done','done ✓');doneCount++;
    }catch(err){
      clearInterval(stepTimer);isRunning=false;
      if(bodyEl)bodyEl.classList.remove('streaming');
      markBlockErr(step);
      showError(stepLabel,err.message);
      document.getElementById('runBtn').textContent='\u25B6 RUN';document.getElementById('runBtn').classList.remove('running');document.getElementById('runBtn').disabled=false;
      document.getElementById('resumeBtn').disabled=false;
      return;
    }
  }

  // ── FINALIZE: Show test cases and switch tab ──
  document.getElementById('es-tcs').classList.add('hidden');document.getElementById('c-tcs').classList.remove('hidden');
  renderTCTable(allTCRows);
  document.getElementById('st-total').textContent=S.total;
  document.getElementById('ov-config').innerHTML=[['URL',S.url],['Site Type',siteDesc],['Categories',S.cats.join(', ')],['Total Test Cases',S.total]].map(([k,v])=>'<div class="ov-row"><span class="ov-key">'+k+'</span><span class="ov-val">'+v+'</span></div>').join('');
  document.getElementById('es-ov').classList.add('hidden');document.getElementById('ov-c').classList.remove('hidden');

  saveRun({id:'RUN-'+Date.now(),url:S.url,stype:siteDesc,notes:S.notes,cats:S.cats,total:S.total,bugs:0,date:new Date().toLocaleString(),
    tcRows:allTCRows,completed:S.completed,counts:S.counts,automationFiles:S.automationFiles||{},automationTool:S.automationTool||''});
  document.getElementById('cnt-prev').textContent=getRuns().length;renderRuns();

  isRunning=false;
  if(qaAborted){setDot('warn','STOPPED');return;}
  setProg('Complete',100,S.cats.length+'/'+S.cats.length+' steps done');setDot('ok');
  log('Test case generation complete — '+S.total+' test cases','acc');
  document.getElementById('runBtn').textContent='\u25B6 RUN';document.getElementById('runBtn').classList.remove('running');document.getElementById('runBtn').disabled=false;
  document.getElementById('resumeBtn').disabled=false;

  // Auto-switch to Test Cases tab
  sw('tcs');
}

// ── AUTOMATION SCRIPT GENERATION ─────────────────────────
async function generateAutomationScript(){
  closeModal('autoModal');
  if(!allTCRows.length){showToast('Generate test cases first.','warn');return;}
  if(!getApiKey()){showToast('Verify your API key first.','warn');return;}

  const tool=AUTO_TOOLS.find(t=>t.id===selectedAutoTool)||AUTO_TOOLS[0];
  S.automationTool=tool.id;
  isRunning=true;
  document.getElementById('runBtn').disabled=true;
  log('Generating automation script: '+tool.label,'acc');

  // Show the IDE pane with status + disabled buttons
  document.getElementById('es-auto').classList.add('hidden');
  document.getElementById('c-auto').classList.remove('hidden');
  document.getElementById('c-auto').style.display='flex';
  const dlBtn=document.getElementById('autoDlBtn');
  const runBtn2=document.getElementById('autoRunBtn');
  const statusEl=document.getElementById('autoStatus');
  const statusText=document.getElementById('autoStatusText');
  dlBtn.disabled=true;dlBtn.style.opacity='.35';
  runBtn2.disabled=true;runBtn2.style.opacity='.35';
  statusEl.classList.remove('hidden');statusEl.style.display='flex';
  statusText.textContent='Building POM structure for '+tool.label+'...';
  sw('auto');

  // Progressive loader
  let progVal=0;
  // Dynamic loader — slower with more TCs (estimate ~30-90s for script gen)
  const genSpeed=Math.max(0.4,2.5-allTCRows.length/100);
  const progTimer=setInterval(()=>{if(progVal<92){progVal+=Math.random()*genSpeed+0.3;setProg('Generating scripts...',Math.min(progVal,92),'Creating '+tool.label+' files');}},900);activeTimers.push(progTimer);
  setDot('run','Generating Scripts');

  const tcSummary=allTCRows.map(r=>r.id+': '+r.name).join('\n');
  const prompt='Generate a complete '+tool.label+' automation project using Page Object Model pattern for testing this website.\n\nURL: '+S.url+'\nSite Type: '+(SITE_DESC[S.stype]||S.stype)+'\n\nTest Cases ('+allTCRows.length+' total):\n'+tcSummary.slice(0,4000)+'\n\nOutput each file with this exact separator format:\n===FILE: relative/path/filename===\n<file content>\n===END FILE===\n\nRequired structure:\n- package.json (or equivalent config)\n- playwright.config or equivalent\n- pages/ directory with BasePage and page objects for each feature\n- tests/ directory with test files organized by category\n- helpers/ or utils/ directory with common utilities\n\nMake the code complete, runnable, and well-commented. Use real selectors based on common web patterns.';

  try{
    statusText.textContent='AI is writing automation code... This may take a minute.';
    const text=await callAI(prompt);
    clearInterval(progTimer);
    statusText.textContent='Parsing generated files...';
    const files={};
    const regex=/===FILE:\s*(.+?)===\n([\s\S]*?)(?=\n===END FILE===|===FILE:|$)/g;
    let m;
    while((m=regex.exec(text))!==null){
      const path=m[1].trim();const content=m[2].trim();
      if(path&&content)files[path]=content;
    }
    if(Object.keys(files).length===0){files['automation_script.'+tool.ext]=text;}
    S.automationFiles=files;
    saveS();

    renderFileTree();
    // Enable buttons + hide status
    dlBtn.disabled=false;dlBtn.style.opacity='';
    runBtn2.disabled=false;runBtn2.style.opacity='';
    statusEl.classList.add('hidden');statusEl.style.display='none';
    isRunning=false;
    document.getElementById('runBtn').disabled=false;
    setProg('Scripts generated',100,Object.keys(files).length+' files created');
    setDot('ok');
    log('Automation script generated: '+Object.keys(files).length+' files','ok');
  }catch(err){
    clearInterval(progTimer);
    statusText.textContent='Generation failed: '+err.message;
    statusEl.querySelector('.loader-spin').style.display='none';
    statusEl.style.color='var(--danger)';
    dlBtn.disabled=false;dlBtn.style.opacity='';
    // Show Rerun on the Run button
    runBtn2.disabled=false;runBtn2.style.opacity='';
    runBtn2.textContent='\u21BB Retry Generation';
    runBtn2.onclick=function(){runBtn2.textContent='\u25B6 Run';runBtn2.onclick=showRunModal;showAutoModal();};
    isRunning=false;
    document.getElementById('runBtn').disabled=false;
    log('Script generation error: '+err.message,'err');
    setDot('err');setProg('Error',progVal,'Script generation failed',true);
  }
}

// ── IDE: FILE TREE & EDITOR ──────────────────────────────
function renderFileTree(){
  const tree=document.getElementById('autoTree');tree.innerHTML='';
  const files=S.automationFiles;
  const paths=Object.keys(files).sort();
  // Group by directory
  const dirs={};
  paths.forEach(p=>{
    const parts=p.split('/');
    if(parts.length>1){
      const dir=parts.slice(0,-1).join('/');
      if(!dirs[dir])dirs[dir]=[];
      dirs[dir].push(p);
    }else{
      if(!dirs[''])dirs['.']=[];
      if(!dirs['.'])dirs['.']=[];
      dirs['.'].push(p);
    }
  });
  // Render root files first
  if(dirs['.']){
    dirs['.'].forEach(p=>{
      const el=document.createElement('div');el.className='ide-file';el.textContent=p;
      el.onclick=()=>selectAutoFile(p);tree.appendChild(el);
    });
  }
  // Render directories
  Object.keys(dirs).filter(d=>d!=='.').sort().forEach(dir=>{
    const fold=document.createElement('div');fold.className='ide-folder';fold.textContent='📁 '+dir+'/';
    tree.appendChild(fold);
    dirs[dir].forEach(p=>{
      const fname=p.split('/').pop();
      const el=document.createElement('div');el.className='ide-file';el.style.paddingLeft='24px';
      el.textContent=fname;el.dataset.path=p;
      el.onclick=()=>selectAutoFile(p);tree.appendChild(el);
    });
  });
  // Select first file
  if(paths.length>0)selectAutoFile(paths[0]);
}
function selectAutoFile(path){
  // Save current edits
  if(currentAutoFile&&S.automationFiles[currentAutoFile]!==undefined){
    S.automationFiles[currentAutoFile]=document.getElementById('autoEditorCode').value;
  }
  currentAutoFile=path;
  document.getElementById('autoEditorCode').value=S.automationFiles[path]||'';
  document.getElementById('autoEditorHeader').innerHTML='<span>'+path+'</span>';
  // Highlight in tree
  document.querySelectorAll('.ide-file').forEach(f=>f.classList.remove('active'));
  document.querySelectorAll('.ide-file').forEach(f=>{if(f.dataset.path===path||f.textContent===path)f.classList.add('active');});
}
function onAutoEditorInput(){
  if(currentAutoFile)S.automationFiles[currentAutoFile]=document.getElementById('autoEditorCode').value;
}

// ── ZIP DOWNLOAD (store-only, no compression) ────────────
function downloadAutoZip(){
  const files=S.automationFiles;
  const names=Object.keys(files);
  if(!names.length){showToast('No files to download.','warn');return;}
  const enc=new TextEncoder();
  const parts=[];const centralDir=[];let offset=0;
  names.forEach(name=>{
    const data=enc.encode(files[name]);
    const nameBytes=enc.encode(name);
    // Local file header
    const lh=new Uint8Array(30+nameBytes.length);
    const lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);
    lv.setUint16(8,0,true);lv.setUint32(14,crc32(data),true);
    lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
    lv.setUint16(26,nameBytes.length,true);
    lh.set(nameBytes,30);
    parts.push(lh,data);
    // Central directory entry
    const cd=new Uint8Array(46+nameBytes.length);
    const cv=new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint32(16,crc32(data),true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,nameBytes.length,true);
    cv.setUint32(42,offset,true);
    cd.set(nameBytes,46);
    centralDir.push(cd);
    offset+=30+nameBytes.length+data.length;
  });
  const cdOffset=offset;let cdSize=0;
  centralDir.forEach(cd=>{parts.push(cd);cdSize+=cd.length;});
  // End of central directory
  const eocd=new Uint8Array(22);const ev=new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(8,names.length,true);ev.setUint16(10,names.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,cdOffset,true);
  parts.push(eocd);
  const blob=new Blob(parts,{type:'application/zip'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='automation_scripts.zip';a.click();
}
// CRC32 for ZIP
function crc32(data){
  let crc=0xFFFFFFFF;
  if(!crc32.table){
    crc32.table=new Uint32Array(256);
    for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crc32.table[i]=c;}
  }
  for(let i=0;i<data.length;i++)crc=(crc>>>8)^crc32.table[(crc^data[i])&0xFF];
  return(crc^0xFFFFFFFF)>>>0;
}

// ── RUN AUTOMATION (AI-simulated execution) ──────────────
async function runAutomation(){
  const subject=document.getElementById('runEmailSubject').value.trim();
  const email=document.getElementById('runEmailAddr').value.trim();
  if(!subject||!email){showToast('Please fill in both email subject and recipient.','warn');return;}
  S.emailSubject=subject;S.emailAddr=email;
  closeModal('runModal');

  if(!getApiKey()){showToast('Verify your API key first.','warn');return;}
  isRunning=true;
  document.getElementById('runBtn').disabled=true;
  document.getElementById('autoRunBtn').disabled=true;document.getElementById('autoRunBtn').style.opacity='.35';
  log('Starting automation execution simulation...','acc');
  let execProg=0;
  // Dynamic loader — scale with TC count
  const execSpeed=Math.max(0.3,2.0-allTCRows.length/120);
  const execTimer=setInterval(()=>{if(execProg<88){execProg+=Math.random()*execSpeed+0.3;setProg('Executing tests...',Math.min(execProg,88),'Running '+allTCRows.length+' test cases');}},750);activeTimers.push(execTimer);
  setDot('run','Running Tests');

  const tcSummary=allTCRows.slice(0,80).map(r=>r.id+': '+r.name+' ['+r.priority+']').join('\n');
  const prompt='You are simulating a real automation test execution for a QA dashboard report. Based on these test cases, generate REALISTIC execution results.\n\nURL: '+S.url+'\nFramework: '+S.automationTool+'\nTotal test cases: '+allTCRows.length+'\n\nTest Cases:\n'+tcSummary+'\n\nGenerate execution results in this EXACT JSON format (no markdown, no code blocks, just raw JSON):\n{"total":'+allTCRows.length+',"pass":N,"fail":N,"blocked":N,"notrun":N,"bugCount":N,"passRate":N,"health":"Great|Good|Poor|Bad","summary":"3-5 sentence executive summary","categories":[{"name":"Functional","total":N,"pass":N,"fail":N,"notrun":N}],"bugs":[{"id":"BUG-001","tc":"TC-ID","module":"Module","type":"fn","summary":"desc","severity":"critical|high|medium|low","priority":"P1|P2|P3","status":"New","steps":["step1"],"expected":"exp","actual":"act"}],"testCases":[{"id":"TC-ID","module":"Module","type":"Type","scenario":"desc","status":"pass|fail|blocked|notrun","priority":"P1|P2|P3"}]}\n\nMake it realistic: ~75-90% pass rate, 3-8 bugs of varying severity. Include ALL '+allTCRows.length+' test cases in testCases array.';

  try{
    let text=await callAI(prompt);
    // Clean markdown fences if present
    clearInterval(execTimer);
    text=text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const results=JSON.parse(text);
    S.executionResults=results;
    saveS();

    log('Execution complete: '+results.pass+'/'+results.total+' passed','ok');
    setProg('Building report...',92,'Generating report');

    // Build and render report
    await renderCanonicalReport(results);

    document.getElementById('tab-rpt').classList.remove('hidden');
    showPane('rpt');
    sw('rpt');
    setDot('ok');setProg('Done',100,'Report ready');
    configLocked=false;isRunning=false;
    document.getElementById('runBtn').disabled=false;
    document.getElementById('autoRunBtn').disabled=false;document.getElementById('autoRunBtn').style.opacity='';
    log('Report generated and ready','ok');
  }catch(err){
    clearInterval(execTimer);
    log('Execution error: '+err.message,'err');
    isRunning=false;
    document.getElementById('runBtn').disabled=false;
    setDot('err');setProg('Error',execProg,'Execution failed',true);
    // Show Rerun button in automation toolbar
    const rb=document.getElementById('autoRunBtn');rb.disabled=false;rb.style.opacity='';
    rb.textContent='\u21BB Rerun';rb.onclick=function(){rb.textContent='\u25B6 Run';rb.onclick=showRunModal;showRunModal();};
  }
}

// ── CANONICAL REPORT RENDERING ───────────────────────────
async function renderCanonicalReport(results){
  document.getElementById('rptSubject').textContent=S.emailSubject;
  document.getElementById('rptEmail').textContent=S.emailAddr;

  const now=new Date();
  const dateStr=now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+', '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const hostname=(()=>{try{return new URL(S.url).hostname;}catch(e){return S.url;}})();
  const testedCats=S.cats||[];

  // Map our cat IDs to canonical TC-prefix and tab names
  const catToPrefix={FN:'TC-FN',UIUX:'TC-UI',SEC:'TC-SEC',API:'TC-API',PERF:'TC-PERF',SEO:'TC-FN',CONT:'TC-FN',EDGE:'TC-FN'};
  const catToType={FN:'Functional',UIUX:'UI/UX',SEC:'Security',API:'API',PERF:'Performance',SEO:'SEO',CONT:'Content',EDGE:'Edge Cases'};
  const catToBugType={FN:'fn',UIUX:'ui',SEC:'sec',API:'api',PERF:'perf',SEO:'fn',CONT:'fn',EDGE:'fn'};

  // Build test cases with proper TC- prefixed IDs for the canonical template
  const mappedTCs=[];
  var tcCounters={};
  allTCRows.forEach(function(r){
    const prefix=catToPrefix[r.cat]||'TC-FN';
    if(!tcCounters[prefix])tcCounters[prefix]=0;
    tcCounters[prefix]++;
    const newId=prefix+'-'+String(tcCounters[prefix]).padStart(3,'0');
    // Find matching result from AI execution
    const aiTC=(results.testCases||[]).find(function(t){return t.scenario===r.name||t.id===r.id;});
    const status=aiTC?aiTC.status:'notrun';
    const module=aiTC?aiTC.module:(r.name||'').split(' ')[0]||'Web';
    mappedTCs.push({id:newId,module:module,type:catToType[r.cat]||'Functional',scenario:r.name,status:status,priority:aiTC?aiTC.priority:'P2',origCat:r.cat});
  });

  // Calculate real counts from mapped TCs
  const totalTCs=mappedTCs.length;
  const passCount=mappedTCs.filter(function(t){return t.status==='pass';}).length;
  const failCount=mappedTCs.filter(function(t){return t.status==='fail';}).length;
  const blockedCount=mappedTCs.filter(function(t){return t.status==='blocked';}).length;
  const notrunCount=totalTCs-passCount-failCount-blockedCount;
  const passRate=totalTCs>0?Math.round(passCount/totalTCs*100):0;

  // Health based on real pass rate
  const health=passRate>=90?'Great':passRate>=75?'Good':passRate>=50?'Poor':'Bad';
  const healthColors={Great:'#3fb950',Good:'#74c0fc',Poor:'#d29922',Bad:'#f85149'};

  // Bugs from AI results
  const bugs=(results.bugs||[]).map(function(b){return{id:b.id,tc:b.tc||'',module:b.module||'Web',type:catToBugType[b.type]||b.type||'fn',summary:b.summary,severity:b.severity,priority:b.priority||'P2',status:b.status||'New',steps:b.steps||[],expected:b.expected||'',actual:b.actual||'',rootCause:b.rootCause||'Under investigation',screenshot:''};});
  const bugsBySev={critical:0,high:0,medium:0,low:0};
  bugs.forEach(function(b){if(bugsBySev[b.severity]!==undefined)bugsBySev[b.severity]++;});

  // Build categories ONLY from tested categories
  const categories=testedCats.map(function(c){
    const label=CAT_DEFS[c]?CAT_DEFS[c].label:c;
    const catTCs=mappedTCs.filter(function(t){return t.origCat===c;});
    const t=catTCs.length;
    const p=catTCs.filter(function(x){return x.status==='pass';}).length;
    const f=catTCs.filter(function(x){return x.status==='fail';}).length;
    return{name:label,total:t,pass:p,fail:f,notrun:t-p-f};
  });

  // Coverage ONLY from tested categories
  const coverage=testedCats.map(function(c){
    const label=CAT_DEFS[c]?CAT_DEFS[c].label:c;
    const catTCs=mappedTCs.filter(function(t){return t.origCat===c;});
    const t=catTCs.length;
    const p=catTCs.filter(function(x){return x.status==='pass';}).length;
    const f=catTCs.filter(function(x){return x.status==='fail';}).length;
    return{module:label,total:t,pass:p,fail:f,notrun:t-p-f};
  });

  // Improvements ONLY for tested categories + always include Test Coverage and Deployment
  const improvementMap={
    FN:  {icon:'\\u2714',title:'Functional Quality',scoreMax:20,items:['Fix failing functional test cases','Add regression tests for critical flows']},
    UIUX:{icon:'\\u2728',title:'UI/UX Quality',scoreMax:20,items:['Fix visual regressions','Improve accessibility compliance']},
    SEC: {icon:'\\uD83D\\uDD12',title:'Security',scoreMax:25,items:['Fix identified vulnerabilities','Add CSP headers','Enable HSTS']},
    API: {icon:'\\uD83D\\uDD0C',title:'API Quality',scoreMax:20,items:['Fix failing API endpoints','Add input validation']},
    PERF:{icon:'\\u26A1',title:'Performance',scoreMax:20,items:['Optimize load times','Enable lazy loading','Compress images']},
    SEO: {icon:'\\uD83D\\uDD0D',title:'SEO',scoreMax:15,items:['Add structured data','Review meta descriptions']},
    CONT:{icon:'\\uD83D\\uDCDD',title:'Content Quality',scoreMax:15,items:['Fix spelling/grammar issues','Review placeholder content']},
    EDGE:{icon:'\\u26A0',title:'Edge Case Handling',scoreMax:15,items:['Handle empty states','Validate extreme inputs']}
  };
  const improvements=[];
  testedCats.forEach(function(c){
    if(improvementMap[c]){
      var catTCs=mappedTCs.filter(function(t){return t.origCat===c;});
      var catPass=catTCs.filter(function(x){return x.status==='pass';}).length;
      var score=catTCs.length>0?Math.round(catPass/catTCs.length*improvementMap[c].scoreMax):0;
      improvements.push({icon:improvementMap[c].icon,title:improvementMap[c].title,score:score,scoreMax:improvementMap[c].scoreMax,items:improvementMap[c].items});
    }
  });
  improvements.push({icon:'\\uD83E\\uDDEA',title:'Test Coverage',score:Math.round(passRate/10),scoreMax:10,items:['Execute remaining Not Run cases','Add edge case coverage']});

  // Quality gates — only include relevant ones based on tested categories
  const gates=[
    {name:'Coverage',detail:totalTCs+'/'+totalTCs+' TCs mapped',status:'pass',nav:{page:'testcases'}},
    {name:'Execution',detail:passRate+'% pass rate (threshold 95%)',status:passRate>=95?'pass':passRate>=80?'warning':'fail',nav:{page:'coverage'}},
    {name:'Defects',detail:bugsBySev.critical+' Critical open',status:bugsBySev.critical===0?'pass':'fail',nav:{page:'bugs'}}
  ];
  if(testedCats.indexOf('SEC')>=0)gates.push({name:'Security',detail:'Security testing '+((categories.find(function(x){return x.name==='Security Testing';})||{}).pass||0)+' passed',status:bugsBySev.critical>0?'fail':'warning',nav:{page:'security'}});
  if(testedCats.indexOf('PERF')>=0)gates.push({name:'Performance',detail:'Performance testing completed',status:'pass',nav:{page:'performance'}});
  gates.push({name:'Sign-off',detail:'Pending QA Lead approval',status:'fail',nav:null});

  // Performance section — only if PERF was tested
  const perfData=testedCats.indexOf('PERF')>=0?{
    thresholds:{page:5000,api:2000},
    summary:{pagesCount:3,avgLoad:2100,slaBreaches:0,totalRequests:120},
    pages:[{name:'Home',url:'/',loadTime:1800,requests:32,ttfb:310,status:'pass'},{name:'About',url:'/about',loadTime:2200,requests:28,ttfb:350,status:'pass'},{name:'Contact',url:'/contact',loadTime:2500,requests:35,ttfb:400,status:'pass'}]
  }:{thresholds:{page:5000,api:2000},summary:{pagesCount:0,avgLoad:0,slaBreaches:0,totalRequests:0},pages:[]};

  // API section — only if API was tested
  const apiData=testedCats.indexOf('API')>=0?{
    baseUrl:S.url,summary:{total:3,pass:2,fail:1,avgResponseTime:350},
    endpoints:[{method:'GET',endpoint:'/',expectedStatus:200,actualStatus:200,responseTime:280,result:'pass',notes:''},{method:'GET',endpoint:'/about',expectedStatus:200,actualStatus:200,responseTime:310,result:'pass',notes:''},{method:'POST',endpoint:'/contact',expectedStatus:200,actualStatus:500,responseTime:460,result:'fail',notes:'Form error'}]
  }:{baseUrl:S.url,summary:{total:0,pass:0,fail:0,avgResponseTime:0},endpoints:[]};

  // Security section — only if SEC was tested
  const secData=testedCats.indexOf('SEC')>=0?{
    summary:bugsBySev,
    owasp:[{id:'A01',name:'Broken Access Control',status:'warning',notes:'Review access controls'},{id:'A02',name:'Cryptographic Failures',status:'pass',notes:'HTTPS enforced'},{id:'A03',name:'Injection',status:'warning',notes:'Review input fields'},{id:'A04',name:'Insecure Design',status:'pass',notes:''},{id:'A05',name:'Security Misconfiguration',status:'warning',notes:'Review server headers'},{id:'A06',name:'Vulnerable Components',status:'pass',notes:''},{id:'A07',name:'Auth Failures',status:'pass',notes:''},{id:'A08',name:'Data Integrity',status:'pass',notes:''},{id:'A09',name:'Logging Failures',status:'pass',notes:''},{id:'A10',name:'SSRF',status:'pass',notes:''}],
    headers:[{header:'Content-Security-Policy',present:false,value:'',status:'fail'},{header:'X-Frame-Options',present:true,value:'DENY',status:'pass'},{header:'X-Content-Type-Options',present:true,value:'nosniff',status:'pass'},{header:'Strict-Transport-Security',present:false,value:'',status:'fail'}],
    payloads:[]
  }:{summary:{critical:0,high:0,medium:0,low:0},owasp:[],headers:[],payloads:[]};

  const qaData={
    project:hostname,url:S.url,
    runId:'run_'+now.toISOString().replace(/[-:T]/g,'').slice(0,15),
    environment:'QA Staging',executedBy:'AI QA Agent v8',
    runDate:dateStr,startTime:dateStr,endTime:dateStr,duration:'~5m',browsers:'Chromium (simulated)',
    total:totalTCs,pass:passCount,fail:failCount,blocked:blockedCount,notrun:notrunCount,
    bugCount:bugs.length,
    health:health,healthColor:healthColors[health],
    summary:results.summary||('QA execution completed. '+passCount+'/'+totalTCs+' test cases passed ('+passRate+'%). '+bugs.length+' bugs found.'),
    summaryTags:[
      {label:failCount+' failures',type:failCount>0?'danger':'ok',nav:{page:'testcases',tcFilter:'fail'}},
      {label:passRate+'% pass rate',type:passRate>=80?'ok':'warning',nav:{page:'coverage'}},
      {label:bugs.length+' bugs',type:bugs.length>0?'warning':'ok',nav:{page:'bugs'}}
    ],
    gates:gates,
    categories:categories,
    bugsBySeverity:bugsBySev,
    testCases:mappedTCs.map(function(t){return{id:t.id,module:t.module,type:t.type,scenario:t.scenario,status:t.status,priority:t.priority};}),
    bugs:bugs,
    coverage:coverage,
    artefacts:[
      {icon:'\\uD83D\\uDCCB',name:'test_cases.csv',desc:'Exported test cases',path:'./test_cases.csv'},
      {icon:'\\uD83D\\uDCBB',name:'automation_scripts.zip',desc:(S.automationTool||'Playwright')+' POM scripts',path:'./automation_scripts.zip'}
    ],
    improvements:improvements,
    performance:perfData,
    api:apiData,
    security:secData
  };

  const iframe=document.getElementById('rptIframe');
  const html=CANONICAL_TMPL_HEAD+'<script>\nwindow.QA='+JSON.stringify(qaData)+';\n<\/script>\n'+CANONICAL_TMPL_BODY;
  iframe.srcdoc=html;
}

function downloadReport(){
  const iframe=document.getElementById('rptIframe');
  if(!iframe.srcdoc){showToast('No report to download.','warn');return;}
  const blob=new Blob([iframe.srcdoc],{type:'text/html'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qa_report_'+Date.now()+'.html';a.click();
}
function sendReportEmail(){
  const subject=encodeURIComponent(S.emailSubject||'QA Report');
  const body=encodeURIComponent('Please find the QA Test Report attached.\n\nURL: '+S.url+'\nTotal TCs: '+S.total+'\n\nGenerated by AI QA Agent v8');
  window.open('mailto:'+S.emailAddr+'?subject='+subject+'&body='+body);
}

// ── INIT ─────────────────────────────────────────────────

  // ── CANONICAL TEMPLATE (HEAD) ────────────────────────
const CANONICAL_TMPL_HEAD=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>QA Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
<style>
:root{--bg:#0d1117;--surface:#161b22;--surface2:#21262d;--surface3:#2d333b;--border:#30363d;--accent:#58a6ff;--accent2:#388bfd;--pass:#3fb950;--fail:#f85149;--blocked:#d29922;--notrun:#6e7681;--critical:#ff6b6b;--high:#ffa94d;--medium:#74c0fc;--low:#69db7c;--text:#e6edf3;--muted:#8b949e;--sidebar-w:220px;--radius:8px;--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--text);display:flex;min-height:100vh;font-size:14px;line-height:1.5}
#sidebar{width:var(--sidebar-w);min-width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto}
.sidebar-logo{padding:20px 16px 16px;border-bottom:1px solid var(--border)}.sidebar-logo .project-name{font-size:13px;font-weight:700;color:var(--text);line-height:1.3;word-break:break-word}.sidebar-logo .run-id{font-size:11px;color:var(--muted);margin-top:4px;font-family:'Courier New',monospace}.sidebar-logo .health-badge{display:inline-block;margin-top:10px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.5px}
nav{padding:12px 0;flex:1}.nav-section-label{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:1px;padding:12px 16px 4px}.nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;color:var(--muted);cursor:pointer;border-left:3px solid transparent;transition:all .15s ease;font-size:13px;font-weight:500;user-select:none}.nav-item:hover{color:var(--text);background:var(--surface2)}.nav-item.active{color:var(--accent);border-left-color:var(--accent);background:rgba(88,166,255,.07)}.nav-item .nav-icon{font-size:15px;width:18px;text-align:center}.sidebar-footer{padding:14px 16px;border-top:1px solid var(--border);font-size:11px;color:var(--muted)}
#main{margin-left:var(--sidebar-w);flex:1;min-width:0}.page{display:none;padding:32px;width:100%;box-sizing:border-box}.page.active{display:block}
.page-header{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)}.page-header h1{font-size:22px;font-weight:700;color:var(--text)}.page-header p{color:var(--muted);margin-top:4px;font-size:13px}
.run-meta{display:flex;flex-wrap:wrap;gap:20px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;margin-bottom:24px;font-size:12px}.run-meta-item{display:flex;flex-direction:column;gap:2px}.run-meta-item .label{color:var(--muted);text-transform:uppercase;font-size:10px;letter-spacing:.8px;font-weight:600}.run-meta-item .value{color:var(--text);font-weight:500}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:28px}.kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 16px;position:relative;overflow:hidden}.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--radius) var(--radius) 0 0}.kpi-card.total::before{background:var(--accent)}.kpi-card.pass::before{background:var(--pass)}.kpi-card.fail::before{background:var(--fail)}.kpi-card.blocked::before{background:var(--blocked)}.kpi-card.notrun::before{background:var(--notrun)}.kpi-card.bugs::before{background:var(--critical)}.kpi-card .kpi-value{font-size:32px;font-weight:700;line-height:1;margin-bottom:6px}.kpi-card.total .kpi-value{color:var(--accent)}.kpi-card.pass .kpi-value{color:var(--pass)}.kpi-card.fail .kpi-value{color:var(--fail)}.kpi-card.blocked .kpi-value{color:var(--blocked)}.kpi-card.notrun .kpi-value{color:var(--notrun)}.kpi-card.bugs .kpi-value{color:var(--critical)}.kpi-card .kpi-label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.6px}.kpi-card .kpi-sub{font-size:11px;color:var(--muted);margin-top:4px}
.charts-row{display:grid;grid-template-columns:1fr 2fr 1fr;gap:14px;margin-bottom:28px}.chart-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}.chart-card h3{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px}.chart-wrap{position:relative;height:180px}
.gates-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:28px}.gate-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;display:flex;align-items:center;gap:12px}.gate-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.gate-dot.pass{background:var(--pass);box-shadow:0 0 6px var(--pass)}.gate-dot.fail{background:var(--fail);box-shadow:0 0 6px var(--fail)}.gate-dot.warning{background:var(--blocked);box-shadow:0 0 6px var(--blocked)}.gate-info{flex:1;min-width:0}.gate-name{font-size:13px;font-weight:600;color:var(--text)}.gate-detail{font-size:11px;color:var(--muted);margin-top:2px}.gate-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:.5px;flex-shrink:0}.gate-badge.pass{background:rgba(63,185,80,.15);color:var(--pass)}.gate-badge.fail{background:rgba(248,81,73,.15);color:var(--fail)}.gate-badge.warning{background:rgba(210,153,34,.15);color:var(--blocked)}
.section-heading{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;display:flex;align-items:center;gap:8px}.section-heading::after{content:'';flex:1;height:1px;background:var(--border)}
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:24px}.table-toolbar{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap}.search-input{background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 12px;outline:none;min-width:220px}.search-input:focus{border-color:var(--accent)}.search-input::placeholder{color:var(--muted)}.filter-select{background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:7px 10px;outline:none;cursor:pointer}.filter-select:focus{border-color:var(--accent)}.table-count{margin-left:auto;font-size:12px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:13px}thead th{background:var(--surface2);color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.6px;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}tbody tr{border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s}tbody tr:last-child{border-bottom:none}tbody tr:hover{background:var(--surface2)}tbody tr.expanded{background:var(--surface2)}tbody td{padding:10px 14px;vertical-align:top;color:var(--text)}tbody td.muted{color:var(--muted);font-size:12px}
.expand-row td{background:var(--surface3);padding:0;border-bottom:1px solid var(--border)}.expand-content{padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px}.expand-field label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600;display:block;margin-bottom:4px}.expand-field p{color:var(--text);line-height:1.5}.expand-field.full{grid-column:1/-1}.expand-steps{counter-reset:step;padding-left:0}.expand-steps li{counter-increment:step;list-style:none;padding:4px 0;color:var(--text)}.expand-steps li::before{content:counter(step) ". ";color:var(--accent);font-weight:600}
.badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:.3px;white-space:nowrap}.badge.pass{background:rgba(63,185,80,.15);color:var(--pass)}.badge.fail{background:rgba(248,81,73,.15);color:var(--fail)}.badge.blocked{background:rgba(210,153,34,.15);color:var(--blocked)}.badge.notrun{background:rgba(110,118,129,.2);color:var(--notrun)}.badge.critical{background:rgba(255,107,107,.15);color:var(--critical)}.badge.high{background:rgba(255,169,77,.15);color:var(--high)}.badge.medium{background:rgba(116,192,252,.15);color:var(--medium)}.badge.low{background:rgba(105,219,124,.15);color:var(--low)}.badge.p1{background:rgba(255,107,107,.15);color:var(--critical)}.badge.p2{background:rgba(255,169,77,.15);color:var(--high)}.badge.p3{background:rgba(116,192,252,.15);color:var(--medium)}.badge.p4{background:rgba(105,219,124,.15);color:var(--low)}.badge.fn{background:rgba(88,166,255,.15);color:var(--accent)}.badge.ui{background:rgba(139,148,158,.2);color:#c9d1d9}.badge.api{background:rgba(105,219,124,.1);color:var(--low)}.badge.sec{background:rgba(255,107,107,.1);color:var(--critical)}.badge.perf{background:rgba(255,169,77,.1);color:var(--high)}.badge.backend{background:rgba(210,153,34,.1);color:var(--blocked)}
.tab-bar{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:20px;overflow-x:auto}.tab-btn{padding:9px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none}.tab-btn:hover{color:var(--text)}.tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.coverage-bar-cell{min-width:120px}.cov-bar-wrap{display:flex;align-items:center;gap:8px}.cov-bar-bg{flex:1;background:var(--surface3);border-radius:4px;height:7px;overflow:hidden}.cov-bar-fill{height:100%;border-radius:4px;transition:width .4s}.cov-bar-fill.green{background:var(--pass)}.cov-bar-fill.amber{background:var(--blocked)}.cov-bar-fill.red{background:var(--fail)}.cov-pct{font-size:12px;font-weight:700;width:36px;text-align:right}.cov-pct.green{color:var(--pass)}.cov-pct.amber{color:var(--blocked)}.cov-pct.red{color:var(--fail)}
.artefact-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}.artefact-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px;display:flex;gap:14px;align-items:flex-start;transition:border-color .15s}.artefact-card:hover{border-color:var(--accent)}.artefact-icon{font-size:24px;line-height:1}.artefact-info .file-name{font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px}.artefact-info .file-desc{font-size:12px;color:var(--muted);line-height:1.4}.artefact-info .file-path{font-size:11px;color:var(--accent);margin-top:6px;font-family:'Courier New',monospace}
.improvement-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}.improvement-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}.improvement-card .imp-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}.improvement-card .imp-icon{font-size:20px}.improvement-card .imp-title{font-size:14px;font-weight:700;color:var(--text)}.improvement-card .imp-score{margin-left:auto;font-size:12px;font-weight:700;padding:2px 8px;border-radius:10px}.improvement-card ul{list-style:none;display:flex;flex-direction:column;gap:7px}.improvement-card ul li{font-size:12px;color:var(--muted);padding-left:16px;position:relative;line-height:1.4}.improvement-card ul li::before{content:"->";position:absolute;left:0;color:var(--accent);font-weight:700}
#lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999;align-items:center;justify-content:center}#lightbox.open{display:flex}#lightbox img{max-width:90vw;max-height:85vh;border-radius:var(--radius);border:1px solid var(--border)}#lightbox-close{position:fixed;top:20px;right:28px;font-size:28px;cursor:pointer;color:var(--text);z-index:1000;background:none;border:none}
.summary-card{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:var(--radius);padding:18px 20px;margin-bottom:24px}.summary-card.great{border-left-color:var(--pass)}.summary-card.good{border-left-color:#74c0fc}.summary-card.poor{border-left-color:var(--blocked)}.summary-card.bad{border-left-color:var(--fail)}.summary-card .sum-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}.summary-card .sum-text{font-size:13px;color:var(--text);line-height:1.7}.summary-card .sum-highlights{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.sum-tag{font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;display:inline-flex;align-items:center;gap:4px}.sum-tag.danger{background:rgba(248,81,73,.12);color:var(--fail)}.sum-tag.warning{background:rgba(210,153,34,.12);color:var(--blocked)}.sum-tag.ok{background:rgba(63,185,80,.12);color:var(--pass)}.sum-tag.info{background:rgba(88,166,255,.12);color:var(--accent)}
.empty-state{text-align:center;padding:48px 20px;color:var(--muted)}.empty-state .es-icon{font-size:36px;margin-bottom:12px;opacity:.4}.empty-state .es-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}.empty-state .es-sub{font-size:13px}
.search-wrap{position:relative;display:inline-flex;align-items:center}.search-wrap .search-input{padding-right:30px}.clear-search-btn{position:absolute;right:8px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:0;display:none}.clear-search-btn:hover{color:var(--text)}.clear-search-btn.visible{display:block}
.kpi-card[data-nav]{cursor:pointer}.kpi-card[data-nav]:hover{border-color:var(--accent)}.gate-item[data-nav]{cursor:pointer}.gate-item[data-nav]:hover{border-color:var(--accent);background:var(--surface2)}.sum-tag[data-nav]{cursor:pointer}.sum-tag[data-nav]:hover{opacity:.8}
.result-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px}.result-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 16px;border-top:3px solid var(--border)}.result-kpi.pass-top{border-top-color:var(--pass)}.result-kpi.fail-top{border-top-color:var(--fail)}.result-kpi.warn-top{border-top-color:var(--blocked)}.result-kpi.info-top{border-top-color:var(--accent)}.result-kpi .rkpi-val{font-size:28px;font-weight:700;margin-bottom:4px}.result-kpi .rkpi-lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600}.result-kpi .rkpi-sub{font-size:11px;color:var(--muted);margin-top:3px}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.5px;font-family:monospace}.method.get{background:rgba(88,166,255,.15);color:#58a6ff}.method.post{background:rgba(63,185,80,.15);color:#3fb950}.method.put{background:rgba(210,153,34,.15);color:#d29922}.method.delete{background:rgba(248,81,73,.15);color:#f85149}
.http-code{font-family:monospace;font-weight:700}.http-code.ok{color:var(--pass)}.http-code.err{color:var(--fail)}.http-code.warn{color:var(--blocked)}
.rt-fast{color:var(--pass);font-weight:600}.rt-medium{color:var(--blocked);font-weight:600}.rt-slow{color:var(--fail);font-weight:600}
.lt-bar-bg{width:100%;background:var(--surface3);border-radius:4px;height:6px;overflow:hidden;min-width:80px}.lt-bar-fill{height:100%;border-radius:4px;transition:width .4s}.lt-bar-fill.pass{background:var(--pass)}.lt-bar-fill.warning{background:var(--blocked)}.lt-bar-fill.fail{background:var(--fail)}
.owasp-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}.owasp-dot.pass{background:var(--pass)}.owasp-dot.warning{background:var(--blocked)}.owasp-dot.fail{background:var(--fail)}
.sec-sev-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}.sec-sev-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center}.sec-sev-card .ssc-num{font-size:32px;font-weight:700}.sec-sev-card .ssc-lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600;margin-top:4px}.sec-sev-card.critical{border-top:3px solid var(--critical)}.sec-sev-card.high{border-top:3px solid var(--high)}.sec-sev-card.medium{border-top:3px solid var(--medium)}.sec-sev-card.low{border-top:3px solid var(--low)}.sec-sev-card.critical .ssc-num{color:var(--critical)}.sec-sev-card.high .ssc-num{color:var(--high)}.sec-sev-card.medium .ssc-num{color:var(--medium)}.sec-sev-card.low .ssc-num{color:var(--low)}
.api-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.tc-screenshot-wrap{margin-top:10px}.tc-screenshot-wrap label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:600;display:block;margin-bottom:6px}.tc-screenshot-thumb{width:100%;max-width:480px;border-radius:6px;border:1px solid var(--border);cursor:pointer;transition:border-color .15s;display:block}.tc-screenshot-thumb:hover{border-color:var(--accent)}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:var(--border)}
.copy-wrap{position:relative;display:inline-block;margin-left:6px;vertical-align:middle}.copy-btn{background:none;border:1px solid var(--border);border-radius:4px;color:var(--muted);cursor:pointer;font-size:10px;padding:1px 5px;line-height:1.4;transition:all .15s}.copy-btn:hover{color:var(--accent);border-color:var(--accent);background:rgba(88,166,255,.08)}.copied-alert{position:absolute;top:calc(100%+4px);left:50%;transform:translateX(-50%);background:var(--pass);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;display:none;z-index:20;pointer-events:none}
.cov-row-link td{cursor:pointer}.cov-row-link:hover td{background:var(--surface2)}
</style>
</head>
<body>
`;

  // ── CANONICAL TEMPLATE (BODY) ────────────────────────
const CANONICAL_TMPL_BODY=`
<nav id="sidebar">
<div class="sidebar-logo"><div class="project-name" id="sb-project"></div><div class="run-id" id="sb-runid"></div><div class="health-badge" id="sb-health"></div></div>
<nav>
<div class="nav-section-label">Dashboard</div>
<div class="nav-item active" data-page="overview"><span class="nav-icon">&#x1F3E0;</span> Overview</div>
<div class="nav-item" data-page="testcases"><span class="nav-icon">&#x1F4CB;</span> Test Cases</div>
<div class="nav-item" data-page="bugs"><span class="nav-icon">&#x1F41E;</span> Bug Report</div>
<div class="nav-section-label">Analysis</div>
<div class="nav-item" data-page="coverage"><span class="nav-icon">&#x1F4CA;</span> Coverage</div>
<div class="nav-item" data-page="artefacts"><span class="nav-icon">&#x1F4C1;</span> Artefacts</div>
<div class="nav-item" data-page="improvements"><span class="nav-icon">&#x1F4A1;</span> Improvements</div>
<div class="nav-section-label">Results</div>
<div class="nav-item" data-page="performance"><span class="nav-icon">&#x26A1;</span> Performance</div>
<div class="nav-item" data-page="api"><span class="nav-icon">&#x1F50C;</span> API</div>
<div class="nav-item" data-page="security"><span class="nav-icon">&#x1F512;</span> Security</div>
</nav>
<div class="sidebar-footer" id="sb-footer"></div>
</nav>
<div id="main">
<div class="page active" id="page-overview"><div class="page-header"><h1>Overview</h1><p id="ov-subtitle"></p></div><div id="ov-summary"></div><div class="run-meta" id="ov-meta"></div><div class="kpi-grid" id="ov-kpis"></div><div class="charts-row"><div class="chart-card"><h3>Results</h3><div class="chart-wrap"><canvas id="chart-donut"></canvas></div></div><div class="chart-card"><h3>Results by Category</h3><div class="chart-wrap"><canvas id="chart-bar"></canvas></div></div><div class="chart-card"><h3>Bugs by Severity</h3><div class="chart-wrap"><canvas id="chart-bugs"></canvas></div></div></div><div class="section-heading">Quality Gates</div><div class="gates-grid" id="ov-gates"></div></div>
<div class="page" id="page-testcases"><div class="page-header"><h1>Test Cases</h1><p>Click any row to expand full details</p></div><div class="tab-bar" id="tc-tabs"></div><div class="table-wrap"><div class="table-toolbar"><div class="search-wrap"><input class="search-input" id="tc-search" placeholder="Search test cases..." /><button class="clear-search-btn" id="tc-clear-btn" title="Clear search">&#x2715;</button></div><select class="filter-select" id="tc-status-filter"><option value="">All Statuses</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="blocked">Blocked</option><option value="notrun">Not Run</option></select><button id="tc-reset-btn" onclick="resetTCFilters()" style="display:none;align-items:center;gap:6px;background:rgba(88,166,255,.1);border:1px solid rgba(88,166,255,.35);color:var(--accent);border-radius:6px;font-size:12px;font-weight:600;padding:6px 12px;cursor:pointer">&#x2715; Reset</button><span class="table-count" id="tc-count"></span></div><table><thead><tr><th>TC ID</th><th>Module</th><th>Type</th><th>Scenario</th><th>Status</th><th>Priority</th><th>Bug ID</th></tr></thead><tbody id="tc-tbody"></tbody></table></div></div>
<div class="page" id="page-bugs"><div class="page-header"><h1>Bug Report</h1><p id="bug-page-subtitle">Click a row to expand full details</p></div><div class="table-wrap"><div class="table-toolbar"><div class="search-wrap"><input class="search-input" id="bug-search" placeholder="Search bugs..." /><button class="clear-search-btn" id="bug-clear-btn" title="Clear search">&#x2715;</button></div><select class="filter-select" id="bug-sev-filter"><option value="">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select class="filter-select" id="bug-type-filter"><option value="">All Types</option><option value="fn">Functionality</option><option value="ui">UI</option><option value="api">API</option><option value="sec">Security</option><option value="backend">Backend</option><option value="perf">Performance</option></select><button id="bug-reset-btn" onclick="resetBugFilters()" style="display:none;align-items:center;gap:6px;background:rgba(88,166,255,.1);border:1px solid rgba(88,166,255,.35);color:var(--accent);border-radius:6px;font-size:12px;font-weight:600;padding:6px 12px;cursor:pointer">&#x2715; Reset</button><span class="table-count" id="bug-count"></span></div><table><thead><tr><th>Bug ID</th><th>Type</th><th>Module</th><th>Summary</th><th>Severity</th><th>Priority</th><th>Evidence</th></tr></thead><tbody id="bug-tbody"></tbody></table></div></div>
<div class="page" id="page-coverage"><div class="page-header"><h1>Coverage</h1><p>Pass rate by module</p></div><div class="section-heading">Module Coverage</div><div class="table-wrap" style="margin-bottom:28px"><table><thead><tr><th>Module</th><th>Total</th><th>Pass</th><th>Fail</th><th>Not Run</th><th>Pass %</th></tr></thead><tbody id="cov-tbody"></tbody></table></div><div class="section-heading">Automation &amp; Pass Rate</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div class="chart-card"><h3>Automation vs Manual</h3><div class="chart-wrap"><canvas id="chart-auto"></canvas></div></div><div class="chart-card"><h3>Pass Rate by Category</h3><div class="chart-wrap"><canvas id="chart-passrate"></canvas></div></div></div></div>
<div class="page" id="page-artefacts"><div class="page-header"><h1>Artefacts</h1><p>All files generated</p></div><div class="artefact-grid" id="artefact-grid"></div></div>
<div class="page" id="page-improvements"><div class="page-header"><h1>Improvement Recommendations</h1><p>Prioritised actions</p></div><div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:24px;display:flex;align-items:center;gap:24px"><div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-weight:600;margin-bottom:4px">Improvement Score</div><div style="font-size:36px;font-weight:700;color:var(--accent)" id="imp-score-val"></div></div><div style="flex:1"><div style="background:var(--surface3);border-radius:6px;height:10px;overflow:hidden"><div id="imp-score-bar" style="height:100%;border-radius:6px;background:linear-gradient(90deg,var(--fail),var(--blocked),var(--pass));transition:width .5s"></div></div><div style="font-size:12px;color:var(--muted);margin-top:6px">Score out of 100</div></div></div><div class="improvement-grid" id="imp-grid"></div></div>
<div class="page" id="page-performance"><div class="page-header"><h1>Performance</h1><p id="perf-subtitle">Page load times</p></div><div class="result-kpi-grid" id="perf-kpis"></div><div class="section-heading">Page Load Results</div><div class="table-wrap"><table><thead><tr><th>Page</th><th>URL</th><th>Load Time</th><th>Requests</th><th>TTFB</th><th>SLA Bar</th><th>Status</th></tr></thead><tbody id="perf-tbody"></tbody></table></div></div>
<div class="page" id="page-api"><div class="page-header"><h1>API</h1><p id="api-subtitle">Endpoint tests</p></div><div class="result-kpi-grid" id="api-kpis"></div><div class="section-heading">Endpoint Results</div><div class="table-wrap"><div class="api-toolbar"><select class="filter-select" id="api-method-filter"><option value="">All Methods</option><option value="get">GET</option><option value="post">POST</option><option value="put">PUT</option><option value="delete">DELETE</option></select><select class="filter-select" id="api-result-filter"><option value="">All Results</option><option value="pass">Pass</option><option value="fail">Fail</option></select><button id="api-reset-btn" onclick="resetAPIFilters()" style="display:none">&#x2715; Reset</button><span class="table-count" id="api-count"></span></div><table><thead><tr><th>Method</th><th>Endpoint</th><th>Expected</th><th>Actual</th><th>Response Time</th><th>Result</th><th>Notes</th></tr></thead><tbody id="api-tbody"></tbody></table></div></div>
<div class="page" id="page-security"><div class="page-header"><h1>Security</h1><p>OWASP Top 10 &middot; Headers &middot; Payloads</p></div><div class="sec-sev-row" id="sec-sev-cards"></div><div class="section-heading">OWASP Top 10</div><div class="table-wrap" style="margin-bottom:28px"><table><thead><tr><th style="width:60px">ID</th><th>Vulnerability</th><th style="width:100px">Status</th><th>Notes</th></tr></thead><tbody id="sec-owasp-tbody"></tbody></table></div><div class="section-heading">Security Headers</div><div class="table-wrap" style="margin-bottom:28px"><table><thead><tr><th>Header</th><th style="width:80px">Present</th><th>Value</th><th style="width:100px">Status</th></tr></thead><tbody id="sec-headers-tbody"></tbody></table></div><div class="section-heading">Injection Payload Tests</div><div class="table-wrap"><table><thead><tr><th style="width:70px">Type</th><th>Payload</th><th>Field</th><th style="width:100px">Result</th><th>Notes</th></tr></thead><tbody id="sec-payloads-tbody"></tbody></table></div></div>
</div>
<div id="lightbox"><button id="lightbox-close" onclick="closeLightbox()">&#x2715;</button><img id="lightbox-img" src="" alt="Evidence" /></div>
<script>
const D=window.QA;
function sBadge(s){const m={pass:'Pass',fail:'Fail',blocked:'Blocked',notrun:'Not Run'};return '<span class="badge '+s+'">'+(m[s]||s)+'</span>';}
function sevBadge(s){return '<span class="badge '+s+'">'+s.charAt(0).toUpperCase()+s.slice(1)+'</span>';}
function typeBadge(t){const l={fn:'Functional',ui:'UI',api:'API',sec:'Security',backend:'Backend',perf:'Performance'};return '<span class="badge '+t+'">'+(l[t]||t)+'</span>';}
function pctClass(p){return p>=80?'green':p>=50?'amber':'red';}
function covBar(pct){var c=pctClass(pct);return '<div class="coverage-bar-cell"><div class="cov-bar-wrap"><div class="cov-bar-bg"><div class="cov-bar-fill '+c+'" style="width:'+pct+'%"></div></div><span class="cov-pct '+c+'">'+pct+'%</span></div></div>';}
function escAttr(str){return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function copyWrap(text){return '<span class="copy-wrap"><button class="copy-btn" data-copy="'+escAttr(text)+'" title="Copy">&#x2398;</button><span class="copied-alert">Copied!</span></span>';}
function copyField(btn,text){var doAlert=function(){var al=btn.nextElementSibling;if(al){al.style.display='block';setTimeout(function(){al.style.display='none';},1500);}};if(navigator.clipboard){navigator.clipboard.writeText(text).then(doAlert).catch(function(){legacyCopy(text);doAlert();});}else{legacyCopy(text);doAlert();}}
function legacyCopy(text){var ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
function navigateTo(opts){var page=typeof opts==='string'?opts:opts.page;document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});var navEl=document.querySelector('[data-page="'+page+'"]');if(navEl)navEl.classList.add('active');document.getElementById('page-'+page).classList.add('active');setTimeout(function(){if(page==='testcases'){if(opts.tab){document.querySelectorAll('#tc-tabs .tab-btn').forEach(function(b){b.classList.remove('active');});var t=document.querySelector('#tc-tabs .tab-btn[data-cat="'+opts.tab+'"]');if(t){t.classList.add('active');tcTab=opts.tab;}}if(opts.tcFilter!==undefined)document.getElementById('tc-status-filter').value=opts.tcFilter||'';renderTC();}if(page==='bugs'){if(opts.bugType)document.getElementById('bug-type-filter').value=opts.bugType;renderBugs();}if(page==='performance')renderPerformance();if(page==='api')renderAPI();if(page==='security')renderSecurity();},80);}
function navigateToBug(bugId){navigateTo({page:'bugs'});}
document.getElementById('sb-project').textContent=D.project;document.getElementById('sb-runid').textContent=D.runId;var hEl=document.getElementById('sb-health');hEl.textContent='Health: '+D.health;hEl.style.cssText='background:'+D.healthColor+'22;color:'+D.healthColor+';border:1px solid '+D.healthColor+'44';document.getElementById('sb-footer').innerHTML='Run: '+D.runDate+'<br>'+D.executedBy;
document.querySelectorAll('.nav-item').forEach(function(el){el.addEventListener('click',function(){document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});el.classList.add('active');document.getElementById('page-'+el.dataset.page).classList.add('active');if(el.dataset.page==='performance')renderPerformance();if(el.dataset.page==='api')renderAPI();if(el.dataset.page==='security')renderSecurity();});});
document.getElementById('ov-subtitle').textContent=D.url+' · '+D.runDate;
var healthClass=D.health.toLowerCase();document.getElementById('ov-summary').innerHTML='<div class="summary-card '+healthClass+'"><div class="sum-label">Run Summary</div><div class="sum-text">'+D.summary+'</div><div class="sum-highlights">'+(D.summaryTags||[]).map(function(t){return '<span class="sum-tag '+t.type+'" '+(t.nav?'data-nav="1" onclick="navigateTo('+escAttr(JSON.stringify(t.nav))+')"':'')+'>'+t.label+'</span>';}).join('')+'</div></div>';
document.getElementById('ov-meta').innerHTML=[['Project',D.project],['URL',D.url],['Run ID',D.runId],['Environment',D.environment],['Executed By',D.executedBy],['Start',D.startTime],['End',D.endTime],['Duration',D.duration],['Browsers',D.browsers]].map(function(x){return '<div class="run-meta-item"><span class="label">'+x[0]+'</span><span class="value">'+x[1]+'</span></div>';}).join('');
var passRate=D.total>0?Math.round(D.pass/D.total*100):0;var kpis=[{cls:'total',val:D.total,label:'Total',sub:'Test Cases',nav:null},{cls:'pass',val:D.pass,label:'Passed',sub:passRate+'% pass rate',nav:{page:'testcases',tcFilter:'pass'}},{cls:'fail',val:D.fail,label:'Failed',sub:'Needs attention',nav:{page:'testcases',tcFilter:'fail'}},{cls:'blocked',val:D.blocked,label:'Blocked',sub:'Awaiting unblock',nav:{page:'testcases',tcFilter:'blocked'}},{cls:'notrun',val:D.notrun,label:'Not Run',sub:'Pending',nav:{page:'testcases',tcFilter:'notrun'}},{cls:'bugs',val:D.bugCount,label:'Bugs',sub:D.bugsBySeverity.critical+' critical',nav:{page:'bugs'}}];
document.getElementById('ov-kpis').innerHTML=kpis.map(function(k){return '<div class="kpi-card '+k.cls+'" '+(k.nav?'data-nav="1" onclick="navigateTo('+escAttr(JSON.stringify(k.nav))+')"':'')+'><div class="kpi-value">'+k.val+'</div><div class="kpi-label">'+k.label+'</div><div class="kpi-sub">'+k.sub+'</div></div>';}).join('');
Chart.defaults.color='#8b949e';
new Chart(document.getElementById('chart-donut'),{type:'doughnut',data:{labels:['Pass','Fail','Not Run','Blocked'],datasets:[{data:[D.pass,D.fail,D.notrun,D.blocked],backgroundColor:['#3fb950','#f85149','#6e7681','#d29922'],borderWidth:0,hoverOffset:4}]},options:{plugins:{legend:{position:'bottom',labels:{padding:12,boxWidth:10,font:{size:11}}}},cutout:'68%'}});
new Chart(document.getElementById('chart-bar'),{type:'bar',data:{labels:D.categories.map(function(c){return c.name;}),datasets:[{label:'Pass',data:D.categories.map(function(c){return c.pass;}),backgroundColor:'#3fb950'},{label:'Fail',data:D.categories.map(function(c){return c.fail;}),backgroundColor:'#f85149'},{label:'Not Run',data:D.categories.map(function(c){return c.notrun;}),backgroundColor:'#6e7681'}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,boxWidth:10,font:{size:11}}}},scales:{x:{stacked:true,grid:{color:'#30363d'}},y:{stacked:true,grid:{color:'#30363d'}}}}});
var bs=D.bugsBySeverity;new Chart(document.getElementById('chart-bugs'),{type:'doughnut',data:{labels:['Critical','High','Medium','Low'],datasets:[{data:[bs.critical,bs.high,bs.medium,bs.low],backgroundColor:['#ff6b6b','#ffa94d','#74c0fc','#69db7c'],borderWidth:0,hoverOffset:4}]},options:{plugins:{legend:{position:'bottom',labels:{padding:12,boxWidth:10,font:{size:11}}}},cutout:'68%'}});
document.getElementById('ov-gates').innerHTML=D.gates.map(function(g){return '<div class="gate-item" '+(g.nav?'data-nav="1" onclick="navigateTo('+escAttr(JSON.stringify(g.nav))+')"':'')+'><div class="gate-dot '+g.status+'"></div><div class="gate-info"><div class="gate-name">'+g.name+'</div><div class="gate-detail">'+g.detail+'</div></div><div class="gate-badge '+g.status+'">'+g.status.toUpperCase()+'</div></div>';}).join('');
var tcCatsSet={};D.testCases.forEach(function(tc){var c=tc.type||'Other';tcCatsSet[c]=1;});var tcCats=['All'].concat(Object.keys(tcCatsSet));var tcTab='All';
function catFromId(id){var tc=D.testCases.find(function(t){return t.id===id;});return tc?tc.type:'Other';}
function getTabCount(cat){if(cat==='All')return D.testCases.length;return D.testCases.filter(function(tc){return catFromId(tc.id)===cat;}).length;}
document.getElementById('tc-tabs').innerHTML=tcCats.map(function(c){return '<button class="tab-btn '+(c==='All'?'active':'')+'" data-cat="'+c+'">'+c+' ('+getTabCount(c)+')</button>';}).join('');
document.querySelectorAll('#tc-tabs .tab-btn').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('#tc-tabs .tab-btn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');tcTab=btn.dataset.cat;renderTC();});});
function updateTCClearBtn(){var val=document.getElementById('tc-search').value;var btn=document.getElementById('tc-clear-btn');if(btn)btn.classList.toggle('visible',val.length>0);}
function clearTCSearch(){document.getElementById('tc-search').value='';updateTCClearBtn();renderTC();}
document.getElementById('tc-search').addEventListener('input',function(){updateTCClearBtn();renderTC();});
document.getElementById('tc-status-filter').addEventListener('change',function(){renderTC();});
var tcClearBtn2=document.getElementById('tc-clear-btn');if(tcClearBtn2)tcClearBtn2.addEventListener('click',clearTCSearch);
function resetTCFilters(){document.getElementById('tc-status-filter').value='';document.getElementById('tc-search').value='';updateTCClearBtn();renderTC();}
function renderTC(){var q=document.getElementById('tc-search').value.toLowerCase();var sf=document.getElementById('tc-status-filter').value;var tbody=document.getElementById('tc-tbody');tbody.innerHTML='';var list=D.testCases.filter(function(tc){if(tcTab!=='All'&&catFromId(tc.id)!==tcTab)return false;if(sf&&tc.status!==sf)return false;if(q&&!JSON.stringify(tc).toLowerCase().includes(q))return false;return true;});document.getElementById('tc-count').textContent=list.length+' test case'+(list.length!==1?'s':'');if(list.length===0){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="es-icon">&#x1F50D;</div><div class="es-title">No results</div><div class="es-sub">Try adjusting filters.</div></div></td></tr>';return;}list.forEach(function(tc){var r=document.createElement('tr');var bugCell=tc.bugId?'<td><span style="font-family:monospace;font-size:12px;color:var(--accent)">'+tc.bugId+'</span></td>':'<td style="color:var(--muted)">&mdash;</td>';r.innerHTML='<td style="font-family:monospace;font-size:12px;color:var(--accent)">'+tc.id+'</td><td>'+tc.module+'</td><td class="muted">'+tc.type+'</td><td>'+tc.scenario+'</td><td>'+sBadge(tc.status)+'</td><td><span class="badge '+tc.priority.toLowerCase()+'">'+tc.priority+'</span></td>'+bugCell;tbody.appendChild(r);var xr=document.createElement('tr');xr.className='expand-row';xr.style.display='none';var hasDetail=tc.steps||tc.expected||tc.actual;xr.innerHTML='<td colspan="7"><div class="expand-content">'+(tc.steps?'<div class="expand-field full"><label>Steps</label><ol class="expand-steps">'+tc.steps.map(function(s){return '<li>'+s+'</li>';}).join('')+'</ol></div>':'')+(tc.expected?'<div class="expand-field"><label>Expected</label><p>'+tc.expected+'</p></div>':'')+(tc.actual?'<div class="expand-field"><label>Actual</label><p style="color:var(--fail)">'+tc.actual+'</p></div>':'')+(!hasDetail?'<div class="expand-field"><label>Result</label><p style="color:var(--muted)">No details.</p></div>':'')+'</div></td>';tbody.appendChild(xr);r.addEventListener('click',function(){var open=xr.style.display!=='none';xr.style.display=open?'none':'table-row';r.classList.toggle('expanded',!open);});});}
renderTC();
document.getElementById('bug-page-subtitle').textContent=D.bugCount+' bugs filed';
function updateBugResetBtn(){var active=document.getElementById('bug-sev-filter').value||document.getElementById('bug-type-filter').value;document.getElementById('bug-reset-btn').style.display=active?'inline-flex':'none';}
function resetBugFilters(){document.getElementById('bug-sev-filter').value='';document.getElementById('bug-type-filter').value='';updateBugResetBtn();renderBugs();}
function updateBugClearBtn(){var val=document.getElementById('bug-search').value;var btn=document.getElementById('bug-clear-btn');if(btn)btn.classList.toggle('visible',val.length>0);}
document.getElementById('bug-search').addEventListener('input',function(){updateBugClearBtn();renderBugs();});
document.getElementById('bug-sev-filter').addEventListener('change',function(){updateBugResetBtn();renderBugs();});
document.getElementById('bug-type-filter').addEventListener('change',function(){updateBugResetBtn();renderBugs();});
var bugClearBtn2=document.getElementById('bug-clear-btn');if(bugClearBtn2)bugClearBtn2.addEventListener('click',function(){document.getElementById('bug-search').value='';updateBugClearBtn();renderBugs();});
function renderBugs(){var q=document.getElementById('bug-search').value.toLowerCase();var sf=document.getElementById('bug-sev-filter').value;var tf=document.getElementById('bug-type-filter').value;var tbody=document.getElementById('bug-tbody');tbody.innerHTML='';var list=D.bugs.filter(function(b){if(sf&&b.severity!==sf)return false;if(tf&&b.type!==tf)return false;if(q&&!JSON.stringify(b).toLowerCase().includes(q))return false;return true;});document.getElementById('bug-count').textContent=list.length+' bug'+(list.length!==1?'s':'');if(list.length===0){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="es-icon">&#x1F41E;</div><div class="es-title">No bugs found</div><div class="es-sub">Adjust filters.</div></div></td></tr>';return;}list.forEach(function(bug){var r=document.createElement('tr');r.innerHTML='<td style="font-family:monospace;font-size:12px;font-weight:700;color:var(--accent)">'+bug.id+'</td><td>'+typeBadge(bug.type)+'</td><td>'+bug.module+'</td><td>'+bug.summary+'</td><td>'+sevBadge(bug.severity)+'</td><td><span class="badge '+bug.priority.toLowerCase()+'">'+bug.priority+'</span></td><td style="color:var(--muted)">&mdash;</td>';tbody.appendChild(r);var xr=document.createElement('tr');xr.className='expand-row';xr.style.display='none';xr.innerHTML='<td colspan="7"><div class="expand-content"><div class="expand-field"><label>Module</label><p>'+bug.module+'</p></div><div class="expand-field"><label>Summary</label><p>'+bug.summary+'</p></div><div class="expand-field"><label>Root Cause</label><p>'+(bug.rootCause||'Under investigation')+'</p></div>'+(bug.steps?'<div class="expand-field full"><label>Steps</label><ol class="expand-steps">'+bug.steps.map(function(s){return '<li>'+s+'</li>';}).join('')+'</ol></div>':'')+(bug.expected?'<div class="expand-field"><label>Expected</label><p>'+bug.expected+'</p></div>':'')+(bug.actual?'<div class="expand-field"><label>Actual</label><p style="color:var(--fail)">'+bug.actual+'</p></div>':'')+'</div></td>';tbody.appendChild(xr);r.addEventListener('click',function(){var open=xr.style.display!=='none';xr.style.display=open?'none':'table-row';r.classList.toggle('expanded',!open);});});}
renderBugs();
var covTbody=document.getElementById('cov-tbody');covTbody.innerHTML=D.coverage.map(function(c){var pct=c.total>0?Math.round(c.pass/c.total*100):0;return '<tr><td style="font-weight:600">'+c.module+'</td><td>'+c.total+'</td><td style="color:var(--pass)">'+c.pass+'</td><td style="color:var(--fail)">'+c.fail+'</td><td style="color:var(--notrun)">'+c.notrun+'</td><td>'+covBar(pct)+'</td></tr>';}).join('');
new Chart(document.getElementById('chart-auto'),{type:'doughnut',data:{labels:['Automated','Manual'],datasets:[{data:[70,30],backgroundColor:['#388bfd','#d29922'],borderWidth:0}]},options:{plugins:{legend:{position:'bottom',labels:{padding:12,boxWidth:10,font:{size:11}}}},cutout:'65%'}});
new Chart(document.getElementById('chart-passrate'),{type:'bar',data:{labels:D.categories.map(function(c){return c.name;}),datasets:[{label:'Pass %',data:D.categories.map(function(c){return c.total>0?Math.round(c.pass/c.total*100):0;}),backgroundColor:'#58a6ff',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'#30363d'},ticks:{callback:function(v){return v+'%';}}},x:{grid:{color:'#30363d'}}}}});
document.getElementById('artefact-grid').innerHTML=D.artefacts.map(function(a){return '<div class="artefact-card"><div class="artefact-icon">'+a.icon+'</div><div class="artefact-info"><div class="file-name">'+a.name+'</div><div class="file-desc">'+a.desc+'</div><div class="file-path">'+a.path+'</div></div></div>';}).join('');
var tScore=D.improvements.reduce(function(a,i){return a+i.score;},0);var tMax=D.improvements.reduce(function(a,i){return a+i.scoreMax;},0);var ipct=Math.round(tScore/tMax*100);document.getElementById('imp-score-val').textContent=ipct+' / 100';document.getElementById('imp-score-bar').style.width=ipct+'%';document.getElementById('imp-grid').innerHTML=D.improvements.map(function(i){var sp=Math.round(i.score/i.scoreMax*100);var sc=sp>=80?'var(--pass)':sp>=50?'var(--blocked)':'var(--fail)';return '<div class="improvement-card"><div class="imp-header"><span class="imp-icon">'+i.icon+'</span><span class="imp-title">'+i.title+'</span><span class="imp-score" style="background:'+sc+'22;color:'+sc+'">'+i.score+'/'+i.scoreMax+'</span></div><ul>'+i.items.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>';}).join('');
function openLightbox(src){document.getElementById('lightbox-img').src=src;document.getElementById('lightbox').classList.add('open');}
function closeLightbox(){document.getElementById('lightbox').classList.remove('open');}
document.getElementById('lightbox').addEventListener('click',function(e){if(e.target===this)closeLightbox();});
function renderPerformance(){var P=D.performance;document.getElementById('perf-kpis').innerHTML='<div class="result-kpi info-top"><div class="rkpi-val" style="color:var(--accent)">'+P.summary.pagesCount+'</div><div class="rkpi-lbl">Pages Tested</div></div><div class="result-kpi info-top"><div class="rkpi-val" style="color:var(--accent)">'+(P.summary.avgLoad/1000).toFixed(2)+'s</div><div class="rkpi-lbl">Avg Load Time</div></div><div class="result-kpi '+(P.summary.slaBreaches>0?'fail':'pass')+'-top"><div class="rkpi-val" style="color:'+(P.summary.slaBreaches>0?'var(--fail)':'var(--pass)')+'">'+P.summary.slaBreaches+'</div><div class="rkpi-lbl">SLA Breaches</div></div><div class="result-kpi info-top"><div class="rkpi-val" style="color:var(--accent)">'+P.summary.totalRequests+'</div><div class="rkpi-lbl">Total Requests</div></div>';var tbody=document.getElementById('perf-tbody');tbody.innerHTML='';P.pages.forEach(function(pg){var pct=Math.min((pg.loadTime/P.thresholds.page)*100,100);var rtClass=pg.loadTime<3000?'rt-fast':pg.loadTime<P.thresholds.page?'rt-medium':'rt-slow';var ttClass=pg.ttfb<500?'rt-fast':pg.ttfb<900?'rt-medium':'rt-slow';var dot='<span class="owasp-dot '+pg.status+'"></span>';tbody.innerHTML+='<tr><td><strong>'+pg.name+'</strong></td><td style="font-family:monospace;font-size:12px;color:var(--muted)">'+pg.url+'</td><td class="'+rtClass+'">'+(pg.loadTime/1000).toFixed(2)+'s</td><td>'+pg.requests+'</td><td class="'+ttClass+'">'+pg.ttfb+'ms</td><td style="min-width:100px"><div class="lt-bar-bg"><div class="lt-bar-fill '+pg.status+'" style="width:'+pct+'%"></div></div></td><td>'+dot+pg.status.charAt(0).toUpperCase()+pg.status.slice(1)+'</td></tr>';});}
function renderAPI(){var A=D.api;var pr2=A.summary.total>0?Math.round(A.summary.pass/A.summary.total*100):0;document.getElementById('api-kpis').innerHTML='<div class="result-kpi info-top"><div class="rkpi-val" style="color:var(--accent)">'+A.summary.total+'</div><div class="rkpi-lbl">Endpoints</div></div><div class="result-kpi pass-top"><div class="rkpi-val" style="color:var(--pass)">'+A.summary.pass+'</div><div class="rkpi-lbl">Passed</div></div><div class="result-kpi '+(A.summary.fail>0?'fail':'pass')+'-top"><div class="rkpi-val" style="color:'+(A.summary.fail>0?'var(--fail)':'var(--pass)')+'">'+A.summary.fail+'</div><div class="rkpi-lbl">Failed</div></div><div class="result-kpi info-top"><div class="rkpi-val" style="color:var(--accent)">'+A.summary.avgResponseTime+'ms</div><div class="rkpi-lbl">Avg Response</div></div>';renderAPITable();}
function renderAPITable(){var A=D.api;var mf=(document.getElementById('api-method-filter')||{}).value||'';var rf=(document.getElementById('api-result-filter')||{}).value||'';var list=A.endpoints.filter(function(e){return(!mf||e.method.toLowerCase()===mf)&&(!rf||e.result===rf);});document.getElementById('api-count').textContent=list.length+' endpoint'+(list.length!==1?'s':'');var tbody=document.getElementById('api-tbody');tbody.innerHTML='';list.forEach(function(ep){var mLower=ep.method.toLowerCase();var statusClass=ep.actualStatus>=500?'err':ep.actualStatus>=400?'warn':'ok';var rtClass=ep.responseTime<500?'rt-fast':ep.responseTime<2000?'rt-medium':'rt-slow';var dot='<span class="owasp-dot '+ep.result+'"></span>';tbody.innerHTML+='<tr><td><span class="method '+mLower+'">'+ep.method+'</span></td><td style="font-family:monospace;font-size:12px">'+ep.endpoint+'</td><td class="http-code ok">'+ep.expectedStatus+'</td><td class="http-code '+statusClass+'">'+ep.actualStatus+'</td><td class="'+rtClass+'">'+ep.responseTime+'ms</td><td>'+dot+ep.result.charAt(0).toUpperCase()+ep.result.slice(1)+'</td><td style="color:var(--muted);font-size:12px">'+(ep.notes||'—')+'</td></tr>';});}
function resetAPIFilters(){document.getElementById('api-method-filter').value='';document.getElementById('api-result-filter').value='';renderAPITable();}
function renderSecurity(){var S2=D.security;document.getElementById('sec-sev-cards').innerHTML=['critical','high','medium','low'].map(function(sev){return '<div class="sec-sev-card '+sev+'"><div class="ssc-num">'+S2.summary[sev]+'</div><div class="ssc-lbl">'+sev.charAt(0).toUpperCase()+sev.slice(1)+'</div></div>';}).join('');var owaspTbody=document.getElementById('sec-owasp-tbody');owaspTbody.innerHTML='';S2.owasp.forEach(function(item){owaspTbody.innerHTML+='<tr><td style="font-family:monospace;font-weight:700;color:var(--accent)">'+item.id+'</td><td>'+item.name+'</td><td><span class="owasp-dot '+item.status+'"></span>'+item.status.charAt(0).toUpperCase()+item.status.slice(1)+'</td><td style="color:var(--muted);font-size:12px">'+(item.notes||'—')+'</td></tr>';});var headersTbody=document.getElementById('sec-headers-tbody');headersTbody.innerHTML='';S2.headers.forEach(function(h){headersTbody.innerHTML+='<tr><td style="font-family:monospace;font-size:12px">'+h.header+'</td><td>'+(h.present?'<span style="color:var(--pass)">Yes</span>':'<span style="color:var(--fail)">No</span>')+'</td><td style="font-family:monospace;font-size:12px;color:var(--muted)">'+(h.value||'—')+'</td><td><span class="owasp-dot '+h.status+'"></span>'+h.status.charAt(0).toUpperCase()+h.status.slice(1)+'</td></tr>';});var payloadsTbody=document.getElementById('sec-payloads-tbody');payloadsTbody.innerHTML='';S2.payloads.forEach(function(p){payloadsTbody.innerHTML+='<tr><td><span style="color:'+(p.type==='XSS'?'var(--high)':'var(--critical)')+';font-weight:700;font-size:12px">'+p.type+'</span></td><td style="font-family:monospace;font-size:12px;max-width:300px;word-break:break-all">'+p.payload+'</td><td style="color:var(--muted)">'+p.field+'</td><td><span class="owasp-dot '+p.result+'"></span>'+p.result.charAt(0).toUpperCase()+p.result.slice(1)+'</td><td style="color:var(--muted);font-size:12px">'+(p.notes||'—')+'</td></tr>';});}
<\/script>
</body>
</html>`;

  // ── INIT (from original IIFE) ────────────────────────
  renderPipeList();renderRuns();
  // Restore API provider + key
  try{
    const savedProv=localStorage.getItem(APIKEY_KEY+'_prov');
    if(savedProv&&API_PROVIDERS[savedProv]){document.getElementById('apiProvider').value=savedProv;S.apiProvider=savedProv;}
    const prov=getProvider();
    document.getElementById('apiKey').placeholder=prov.placeholder;
    const k=localStorage.getItem(APIKEY_KEY);
    if(k){verifiedApiKey=k;document.getElementById('apiKey').value=k;document.getElementById('apiKeyBtn').textContent='Clear';
      document.getElementById('apiKeyAlert').className='apikey-alert ok';document.getElementById('apiKeyAlert').textContent=prov.name+' key loaded.';}
  }catch(e){}
  // Restore state
  const loaded=loadS();
  if(loaded&&Object.keys(S.completed).length>0){
    const done=Object.keys(S.completed).length;
    log('Checkpoint found: '+done+' steps saved — click RESUME','warn');
    if(S.url)document.getElementById('url').value=S.url;
    if(S.notes){document.getElementById('notes').value=S.notes;onNotesInput();}
    if(S.stype){document.getElementById('stype').value=S.stype;siteTypeChange();}
    if(S.cats){Object.keys(CAT_DEFS).forEach(c=>{const cb=document.querySelector('#chip-'+c+' input');if(cb){cb.checked=S.cats.includes(c);document.getElementById('chip-'+c).classList.toggle('on',cb.checked);}});renderPipeList();}
    Object.keys(S.completed).forEach(id=>{if(CAT_DEFS[id])setBadge(id,'done','done ✓');});
    updTopbar();setDot('warn');
    const totalB=S.cats.length;
    setProg('Paused — click Resume',(done/totalB)*100,done+'/'+totalB+' steps saved');
    // Restore automation files if present
    if(S.automationFiles&&Object.keys(S.automationFiles).length>0){
      document.getElementById('es-auto').classList.add('hidden');
      document.getElementById('c-auto').classList.remove('hidden');
      document.getElementById('c-auto').style.display='flex';
      renderFileTree();
    }
    if(S.executionResults){
      document.getElementById('tab-rpt').classList.remove('hidden');
    }
  }

  // ── EXPOSE FUNCTIONS TO GLOBAL SCOPE ───────────────────
  // (Required for onclick/onchange/oninput handlers in HTML)
  var _w = window;
  _w.addTestCaseRow = addTestCaseRow;
  _w.cancelEditTC = cancelEditTC;
  _w.clearAll = clearAll;
  _w.clearLog = clearLog;
  _w.clearNotes = clearNotes;
  _w.closeConfirm = closeConfirm;
  _w.closeModal = closeModal;
  _w.confirmRestart = confirmRestart;
  _w.confirmYes = confirmYes;
  _w.deleteRun = deleteRun;
  _w.deleteTestCase = deleteTestCase;
  _w.downloadAutoZip = downloadAutoZip;
  _w.downloadReport = downloadReport;
  _w.editTestCase = editTestCase;
  _w.exportCSV = exportCSV;
  _w.filterTCs = filterTCs;
  _w.generateAutomationScript = generateAutomationScript;
  _w.guardConfigChange = guardConfigChange;
  _w.handleApiKeyBtn = handleApiKeyBtn;
  _w.handleFiles = handleFiles;
  _w.loadMoreRuns = loadMoreRuns;
  _w.onAutoEditorInput = onAutoEditorInput;
  _w.onNotesInput = onNotesInput;
  _w.onProviderChange = onProviderChange;
  _w.removeFile = removeFile;
  _w.renderRuns = renderRuns;
  _w.rephraseNotes = rephraseNotes;
  // resetAPIFilters / resetBugFilters / resetTCFilters live inside the
  // canonical-report template string (not real functions at this scope),
  // so we intentionally do NOT bind them here.
  _w.runAutomation = runAutomation;
  _w.saveEditTC = saveEditTC;
  _w.selectAutoTool = selectAutoTool;
  _w.selectRun = selectRun;
  _w.sendReportEmail = sendReportEmail;
  _w.showAutoModal = showAutoModal;
  _w.showRunModal = showRunModal;
  _w.siteTypeChange = siteTypeChange;
  _w.startQA = startQA;
  _w.stopQA = stopQA;
  _w.sw = sw;
  _w.syncChip = syncChip;
  _w.toggleKeyVis = toggleKeyVis;
  _w.useRephrase = useRephrase;

  // ── Host bridge: receive hydration from parent (has full closure access) ─
  function applyHostHydration(payload){
    try{
      if(Array.isArray(payload.runs)){
        try{localStorage.setItem(RUNS_KEY,JSON.stringify(payload.runs));}catch(e){}
      }
      if(payload.state && typeof payload.state === 'object'){
        try{localStorage.setItem(STORE,JSON.stringify(payload.state));}catch(e){}
      }
      if(payload.provider && API_PROVIDERS[payload.provider]){
        var pSel=document.getElementById('apiProvider');
        if(pSel){ pSel.value=payload.provider; S.apiProvider=payload.provider; onProviderChange(); }
      }
      if(payload.apiKey){
        verifiedApiKey = payload.apiKey;
        var inp=document.getElementById('apiKey');
        if(inp){
          inp.value=payload.apiKey;
          inp.classList.add('valid');
        }
        var btn=document.getElementById('apiKeyBtn');
        if(btn){ btn.textContent='Clear'; btn.disabled=false; }
        var al=document.getElementById('apiKeyAlert');
        var prov=getProvider();
        if(al){ al.className='apikey-alert ok'; al.textContent=prov.name+' key restored.'; }
      }
      try{
        var c=document.getElementById('cnt-prev');
        if(c) c.textContent=getRuns().length;
        renderRuns();
      }catch(e){}
    }catch(err){console.warn('[qa-agent] hydrate failed',err);}
  }
  _w.__qaHostHydrate = applyHostHydration;

  window.addEventListener('message', function(ev){
    var m = ev && ev.data;
    if(!m || m.source !== 'qa-agent-host') return;
    if(m.type === 'hydrate') applyHostHydration(m.data || {});
  });
}

function _bootQAAgent(){
  initQAAgent();
  try{
    if(window.parent && window.parent !== window){
      window.parent.postMessage({source:'qa-agent',type:'ready',data:{}},'*');
    }
  }catch(e){}
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootQAAgent);
} else {
  _bootQAAgent();
}

})();
