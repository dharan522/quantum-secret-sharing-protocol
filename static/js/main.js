// ── Tab switching ──────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name === 'run' ? 'run' : 'eval')) {
      b.classList.add('active');
    }
  });
}

// ── Toggle text / file input ──────────────────────────
function toggleInput() {
  const type = document.getElementById('input_type').value;
  document.getElementById('text_input').style.display = type === 'text' ? 'block' : 'none';
  document.getElementById('file_input').style.display = type === 'file' ? 'block' : 'none';
}

// ── Attack option selection ────────────────────────────
document.querySelectorAll('.attack-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.attack-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
  });
});

// ── Read input message ────────────────────────────────
async function getInputMessage() {
  const type = document.getElementById('input_type').value;
  if (type === 'text') return document.getElementById('msg').value;
  const file = document.getElementById('myfile').files[0];
  if (!file) { alert('Please select a file.'); return null; }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject('File read failed.');
    reader.readAsText(file);
  });
}

// ── HTTP helpers ──────────────────────────────────────
async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}
async function get(url) { return (await fetch(url)).json(); }

// ── Set run badge ─────────────────────────────────────
function setRunBadge(text, color) {
  const b = document.getElementById('runBadge');
  const styles = {
    green:  'background:#dcfce7;color:#16a34a;border:1px solid #86efac;',
    red:    'background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;',
    yellow: 'background:#fef9c3;color:#ca8a04;border:1px solid #fcd34d;',
    blue:   'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;',
  };
  b.style.cssText = styles[color] || '';
  b.textContent = text;
}

// ── Global state ──────────────────────────────────────
let _last = null;

// ── RUN ───────────────────────────────────────────────
async function run() {
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Running...';
  setRunBadge('', '');
  document.getElementById('output').innerHTML = `
    <div class="idle-msg">
      <div class="spinner" style="width:28px;height:28px;border:3px solid #cbd5e1;border-top-color:#1e3a5f;"></div>
      <p style="margin-top:10px;">Running protocol via Qiskit AER...</p>
    </div>`;

  const message = await getInputMessage();
  if (!message) {
    btn.disabled = false;
    btn.innerHTML = '▶ Run Protocol';
    return;
  }

  const attackVal = document.querySelector('.attack-opt.active input').value;

  const res = await post('/run', {
    num_members: +document.getElementById('n').value,
    k: +document.getElementById('k').value,
    r: +document.getElementById('r').value,
    message: message,
    attack: attackVal,
  });

  btn.disabled = false;
  btn.innerHTML = '▶ Run Protocol';

  if (res.status === 'error') {
    setRunBadge('ERROR', 'red');
    document.getElementById('output').innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">⚠</span>
        <div><b>Input Error</b><br>${res.message}</div>
      </div>`;
    return;
  }

  _last = res.data;
  display(res.data);
}

// ── DISPLAY ───────────────────────────────────────────
function display(d) {
  let h = '';

  // GHZ State
  h += section('GHZ State', 'info',
    infoRows([['State Formula', d.ghz, 'blue']]) +
    `<div style="margin-top:8px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">Quantum Circuit</div>
     <div class="circuit-box">${d.circuit}</div>`
  );

  // Qubit Measurements
  h += section('Qubit Measurements', 'ok',
    tableFromObj(d.measurements, ['Member', 'Measurement'])
  );

  // Channel Status
  const chOk = d.channel === 'SECURE';
  h += section('Channel Status', chOk ? 'ok' : 'fail',
    `<div class="alert ${chOk ? 'alert-success' : 'alert-danger'}">
      <span class="alert-icon">${chOk ? '✅' : '🛑'}</span>
      <div><b>Channel: ${d.channel}</b></div>
    </div>`
  );

  if (!chOk) {
    if (d.attack) {
      h += section('Attack Detected', 'fail', tableFromObj(d.attack, ['Field', 'Value']));
    }
    h += `<div class="alert alert-danger"><span class="alert-icon">🛑</span><div><b>${d.stopped_at || 'Protocol aborted.'}</b></div></div>`;
    setRunBadge('COMPROMISED', 'red');
    document.getElementById('output').innerHTML = h;
    return;
  }

  // AES Encryption
  h += section('AES-256-GCM Encryption', 'ok',
    infoRows([
      ['AES Key', d.aes_key, 'blue'],
      ['Encrypted Size', d.encrypted_size + ' bytes', ''],
    ])
  );

  // QSS Split
  const zones = `
    <div class="zone-row">
      <div class="zone-block zone-secure ${d.zone === 'SECURE ZONE' ? 'active' : ''}">
        <div class="z-name">Secure Zone</div>
        <div class="z-desc">${d.zones.secure}</div>
      </div>
      <div class="zone-block zone-ramp ${d.zone === 'RAMP ZONE' ? 'active' : ''}">
        <div class="z-name">Ramp Zone</div>
        <div class="z-desc">${d.zones.ramp}</div>
      </div>
      <div class="zone-block zone-authorized ${d.zone === 'AUTHORIZED ZONE' ? 'active' : ''}">
        <div class="z-name">Authorized</div>
        <div class="z-desc">${d.zones.authorized}</div>
      </div>
    </div>`;

  h += section('Ramp QSS Key Split', 'ok',
    infoRows([
      ['Upper Threshold (K+R)', d.upper_threshold, ''],
      ['Information Rate (ρ)', d.info_rate, ''],
    ]) + zones + sharesTable(d.shares)
  );

  // Hash Verification
  const hasRejected = d.rejected && d.rejected.length > 0;
  const rejHtml = hasRejected
    ? `<div class="alert alert-warn"><span class="alert-icon">⚠</span><div>Rejected (tampered): <b>${d.rejected.join(', ')}</b></div></div>`
    : `<div class="alert alert-success"><span class="alert-icon">✅</span><div>All shares passed hash verification.</div></div>`;

  h += section('Hash Verification', hasRejected ? 'warn' : 'ok', rejHtml);

  // Tamper attack info
  if (d.attack && d.attack.attack === 'Share Tampering') {
    h += section('Attack Detected — Share Tampering', 'warn',
      tableFromObj(d.attack, ['Field', 'Value']) +
      `<div class="alert alert-danger" style="margin-top:8px;">
        <span class="alert-icon">🛑</span>
        <div><b>${d.attack.target} share was rejected.</b> Their key cannot be used for decryption.</div>
      </div>`
    );
  }

  // Insufficient shares attack info
  if (d.attack && d.attack.attack === 'Insufficient Shares') {
    h += section('Attack Detected — Insufficient Shares', 'warn',
      tableFromObj(d.attack, ['Field', 'Value'])
    );
  }

  // Reconstruction
  const reconOk = d.recon;
  h += section('Reconstruction', reconOk ? 'ok' : 'warn',
    infoRows([['Zone', d.zone, reconOk ? 'green' : 'red']])
  );

  // BUG FIX 2: Handle reconstruction blocked (insufficient shares)
  if (!reconOk) {
    h += `<div class="alert alert-warn">
      <span class="alert-icon">🔒</span>
      <div>
        <b>Reconstruction BLOCKED</b><br>
        ${d.stopped_at || 'Not enough valid shares to reconstruct the secret.'}
      </div>
    </div>`;
    setRunBadge('BLOCKED', 'yellow');
    document.getElementById('output').innerHTML = h;
    return;
  }

  // Member Keys
  // BUG FIX 1: Filter out rejected (tampered) members from the keys table
  const rejectedSet = new Set(d.rejected || []);
  const validKeys   = Object.fromEntries(
    Object.entries(d.member_keys).filter(([member]) => !rejectedSet.has(member))
  );

  h += section('Member Keys', 'ok',
    `<p style="font-size:12px;color:#64748b;margin-bottom:8px;">
      Each member receives one key. Minimum <b>${d.k}</b> keys required to decrypt.
      ${rejectedSet.size > 0 ? `<span style="color:#dc2626;"> Rejected members (${[...rejectedSet].join(', ')}) cannot decrypt.</span>` : ''}
    </p>` +
    memberKeysTable(validKeys)
  );

  // Decryption — only show valid (non-rejected) member key inputs
  h += section('Decryption', 'info', buildDecryptForm(d, validKeys));

  setRunBadge('SUCCESS', 'green');
  document.getElementById('output').innerHTML = h;
}

// ── DECRYPT ───────────────────────────────────────────
// BUG FIX 1: decryptMessage now works with validKeys only
function decryptMessage() {
  const keys = _last._validKeys;
  const k    = _last.k;
  let matched = [], wrong = [];

  for (const [member, correctKey] of Object.entries(keys)) {
    const inputId = 'key_' + member.replace(' ', '_');
    const box = document.getElementById(inputId);
    const typed = box ? box.value.trim().toUpperCase() : '';
    if (typed === '') continue;
    if (typed === correctKey) matched.push(member);
    else wrong.push(member);
  }

  let h = '';
  if (wrong.length > 0)
    h += `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>Wrong key for: <b>${wrong.join(', ')}</b></div></div>`;

  if (matched.length < k) {
    h += `<div class="alert alert-warn"><span class="alert-icon">🔒</span><div>Valid keys entered: <b>${matched.length}</b> — Need at least <b>${k}</b> to decrypt.</div></div>`;
    document.getElementById('decryptResult').innerHTML = h;
    return;
  }

  h += `<div class="alert alert-success"><span class="alert-icon">✅</span><div>Keys accepted from: <b>${matched.join(', ')}</b></div></div>`;
  h += infoRows([
    ['Original Message',  _last.original,  ''],
    ['Decrypted Message', _last.decrypted, 'green'],
    ['Match',             String(_last.match), _last.match ? 'green' : 'red'],
  ]);
  h += `<div class="alert alert-success" style="margin-top:10px;"><span class="alert-icon">🎉</span><div><b>Protocol Complete — Message Successfully Decrypted.</b></div></div>`;
  document.getElementById('decryptResult').innerHTML = h;
}

// ── RESET ─────────────────────────────────────────────
async function resetAll() {
  await post('/reset', {});
  _last = null;
  setRunBadge('', '');
  document.getElementById('output').innerHTML = `
    <div class="idle-msg">
      <div class="idle-icon">⬡</div>
      <p>Session cleared. Configure parameters and run the protocol.</p>
    </div>`;
}

// ── EVALUATE ──────────────────────────────────────────
// BUG FIX 3: Use id="evalBtn" instead of querySelector
async function evaluate() {
  const btn = document.getElementById('evalBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Running...';
  document.getElementById('evalOutput').innerHTML = `
    <div class="idle-msg" style="padding:30px;">
      <div class="spinner" style="width:28px;height:28px;border:3px solid #cbd5e1;border-top-color:#1e3a5f;"></div>
      <p style="margin-top:10px;">Running evaluation, please wait...</p>
    </div>`;

  try {
    const res = await get('/evaluation');
    btn.disabled = false;
    btn.innerHTML = '▶ Run Evaluation';
    if (res.status === 'error') {
      document.getElementById('evalOutput').innerHTML = `
        <div class="alert alert-danger">
          <span class="alert-icon">⚠</span>
          <div><b>Evaluation Error</b><br>${res.message}</div>
        </div>`;
      return;
    }
    showEvaluation(res.data);
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '▶ Run Evaluation';
    document.getElementById('evalOutput').innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">⚠</span>
        <div><b>Request failed.</b> Make sure the server is running.</div>
      </div>`;
  }
}

function showEvaluation(d) {
  let h = '';

  h += `<div class="section-title">AES-256-GCM Encryption Speed</div>`;
  h += `<div class="eval-grid">`;
  for (const row of d.encryption_speed) {
    h += `<div class="eval-card">
      <div class="e-label">${row.size_kb} KB</div>
      <div class="e-val">${row.time_ms}</div>
      <div class="e-sub">ms</div>
    </div>`;
  }
  h += `</div>`;

  h += `<div class="section-title" style="margin-top:24px;">Eavesdropping Detection Rate</div>`;
  h += simpleTable(['Members', 'Empirical', 'Theoretical'],
    d.detection_rates.map(r => [r.members, r.empirical, r.theoretical]));

  h += `<div class="section-title" style="margin-top:24px;">Noise Analysis</div>`;
  h += simpleTable(['Noise Level', 'False Positive', 'True Detection'],
    d.noise_analysis.map(r => [r.noise_level, r.false_positive, r.true_detection]));

  h += `<div class="section-title" style="margin-top:24px;">Standard QSS vs Ramp QSS</div>`;
  h += simpleTable(['Scheme', 'Poly Degree', 'Threshold', 'Info Rate', 'Recon Time (ms)'],
    d.qss_comparison.map(r => [r.scheme, r.polynomial_degree, r.threshold, r.info_rate, r.recon_time_ms]));

  document.getElementById('evalOutput').innerHTML = h;
}

// ── HTML Helpers ──────────────────────────────────────
function section(title, type, bodyHTML) {
  const badgeMap = { ok: ['badge-ok','OK'], fail: ['badge-fail','FAIL'], warn: ['badge-warn','WARN'], info: ['badge-info','INFO'] };
  const [cls, label] = badgeMap[type] || ['badge-info', 'INFO'];
  return `<div class="step-section">
    <div class="step-heading">
      ${title}
      <span class="step-badge ${cls}">${label}</span>
    </div>
    ${bodyHTML}
  </div>`;
}

function infoRows(pairs) {
  return pairs.map(([k, v, cls]) =>
    `<div class="info-row">
      <span class="info-key">${k}</span>
      <span class="info-val ${cls || ''}">${v}</span>
    </div>`
  ).join('');
}

function tableFromObj(obj, [col1, col2]) {
  let h = `<table class="simple-table"><thead><tr><th>${col1}</th><th>${col2}</th></tr></thead><tbody>`;
  for (const [k, v] of Object.entries(obj))
    h += `<tr><td>${k}</td><td>${v}</td></tr>`;
  return h + '</tbody></table>';
}

function simpleTable(headers, rows) {
  let h = `<table class="simple-table"><thead><tr>${headers.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
  for (const row of rows)
    h += `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`;
  return h + '</tbody></table>';
}

function sharesTable(shares) {
  return simpleTable(['Member', 'ID', 'Share Value', 'Hash'],
    shares.map(s => [s.member, s.id, s.value, s.hash]));
}

function memberKeysTable(keys) {
  return simpleTable(['Member', 'Key'],
    Object.entries(keys).map(([m, k]) => [m, `<b>${k}</b>`]));
}

function buildDecryptForm(d, validKeys) {
  // Store validKeys on _last so decryptMessage() can access them
  _last._validKeys = validKeys;

  let h = `<p style="font-size:12px;color:#64748b;margin-bottom:10px;">
    Enter at least <b>${d.k}</b> member keys below to decrypt the message.
  </p>`;
  h += `<div class="decrypt-inputs">`;
  for (const member of Object.keys(validKeys)) {
    const inputId = 'key_' + member.replace(' ', '_');
    h += `<div class="decrypt-row">
      <label>${member}:</label>
      <input type="text" id="${inputId}" placeholder="Paste key here" />
    </div>`;
  }
  h += `</div>`;
  h += `<button class="btn btn-success" style="margin-top:8px;" onclick="decryptMessage()">🔓 Decrypt Message</button>`;
  h += `<div id="decryptResult" style="margin-top:12px;"></div>`;
  return h;
}