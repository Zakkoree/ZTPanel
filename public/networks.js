// 获取 URL 中的 token 参数（如果有）
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const server = params.get('server');
const clientToken = params.get('clientToken');
const networkGrid = document.getElementById('networkGrid');
const networkUnknown = document.getElementById('networkUnknown');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');

let isFirstRender = true;
let allNetworks = [];
let clientNetworks = [];
let clientNetworksFilter = new Set();
let client = false;

/* ===== 自动年份 ===== */
(function () {
    const el = document.getElementById('footer-license');
    if (el) {
        const year = new Date().getFullYear();
        el.textContent = `MIT License © ${year}`;
    }
})();

function closeAllMemberMenus() {
    document.querySelectorAll('.member-menu.open').forEach(m => m.classList.remove('open'));
}

function toggleMemberMenu(e, id) {
    e.stopPropagation();
    const menu = document.querySelector(`.member-menu[data-menu-for="${id}"]`);
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
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2300);
}

function updateTime() {
    const now = new Date();
    const el = document.getElementById('refresh-time');
    if (el) {
        el.textContent = now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    }
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

document.getElementById('refresh-button').addEventListener('click', () => {
    const btn = document.getElementById('refresh-button');
    btn.disabled = true;
    btn.textContent = '⏳ 刷新中...';
    showToast('🔄 刷新中...');
    init().finally(() => {
        btn.disabled = false;
        btn.textContent = '🔄 刷新数据';
    });
});

// 初始化
async function init() {
    if (!token) {
        window.location.href = '/index';
        return;
    }
    updateTime();
    try {
        const response = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network')}`);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error(`无效访问令牌`);
            } else {
                throw new Error(`API Error: ${response.statusText}`);
            }
        }


        const data = await response.json();

        if (clientToken) {
            const clientResponse = await fetch(`/api?token=${encodeURIComponent(clientToken)}&path=${encodeURIComponent('/network')}&server=${encodeURIComponent(server || 'localhost:9993')}`);
            if (!clientResponse.ok) {
                if (clientResponse.status === 401) {
                    showToast('❌ 客户端: 无效访问令牌');
                } else {
                    showToast('❌ 客户端连接失败: ' + clientResponse.statusText);
                }
            } else {
                client = true;
                clientNetworks = await clientResponse.json();
            }
        }

        allNetworks = data;
        renderNetworks(data, clientNetworks);
    } catch (err) {
        showError('连接失败', `${err.message}`);
    } finally {
        loadingState.style.display = 'none';
    }
}

// 渲染网络列表
function renderNetworks(networks, clientNetworks) {
    networkGrid.innerHTML = '';
    if (!networks.length) {
        networkGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">✨</div><div class="empty-text">云端没有找到网络</div></div>`;
    }

    networks.forEach(net => {
        const config = net.config || {};
        const card = document.createElement('div');
        card.className = 'network-card';
        // 跳转逻辑
        card.onclick = () => {
            window.location.href = `dashboard?token=${encodeURIComponent(token)}&net_id=${encodeURIComponent(net.id)}${clientToken ? '&clientToken=' + clientToken : ''}${server ? '&server=' + server : ''}`;
        };
        const description = net.description || '';
        const isPrivate = config.private === false ? '公开' : '私有';
        const statusClass = config.private === false ? 'public' : '';
        const memberCount = net.totalMemberCount || 0;
        const authorizedMemberCount = net.authorizedMemberCount || 0;
        const onlineMemberCount = net.onlineMemberCount || 0;
        let clientNetHtml = '';
        let clientMenuHtml = '';
        if (client) {//warning danger
            clientNetworks.some(e => {
                if (e.id === net.id) {//ACCESS_DENIED OK  REQUESTING_CONFIGURATION
                    let ff = 'danger';
                    let text = e.status;
                    if (e.status === 'OK') {
                        ff = 'success';
                        text = '连接正常';
                    } else if (e.status === 'ACCESS_DENIED') {
                        ff = 'warning';
                        text = '待授权';
                    }
                    clientNetHtml = `<span class="client-net ${ff}" title="${text}">
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 10.5C9.5 6 14.5 6 19.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M7.5 13.5C10.5 11 13.5 11 16.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="17" r="1.5" fill="currentColor" />
</svg>
</span>`;
                    clientNetworksFilter.add(e.id);
                    return true;
                }
                return false;
            })
            clientMenuHtml = `<div class="menu-sep"></div>
                <button class="menu-item ${clientNetHtml ? 'danger' : ''}" onclick="event.stopPropagation(); joinOrLeaveNet('${net.id}', ${(!clientNetHtml)}); closeAllMemberMenus();">
                  ${clientNetHtml ? '🚪 离开网络' : '🔗️ 加入网络'}
                </button>`;
        }

        card.innerHTML = `
              <div class="card-header ${isFirstRender ? 'animate-in' : ''}">
                <div class="network-name" title="${config.name || '未命名'}">${config.name || '未命名'}</div>
                ${clientNetHtml}
                <span class="status-badge ${statusClass}">${isPrivate}</span>
                <div class="member-menu" data-menu-for="${net.id}">
                  <button class="menu-trigger" onclick="toggleMemberMenu(event, '${net.id}')" title="操作">⋯</button>
                  <div class="menu-panel">
                    <button class="menu-item" onclick="event.stopPropagation();
                      document.getElementById('edit-panel-nodeId').innerHTML = '${net.id}';
                    document.getElementById('edit-nodeId').value = '${net.id}';
                    document.getElementById('edit-name').value = '${config.name || ''}';
                    document.getElementById('edit-desc').value = \`${net.description || ''}\`;
                    document.getElementById('edit-panel-mask').style.display = 'flex';

                      closeAllMemberMenus();">
                      📝 编辑信息
                    </button>
                    ${clientMenuHtml}
                    <div class="menu-sep"></div>
                    <button class="menu-item danger" onclick="event.stopPropagation(); removeMember('${net.id}'); closeAllMemberMenus();">
                      🗑️ 移除网络
                    </button>
                  </div>
                </div>
              </div>
              <div class="meta-row">
                <div class="network-id">${net.id}</div>
              <div class="network-description" title="${description}">${description}</div>
              </div>

              <div class="stats-row">
                <div class="stat-item">
                  <span class="stat-value">${memberCount}</span>
                  <span class="stat-label">设备总数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value secondary">${authorizedMemberCount}</span>
                  <span class="stat-label">当前授权</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value success">${onlineMemberCount}</span>
                  <span class="stat-label">当前在线</span>
                </div>
              </div>
            `;


        networkGrid.appendChild(card);
        if (isFirstRender) {
            setTimeout(() => {
                isFirstRender = false;
            }, 400); // 等动画结束
        }
    });

    let pendingSection = document.getElementById('pending-section');
    pendingSection.style.display = 'none';
    networkUnknown.innerHTML = '';
    clientNetworks.forEach(net => {
        if (clientNetworksFilter.has(net.id)) return;
        pendingSection.style.display = 'block';
        const card = document.createElement('div');
        card.className = 'network-card';
        // 跳转逻辑
        // card.onclick = () => {
        //     // var asda = `IP: ${net.assignedAddresses?.[0] || ''}
        //     // `;
        //     alert()
        //     window.location.href = `dashboard?token=${encodeURIComponent(token)}&net_id=${encodeURIComponent(net.id)}&clientNet=true`;
        // };
        const isPrivate = net.type === "PRIVATE" ? '私有' : '公开';
        const statusClass = net.private === "PRIVATE" ? 'public' : '';
        let ff = 'danger';
        let text = net.status;
        if (net.status === 'OK') {
            ff = 'success';
            text = '连接正常';
        } else if (net.status === 'ACCESS_DENIED') {
            ff = 'warning';
            text = '待授权';
        }

        card.innerHTML = `
              <div class="card-header ${isFirstRender ? 'animate-in' : ''}">
                <div class="network-name" title="${net.name || '未命名'}">${net.name || '未命名'}</div>
                <span class="client-net ${ff}" title="${text}"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 10.5C9.5 6 14.5 6 19.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M7.5 13.5C10.5 11 13.5 11 16.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="17" r="1.5" fill="currentColor" />
</svg></span>
                <span class="status-badge ${statusClass}">${isPrivate}</span>
                <div class="member-menu" data-menu-for="${net.id + 1}">
                  <button class="menu-trigger" onclick="toggleMemberMenu(event, '${net.id + 1}')" title="操作">⋯</button>
                  <div class="menu-panel">
                    <button class="menu-item danger" onclick="event.stopPropagation(); joinOrLeaveNet('${net.id}', false); closeAllMemberMenus();">
                    🚪️ 离开网络
                    </button>
                  </div>
                </div>
              </div>
              <div class="meta-row">
              <div class="network-id">${net.id}</div>
              </div>
               <span class="" >${net.assignedAddresses?.[0] || ''}</span>

            `;


        networkUnknown.appendChild(card);
        if (isFirstRender) {
            setTimeout(() => {
                isFirstRender = false;
            }, 400);
        }
    });

}

function showError(title, msg) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorTitle.textContent = title;
    errorMessage.textContent = msg;
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

// 表单保存事件
document.getElementById('edit-form').onsubmit = async function (e) {
    e.preventDefault();
    const nodeId = document.getElementById('edit-nodeId').value;
    const name = document.getElementById('edit-name').value.trim();
    const desc = document.getElementById('edit-desc').value.trim();

    const saveBtn = document.getElementById('edit-save');
    const cancelBtn = document.getElementById('edit-cancel');
    if (!nodeId) return;

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    const oldText = saveBtn.textContent;
    saveBtn.innerHTML = '<span class="spinner1" style="margin-right:8px;"></span>保存中...';

    try {
        const res = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + nodeId)}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                config: {
                    name,
                    description: desc,
                }
            })
        });

        if (res.ok) {
            showToast('✅ 信息已更新');
            await fetchData();
            closeEditPanel();
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

async function removeMember(netId) {
    if (!confirm('确定删除此网络？')) return;
    try {
        const r = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/network/' + netId)}`, {
            method: 'DELETE'
        });
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`删除失败: 无效访问令牌`);
            } else {
                throw new Error(`删除失败: ${r.statusText}`);
            }
        }
        showToast('✅ 已删除');
        await fetchData();
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

async function joinOrLeaveNet(netId, isJoin) {
    if (!isJoin && !confirm('确定离开此网络？')) return;

    try {
        let toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = "🔄 正在操作，请稍候";
        toast.classList.add('show');
        const r = await fetch(`/api?token=${encodeURIComponent(clientToken)}&path=${encodeURIComponent('/network/' + netId)}&server=${encodeURIComponent(server || 'localhost:9993')}`, {
            method: isJoin ? 'POST' : 'DELETE'
        });
        if (!r.ok) {
            if (r.status === 401) {
                throw new Error(`操作失败: 无效访问令牌`);
            } else {
                throw new Error(`操作失败: ${r.statusText}`);
            }
        }
        await fetchData();
        toast.textContent = isJoin ? '✅ 已加入' : '✅ 已离开';
    } catch (e) {
        showToast('❌ ' + e.message);
    } finally {
        setTimeout(() => toast.classList.remove('show'), 2300);
    }
}


async function fetchData() {
    await init();
}

// 启动
init();
updateTime();
setInterval(fetchData, 60000);

window.copyKanbanLink = copyKanbanLink;