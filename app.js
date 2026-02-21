// ============================================
//   MARKETMIND — App Logic
// ============================================

const API_BASE ='https://marketmind-backend-uump.onrender.com';

// ===== NAVIGATION =====
function navigateTo(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.section === sectionId) link.classList.add('active');
  });

  // Auto-load dashboard stats when navigating to it
  if (sectionId === 'dashboard') loadDashboard();
}

// Handle nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

// Handle logo click
document.querySelector('.nav-brand').addEventListener('click', () => navigateTo('home'));


// ===== LOADING =====
function showLoading(text = 'Generating with Gemini AI...') {
  document.getElementById('loaderText').textContent = text;
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}


// ===== TOAST =====
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}


// ===== API CALL =====
async function callAPI(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${response.status}`);
  }

  return response.json();
}


// ===== FORMAT MARKDOWN-ISH TEXT =====
function formatContent(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-3);padding:2px 6px;border-radius:4px;font-size:13px">$1</code>');
}


// ===== RENDER RESULT =====
function renderResult(panelId, title, tag, content, extra = '') {
  const panel = document.getElementById(panelId);
  panel.innerHTML = `
    <div class="result-content">
      <div class="result-header">
        <span class="result-title">${title}</span>
        <span class="result-tag">${tag}</span>
      </div>
      <div class="result-body">${formatContent(content)}</div>
      ${extra}
      <div class="result-actions">
        <button class="btn btn-ghost btn-sm" onclick="copyResult('${panelId}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="btn btn-ghost btn-sm" onclick="downloadResult('${panelId}', '${title}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
      </div>
    </div>
  `;
}


function copyResult(panelId) {
  const body = document.querySelector(`#${panelId} .result-body`);
  if (body) {
    navigator.clipboard.writeText(body.innerText);
    showToast('Copied to clipboard!');
  }
}

function downloadResult(panelId, title) {
  const body = document.querySelector(`#${panelId} .result-body`);
  if (body) {
    const blob = new Blob([body.innerText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    showToast('Downloaded!');
  }
}


// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await fetch(`${API_BASE}/api/dashboard/stats`).then(r => r.json());
    const keyMap = {
      total_campaigns: 'total_campaigns',
      active_leads: 'active_leads',
      pitches_generated: 'pitches_generated',
      avg_lead_score: 'avg_lead_score',
      conversion_rate: 'conversion_rate',
      revenue_pipeline: 'revenue_pipeline',
      top_performing_channel: 'top_performing_channel',
      monthly_growth: 'monthly_growth'
    };

    document.querySelectorAll('.stat-card').forEach(card => {
      const key = card.dataset.key;
      const val = data[key];
      const el = card.querySelector('.sc-value');
      if (el && val !== undefined) {
        animateValue(el, val);
      }
    });

    showToast('Dashboard refreshed!');
  } catch (e) {
    showToast('Could not connect to API. Make sure the backend is running.', 'error');
    // Show placeholder values
    document.querySelectorAll('.stat-card .sc-value').forEach(el => {
      el.textContent = el.textContent === '—' ? 'N/A' : el.textContent;
    });
  }
}

function animateValue(el, val) {
  const isNum = typeof val === 'number';
  if (isNum) {
    let start = 0;
    const end = val;
    const duration = 800;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = Math.floor(progress * end);
      el.textContent = val % 1 !== 0 ? (progress * end).toFixed(1) : current;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = val % 1 !== 0 ? val.toFixed(1) : val;
    };
    requestAnimationFrame(step);
  } else {
    el.textContent = val;
  }
}


// ===== CAMPAIGN GENERATOR =====
async function generateCampaign(e) {
  e.preventDefault();
  const channels = [...document.querySelectorAll('#campaignForm input[type="checkbox"]:checked')].map(c => c.value);

  if (channels.length === 0) {
    showToast('Please select at least one channel', 'error');
    return;
  }

  const btn = document.getElementById('campaignBtn');
  btn.disabled = true;
  showLoading('Crafting your campaign with Gemini AI...');

  try {
    const data = await callAPI('/api/campaign/generate', {
      product_name: document.getElementById('c_product').value,
      target_audience: document.getElementById('c_audience').value,
      campaign_goal: document.getElementById('c_goal').value,
      tone: document.getElementById('c_tone').value,
      channels
    });

    renderResult(
      'campaignResult',
      `${data.product} Campaign`,
      data.goal,
      data.campaign
    );
    showToast('Campaign generated successfully!');
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('campaignResult').innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <p>${err.message}</p>
      </div>`;
  } finally {
    btn.disabled = false;
    hideLoading();
  }
}


// ===== SALES PITCH GENERATOR =====
async function generatePitch(e) {
  e.preventDefault();
  const btn = document.getElementById('pitchBtn');
  btn.disabled = true;
  showLoading('Crafting your personalized pitch...');

  try {
    const data = await callAPI('/api/pitch/generate', {
      product_name: document.getElementById('p_product').value,
      prospect_name: document.getElementById('p_prospect').value,
      prospect_industry: document.getElementById('p_industry').value,
      pain_points: document.getElementById('p_pain').value,
      budget_range: document.getElementById('p_budget').value || null,
      pitch_style: document.getElementById('p_style').value
    });

    renderResult(
      'pitchResult',
      `Pitch: ${data.prospect}`,
      data.pitch_style || 'AI Generated',
      data.pitch
    );
    showToast('Sales pitch ready!');
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('pitchResult').innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <p>${err.message}</p>
      </div>`;
  } finally {
    btn.disabled = false;
    hideLoading();
  }
}


// ===== LEAD ANALYZER =====
async function analyzeLead(e) {
  e.preventDefault();
  const btn = document.getElementById('leadBtn');
  btn.disabled = true;
  showLoading('Analyzing lead intelligence...');

  try {
    const data = await callAPI('/api/leads/analyze', {
      company_name: document.getElementById('l_company').value,
      industry: document.getElementById('l_industry').value,
      company_size: document.getElementById('l_size').value,
      recent_activity: document.getElementById('l_activity').value || null,
      website: document.getElementById('l_website').value || null
    });

    renderResult(
      'leadResult',
      `Lead Report: ${data.company}`,
      data.industry,
      data.analysis
    );
    showToast('Lead analysis complete!');
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('leadResult').innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <p>${err.message}</p>
      </div>`;
  } finally {
    btn.disabled = false;
    hideLoading();
  }
}


// ===== PREDICTIVE ANALYTICS =====
async function predictAnalytics(e) {
  e.preventDefault();
  const btn = document.getElementById('analyticsBtn');
  btn.disabled = true;
  showLoading('Running predictive analysis...');

  try {
    const data = await callAPI('/api/analytics/predict', {
      campaign_type: document.getElementById('a_type').value,
      industry: document.getElementById('a_industry').value,
      target_audience: document.getElementById('a_audience').value,
      budget: document.getElementById('a_budget').value || null
    });

    // Build chart HTML
    const chartHTML = buildChartHTML(data.chart_data);

    renderResult(
      'analyticsResult',
      `Forecast: ${data.campaign_type}`,
      data.industry,
      data.analysis,
      chartHTML
    );
    showToast('Forecast generated!');
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('analyticsResult').innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <p>${err.message}</p>
      </div>`;
  } finally {
    btn.disabled = false;
    hideLoading();
  }
}


function buildChartHTML(chartData) {
  if (!chartData) return '';

  const maxLeads = Math.max(...chartData.monthly_leads.map(d => d.leads));

  const bars = chartData.monthly_leads.map(item => {
    const heightLeads = Math.round((item.leads / maxLeads) * 120);
    const heightConv = Math.round((item.conversions / maxLeads) * 120);
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="display:flex;gap:3px;align-items:flex-end;height:130px">
          <div style="width:22px;height:${heightLeads}px;background:var(--accent);border-radius:4px 4px 0 0;opacity:0.85"></div>
          <div style="width:22px;height:${heightConv}px;background:#4ade80;border-radius:4px 4px 0 0;opacity:0.75"></div>
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${item.month}</span>
        <span style="font-size:10px;color:var(--text-dim)">${item.leads} / ${item.conversions}</span>
      </div>`;
  }).join('');

  const segments = chartData.channel_distribution.map((ch, i) => {
    const colors = ['#f5a623', '#4ade80', '#63b3ed', '#a78bfa'];
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0"></div>
        <span style="font-size:13px;flex:1;color:var(--text-muted)">${ch.channel}</span>
        <span style="font-size:13px;font-weight:600;color:var(--text)">${ch.percentage}%</span>
        <div style="width:80px;height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${ch.percentage}%;background:${colors[i]};border-radius:3px"></div>
        </div>
      </div>`;
  }).join('');

  return `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)">
      <p style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:16px">📊 Projected Performance</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:12px">Lead & Conversion Forecast</p>
          <div style="display:flex;gap:6px;align-items:flex-end">${bars}</div>
          <div style="display:flex;gap:14px;margin-top:10px">
            <span style="font-size:11px;display:flex;align-items:center;gap:4px;color:var(--text-muted)"><span style="width:8px;height:8px;background:var(--accent);border-radius:2px;display:inline-block"></span>Leads</span>
            <span style="font-size:11px;display:flex;align-items:center;gap:4px;color:var(--text-muted)"><span style="width:8px;height:8px;background:#4ade80;border-radius:2px;display:inline-block"></span>Conversions</span>
          </div>
        </div>
        <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:12px">Budget Allocation</p>
          ${segments}
        </div>
      </div>
    </div>`;
}


// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  // Make hero active by default
  document.getElementById('home').classList.add('active');
  document.querySelector('[data-section="home"]').classList.add('active');
});
