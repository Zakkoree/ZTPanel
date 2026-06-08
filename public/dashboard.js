const params = new URLSearchParams(window.location.search);
const netId = params.get('net_id');
const token = params.get('token');
const server = params.get('server');
const clientToken = params.get('clientToken');

if (!token) window.location.href = '/index';
if (!netId) window.location.href = '/networks';

document.title = `${netId} - ZTPanel`;
document.getElementById('network-subtitle').innerHTML = netId;
const errorMsg = document.getElementById('error-message');
const authContainer = document.getElementById('authorized-members');
const pendingContainer = document.getElementById('pending-members');
const pendingSection = document.getElementById('pending-section');
const switchNetworkBtn = document.getElementById('switch-network-btn');
const CACHE_KEY = `ztCache_${netId}`;
const NET_CACHE = `ztNet_${netId}`;

let isFirstRender = true;

let currentFilter = 'all';
let allMembers = [];
let allNetworkRoutes;
let isPrivateNetwork = true;

/* ===== 自动年份 ===== */
(function () {
    const el = document.getElementById('footer-license');
    if (el) {
        const year = new Date().getFullYear();
        el.textContent = `MIT License © ${year}`;
    }
})();

switchNetworkBtn.onclick = () => {
    window.location.href = `networks?token=${encodeURIComponent(token)}${clientToken? '&clientToken='+clientToken:''}${server? '&server='+server:''}`
};

function closeAllMemberMenus() {
    document.querySelectorAll('.member-menu.open').forEach(m => m.classList.remove('open'));
}

function toggleMemberMenu(e, nodeId) {
    e.stopPropagation();
    const menu = document.querySelector(`.member-menu[data-menu-for="${nodeId}"]`);
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    closeAllMemberMenus();
    if (!isOpen) menu.classList.add('open');
}

document.addEventListener('click', () => closeAllMemberMenus());

document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeAllMemberMenus();
});

window.toggleMemberMenu = toggleMemberMenu;
window.closeAllMemberMenus = closeAllMemberMenus;


function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTime() {
    const now = new Date();
    document.getElementById('refresh-time').textContent = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function copyKanbanLink() {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
        showToast('✅ 已复制');
        if (!localStorage.getItem('notice_shown')) {
            setTimeout(() => alert('⚠️ 安全提示：链接包含访问令牌，请勿公开分享！'), 500);
            localStorage.setItem('notice_shown', '1');
        }
    }).catch(() => showToast('❌ 复制失败'));
}

function isOnline(m) {
    const t = m.lastOnline || m.lastSeen || 0;
    return t && (Date.now() - t) < 120000;
}

function filterMembers(section, filter, btn) {
    document.querySelectorAll(`.filter-btn[data-section="${section}"]`).forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    currentFilter = filter;
    // 存储当前筛选
    localStorage.setItem(`ztFilter_${netId}`, filter);
    applyFilter();
}

function applyFilter() {
    const cards = document.querySelectorAll('.member-card[data-section="authorized"]');
    cards.forEach(card => {
        const isOnlineCard = card.dataset.online === 'yes';

        if (currentFilter === 'all') {
            card.classList.remove('hidden');
        } else if (currentFilter === 'online') {
            card.classList.toggle('hidden', !isOnlineCard);
        } else if (currentFilter === 'offline') {
            card.classList.toggle('hidden', isOnlineCard);
        }
    });
}

function renderMember(m, auth) {
    const online = isOnline(m);
    const ip = m.config?.ipAssignments?.[0] || '';
    const lastSeen = m.lastOnline || m.lastSeen || 0;
    const desc = m.description || '';

    let actionMenu = `
          <button class="menu-item" onclick="event.stopPropagation(); ${auth ? "unauthorize" : "authorize"}('${m.nodeId}'); closeAllMemberMenus();">
            ${auth ? '🔒 取消授权' : '✅ 授权加入'}
          </button>
          <div class="menu-sep"></div>
        `;
    // if (isPrivateNetwork) {
    //
    //     actionMenu = `
    //   <button class="menu-item" onclick="event.stopPropagation(); ${auth ? "unauthorize" : "authorize"}('${m.nodeId}'); closeAllMemberMenus();">
    //     ${auth ? '🔒 取消授权' : '✅ 授权加入'}
    //   </button>
    //   <div class="menu-sep"></div>
    // `;
    // }
    let networkRoutesSpan = '';
    // 🖧
    if(Array.isArray(allNetworkRoutes) && allNetworkRoutes.length){
        allNetworkRoutes.some( route =>{if(route.via === ip) {networkRoutesSpan = `<span class="status-route ${online ? 'blue' : ''}" title="${route.target || route.destination || ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.8rem" height="1.5rem" viewBox="0 0 200 150">
              <g transform="translate(0,0)">
            <rect x="30" y="80" width="140" height="40" rx="8" ry="8"  fill="none" stroke-width="10"/>
            <line x1="50" y1="80" x2="50" y2="40"  stroke-width="10"/>
            <line x1="150" y1="80" x2="150" y2="40"  stroke-width="10"/>
            <circle cx="60" cy="100" r="3"/>
            <circle cx="75" cy="100" r="3"/>
            <circle cx="90" cy="100" r="3"/>
            <circle cx="105" cy="100" r="3"/>
            <circle cx="120" cy="100" r="3"/>
            </g>
            </svg>
            </span>`; return true}
            return false
        })
    }

    let jsonText = JSON.stringify(m, null, 2);

    return `
        <div class="member-card ${isFirstRender ? 'animate-in' : ''}" data-section="authorized" data-online="${online ? 'yes' : 'no'}">

          <div class="member-head">
            <div class="member-name">
              <span class="name-text" title="${m.name || '未命名'}">${m.name || '未命名'}</span>
            </div>
            ${networkRoutesSpan}
            <span class="status-text ${online ? 'blue' : ''}">
                <span class="status-badge ${online ? 'online' : 'offline'}"></span>
                ${online ? '在线' : '离线'}
            </span>
            <div class="member-menu" data-menu-for="${m.nodeId}">

              <button class="menu-trigger" onclick="toggleMemberMenu(event, '${m.nodeId}')" title="操作">⋯</button>
              <div class="menu-panel">
                <button class="menu-item" onclick="event.stopPropagation(); openPreModal('${m.nodeId}'); closeAllMemberMenus();">
                  🔍 查看数据
                </button>
                 <div class="menu-sep"></div>
                <button class="menu-item" onclick="event.stopPropagation();
                document.getElementById('edit-panel-nodeId').innerHTML = '${m.nodeId}';
                document.getElementById('edit-nodeId').value = '${m.nodeId}';
                document.getElementById('edit-name').value = '${m.name ? m.name : ''}';
                document.getElementById('edit-desc').value = \`${m.description ? m.description : ''}\`;
                document.getElementById('edit-ip').value = '${m.config?.ipAssignments?.[0] ? m.config?.ipAssignments?.[0] : ''}';
                document.getElementById('edit-panel-mask').style.display = 'flex';
                closeAllMemberMenus();">
                  📝 编辑信息
                </button>
                <div class="menu-sep"></div>
                ${actionMenu}
                <button class="menu-item danger" onclick="event.stopPropagation(); removeMember('${m.nodeId}'); closeAllMemberMenus();">
                  🗑️ 移除成员
                </button>
              </div>
            </div>

          </div>

          <div class="member-info-item">
            <span class="info-label">📍 标识</span>
            <span class="info-value">${m.nodeId}</span>
          </div>

          <div class="member-info-item">
            <span class="info-label">📝 备注</span>
            <span class="info-value ellipsis" title="${desc}">${desc}</span>
          </div>

          <div class="member-info-item">
            <span class="info-label">🏠 内网</span>
            <span class="info-value" title="${ip}">${ip}</span>
          </div>

          <div class="member-info-item">
            <span class="info-label">🌐 公网</span>
            <span class="info-value ellipsis" title="${m.physicalAddress || ''}">${m.physicalAddress || ''}</span>
          </div>

          <div class="member-info-item">
            <span class="info-label">🏷️ 版本</span>
            <span class="info-value">${(m.clientVersion && m.clientVersion !== '-1.-1.-1') ? m.clientVersion : ''}</span>
          </div>
          ${lastSeen ? `
          <div class="member-info-item">
            <span class="info-label">🕒 活动</span>
            <span class="info-value">${new Date(lastSeen).toLocaleString('zh-CN')}</span>
          </div>
          ` : ''}

        </div>
      `;
}

function renderPendingList(members) {
    if (!members.length) {
        return `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--primary); opacity: 0.6;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div class="empty-text">当前没有待处理的授权请求</div>
          </div>
        `;
    }

    return `
        <div class="pending-table">
          <div class="pending-table-header">
            <span>名称</span>
            <span>标识</span>
            <span>备注</span>
            <span>内网</span>
            <span>公网</span>
            <span>版本</span>
            <span style="text-align:right;">操作</span>
          </div>

          ${members.map(m => `
            <div class="pending-table-row">
              <div class="pending-table-cell primary" data-label="名称">
                <span class="name-text" title="${m.name || '未命名'}">${m.name || '未命名'}</span>
              </div>

              <div class="pending-table-cell" data-label="标识" title="${m.nodeId}">
                ${m.nodeId}
              </div>

              <div class="pending-table-cell" data-label="备注" title="${m.description || ''}">
                ${m.description || ''}
              </div>

              <div class="pending-table-cell" data-label="内网" title="${m.config?.ipAssignments?.[0] || ''}">
                ${m.config?.ipAssignments?.[0] || ''}
              </div>

              <div class="pending-table-cell" data-label="公网" title="${m.physicalAddress || ''}">
                ${m.physicalAddress || ''}
              </div>

              <div class="pending-table-cell" data-label="版本">
                ${(m.clientVersion && m.clientVersion !== '-1.-1.-1') ? m.clientVersion : ''}
              </div>

              <div class="pending-table-actions" data-label="操作">
                <button class="btn-action btn-success" onclick="authorize('${m.nodeId}')">授权</button>
                <button class="btn-action btn-danger" onclick="removeMember('${m.nodeId}')">移除</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
}

function getCached() {
    try {
        const c = localStorage.getItem(CACHE_KEY);
        if (c) {
            const p = JSON.parse(c);
            if (Date.now() - p.t < CACHE_TIME) return p.d;
        }
    } catch (e) {
    }
    return null;
}

async function fetchNet() {
    // const c = localStorage.getItem(NET_CACHE);
    // if (c) {
    //     try {
    //         updateNetInfo(JSON.parse(c));
    //         return;
    //     } catch (e) {
    //     }
    // }

    const path = `/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId)}`;
    try {
        const r = await fetch(path);
        if (!r.ok) return;
        const d = await r.json();
        localStorage.setItem(NET_CACHE, JSON.stringify(d));
        updateNetInfo(d);
    } catch (e) {
    }
}

function updateNetInfo(d) {
    if (d?.config) {
        const c = d.config;
        isPrivateNetwork = c.private !== false;
        const networkOverviewContainer = document.getElementById('overview-title');
        allNetworkRoutes = c.routes;
        let ips = '-';
        if (Array.isArray(c.ipAssignmentPools) && c.ipAssignmentPools.length) {
            ips = c.ipAssignmentPools.map(p => `${p.ipRangeStart || p.start} → ${p.ipRangeEnd || p.end}`).join(', ');
        }
        networkOverviewContainer.innerHTML = `
          <span>${c.name || '未命名网络'}</span>
          <span class="net-tag tag-${isPrivateNetwork ? 'blue' : 'orange'}" >${isPrivateNetwork ? '私有' : '公共'}</span>
          ${d.description ? `<span class="net-tag tag-gray" title="${d.description}">${d.description}</span>` : ''}
        `;


        document.getElementById('network-routes').innerHTML = Array.isArray(c.routes) && c.routes.length
            ? c.routes.map(route => {
                const target = route.target || route.destination || '';
                // const via = (route.via ? ('via → ' + route.via) : '(LAN) ' + ips);
                const via = (route.via ? ('via → ' + route.via) : 'lan');

                return `
              <div class="route-item-inline">
                <span class="route-target">${target}</span>
                <span class="route-via">${via}</span>
              </div>
              `;
            }).join('')
            : '';
    }
}

function renderData(d) {
    if (!Array.isArray(d)) return;
    allMembers = d;

    const auth = d.filter(m => m.config.authorized);
    const pend = d.filter(m => !m.config.authorized);
    const on = auth.filter(isOnline).length;
    const off = auth.length - on;

    document.getElementById('total-members').textContent = d.length;
    document.getElementById('online-members').textContent = on;
    document.getElementById('offline-members').textContent = off;
    document.getElementById('pending-members-count').textContent = pend.length;
    document.getElementById('authorized-count').textContent = auth.length ? ` (${auth.length})` : '(0)';
    document.getElementById('pending-count').textContent = pend.length ? ` (${pend.length})` : '(0)';

    authContainer.innerHTML = auth.length
        ? auth.map(m => renderMember(m, true)).join('')
        : `<div class="empty-state">
            <!-- 使用 SVG 图标，比 Emoji 更清晰专业 -->
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); opacity: 0.6;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <div class="empty-text">当前网络中没有成员设备</div>
          </div>`;

    // if (isPrivateNetwork) {
    //     pendingSection.style.display = 'block';
    //     pendingContainer.innerHTML = renderPendingList(pend);
    // } else {
    //     pendingSection.style.display = 'none';
    // }
    pendingSection.style.display = 'block';
    pendingContainer.innerHTML = renderPendingList(pend);

    // 获取上次选择的筛选项
    const saved = localStorage.getItem(`ztFilter_${netId}`);
    currentFilter = saved || 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
    applyFilter();

    errorMsg.style.display = 'none';
    updateTime();

    if (isFirstRender) {
        setTimeout(() => {
            isFirstRender = false;
        }, 400);
    }
}

async function fetchData() {
    // const c = getCached();
    // if (c) renderData(c);

    const p = `/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId + '/member')}`;
    try {
        const r = await fetch(p);
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`无效访问令牌`);
            } else {
                throw new Error(`API Error: ${r.statusText}`);
            }
        }

        const d = await r.json();
        localStorage.setItem(CACHE_KEY, JSON.stringify({t: Date.now(), d}));
        renderData(d);
    } catch (e) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = `⚠️ 加载失败: ${e.message}`;
    }
}

fetchNet();
fetchData();
updateTime();
setInterval(fetchData, 60000);


document.getElementById('refresh-button').addEventListener('click', () => {
    const btn = document.getElementById('refresh-button');
    btn.disabled = true;
    btn.textContent = '⏳ 刷新数据';

    localStorage.removeItem(CACHE_KEY);
    fetchData().finally(() => {
        btn.disabled = false;
        btn.textContent = '🔄 刷新数据';
    });

    showToast('🔄 刷新中...');
});


async function authorize(id) {
    try {
        const r = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId + '/member/' + id)}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({config: {authorized: true}})
        });
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`无效访问令牌`);
            } else {
                throw new Error(`授权失败: ${r.statusText}`);
            }
        }
        showToast('✅ 已授权');
        localStorage.removeItem(CACHE_KEY);
        fetchData();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

async function unauthorize(id) {
    if (!confirm('确定取消授权？')) return;
    try {
        const r = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId + '/member/' + id)}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({config: {authorized: false}})
        });
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`无效访问令牌`);
            } else {
                throw new Error(`取消失败: ${r.statusText}`);
            }
        }
        showToast('✅ 已取消');
        localStorage.removeItem(CACHE_KEY);
        fetchData();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

async function removeMember(id) {
    if (!confirm('确定移除此成员？')) return;
    try {
        const r = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId + '/member/' + id)}`, {
            method: 'DELETE'
        });
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`移除失败: 无效访问令牌`);
            } else {
                throw new Error(`移除失败: ${r.statusText}`);
            }
        }
        showToast('✅ 已移除');
        localStorage.removeItem(CACHE_KEY);
        fetchData();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

// 关闭弹窗
function closeEditPanel() {
    document.getElementById('edit-panel-mask').style.display = 'none';
}

// ESC/点击遮罩关闭
document.getElementById('edit-panel-mask').addEventListener('mousedown', function (e) {
    if (e.target === this) closeEditPanel();
});
document.getElementById('edit-cancel').onclick = closeEditPanel;
document.addEventListener('keydown', function (e) {
    if (document.getElementById('edit-panel-mask').style.display !== 'none' && e.key === 'Escape') closeEditPanel();
});

const editName = document.getElementById('edit-name');
const editIp = document.getElementById('edit-ip');

editIp.addEventListener('input', (e) => {
    let value = e.target.value;
    // 1. 去除所有空格
    value = value.replace(/\s/g, '');
    // 2. 只保留数字和点
    value = value.replace(/[^\d.]/g, '');
    // 3. 防止连续输入点
    value = value.replace(/\.{2,}/g, '.');
    // 4. 防止以点开头
    if (value.startsWith('.')) {
        value = value.substring(1);
    }
    // 5. 限制段数和长度
    let parts = value.split('.');
    if (parts.length > 4) {
        parts = parts.slice(0, 4);
    }
    // 每段最多3位，且数值不超过255
    parts = parts.map(part => {
        let num = part.slice(0, 3); // 最多3位
        if (num) {
            let n = parseInt(num, 10);
            if (n > 255) n = 255; // 超过255强制为255
            return String(n);
        }
        return '';
    });
    value = parts.join('.');
    // 更新输入框的值
    e.target.value = value;
});


// 表单保存事件
document.getElementById('edit-form').onsubmit = async function (e) {
    e.preventDefault();
    const nodeId = document.getElementById('edit-nodeId').value;
    const name = editName.value.trim();
    const desc = document.getElementById('edit-desc').value.trim();
    const ip = editIp.value.trim();
    const ips = ip ? [ip] : [];

    const saveBtn = document.getElementById('edit-save');
    const cancelBtn = document.getElementById('edit-cancel');
    if (!nodeId) return;

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    const oldText = saveBtn.textContent;
    saveBtn.innerHTML = '<span class="spinner" style="margin-right:8px;"></span>保存中...';

    try {
        const res = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId + '/member/' + nodeId)}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name,
                description: desc,
                config: {
                    ipAssignments: ips
                }
            })
        });

        if (res.ok) {
            showToast('✅ 信息已更新');
            closeEditPanel();
            localStorage.removeItem(CACHE_KEY);
            fetchData();
        } else {
            if (res.status === 401) {
                showToast('❌ 更新失败: 无效访问令牌');
            } else {
                showToast('❌ 更新失败: ' + res.statusText);
            }
        }
    } catch (err) {
        showToast('❌ 更新失败: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        saveBtn.textContent = oldText;
    }
}

function openPreModal(content) {
    const mask = document.getElementById('pre-modal-mask');
    const titleEl = document.getElementById('pre-modal-title');
    const pre = document.getElementById('pre-modal-content');
    titleEl.textContent = content;
    allMembers.some(e=>{
        if(e.nodeId === content)
            pre.textContent = JSON.stringify(e, null, 2);
    })
    mask.style.display = 'flex';

    // ESC 关闭
    document.addEventListener('keydown', escCloseHandler);
}

function closePreModal() {
    const mask = document.getElementById('pre-modal-mask');
    mask.style.display = 'none';

    document.removeEventListener('keydown', escCloseHandler);
}

function escCloseHandler(e) {
    if (e.key === 'Escape') closePreModal();
}

function copyPreContent() {
    const text = document.getElementById('pre-modal-content').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast?.('已复制到剪贴板');
    });
}

/* 点击遮罩关闭（点弹窗本身不会关） */
document.getElementById('pre-modal-mask').addEventListener('click', e => {
    if (e.target.id === 'pre-modal-mask') closePreModal();
});

window.authorize = authorize;
window.unauthorize = unauthorize;
window.removeMember = removeMember;
window.copyKanbanLink = copyKanbanLink;
window.filterMembers = filterMembers;