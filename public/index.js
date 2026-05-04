/* ===== 自动年份 ===== */
(function () {
    const el = document.getElementById('footer-license');
    if (el) {
        const year = new Date().getFullYear();
        el.textContent = `MIT License © ${year}`;
    }
})();
const tokenInput = document.getElementById('token');

const svcHostInput = document.getElementById('svcHost');
const svcPortInput = document.getElementById('svcPort');
const svcKeyInput = document.getElementById('svcKey');


[svcHostInput, svcKeyInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\s/g, '');
    });
});


if (svcPortInput) {
    svcPortInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 5);
    });
}


tokenInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\s/g, '');
});

document.getElementById('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const err = document.getElementById('error-message');
    const btn = document.querySelector('.submit-button');


    const svcHost = (svcHostInput?.value || 'localhost').trim();
    const svcPort = (svcPortInput?.value || '9993').trim();
    const svcKey = (svcKeyInput?.value || '').trim();


    err.classList.remove('show');

    const token = tokenInput.value.trim();

    if (token.length !== 32) {
        err.textContent = '❌ 无效访问令牌！';
        err.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ 验证中...';

    try {
        const r = await fetch(`/api?token=${encodeURIComponent(token)}&path=${encodeURIComponent('/status')}`);
        if (!r.ok) throw new Error(`API Error => ${r.statusText}`);
        const d = await r.json();
        if (!d.user) {
            throw new Error(`无效访问令牌！`);
        }
        let url = '/networks?token=' + encodeURIComponent(token);
        if (svcKey) {
            console.log('http://' + encodeURIComponent(svcHost + ':' + svcPort) + encodeURIComponent('/status'))
            // const rc = await fetch(`/api?token=${encodeURIComponent(svcKey)}&path=${encodeURIComponent('/status')}&server=${encodeURIComponent(svcHost + ':' + svcPort)}`);
            const rc = await fetchNet('http://' + svcHost + ':' + svcPort + '/status'
                , {
                    params: { id: 123 },
                    headers: { "X-ZT1-Auth": svcKey }
                }
            );
            if (!rc.ok) {
                if (rc.status === 401) {
                    throw new Error('无效客户端访问令牌');
                } else {
                    throw new Error('客户端连接失败，' + rc.statusText);
                }
            }
            url += '&clientToken=' + encodeURIComponent(svcKey);
            if (!((svcHost === 'localhost' || svcHost === '127.0.0.1') && svcPort === '9993')) {
                url += '&server=' + encodeURIComponent(svcHost + ':' + svcPort);
            }
        }
        window.location.href = url;
    } catch (e) {
        console.error('❌ 验证失败:', e);
        err.textContent = '❌ ' + e.message;
        err.classList.add('show');

        btn.disabled = false;
        btn.textContent = '开始使用';
    }
});