// Lógica de Admin
let token = localStorage.getItem('adminToken');
const loginSection = document.getElementById('admin-login');
const dashboardSection = document.getElementById('admin-dashboard');

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        mostrarDashboard();
    }
});

// LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        if (res.ok) {
            const data = await res.json();
            token = data.token;
            localStorage.setItem('adminToken', token);
            mostrarDashboard();
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    } catch (e) {
        Modal.alert("Error de red");
    } finally {
        btn.disabled = false;
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    token = null;
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// Modal System
const Modal = {
    open: function(title, bodyHtml, actionsHtml) {
        document.getElementById('apex-modal-title').textContent = title;
        document.getElementById('apex-modal-body').innerHTML = bodyHtml;
        document.getElementById('apex-modal-footer').innerHTML = actionsHtml;
        
        const modal = document.getElementById('apex-modal');
        const box = document.getElementById('apex-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }, 10);
    },
    close: function() {
        const modal = document.getElementById('apex-modal');
        const box = document.getElementById('apex-modal-box');
        
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },
    alert: function(msg) {
        this.open('Alerta', `<p class="text-white">${msg}</p>`, `<button onclick="Modal.close()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded transition">Aceptar</button>`);
    },
    confirm: function(msg, onConfirm) {
        window._tempConfirm = () => { Modal.close(); onConfirm(); };
        this.open('Confirmación', `<p class="text-white">${msg}</p>`, `
            <button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition">Cancelar</button>
            <button onclick="window._tempConfirm()" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 font-bold text-white rounded transition">Aceptar</button>
        `);
    },
    prompt: function(title, label, defaultValue, onSave) {
        window._tempPrompt = () => {
            const val = document.getElementById('modal-prompt-input').value;
            Modal.close();
            onSave(val);
        };
        this.open(title, `
            <label class="block text-sm mb-1 text-gray-400">${label}</label>
            <input type="text" id="modal-prompt-input" value="${defaultValue}" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">
        `, `
            <button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition">Cancelar</button>
            <button onclick="window._tempPrompt()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded transition">Guardar</button>
        `);
    }
};

document.getElementById('apex-modal-close')?.addEventListener('click', () => Modal.close());

// TABS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600');
        btn.classList.add('bg-gray-800', 'hover:bg-gray-700');
    });
    
    // Buscar el boton activo por el onclick attribute string match
    const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-800', 'hover:bg-gray-700');
        activeBtn.classList.add('bg-indigo-600');
    }

    if (tabId === 'jugadas') cargarJugadas(document.getElementById('filtro-semana').value);
    if (tabId === 'jugadores') cargarJugadores();
    if (tabId === 'resultados') cargarResultadosAdmin();
    if (tabId === 'sorteos') cargarSorteosABM();
    if (tabId === 'pozos') cargarPozos();
    if (tabId === 'faqs') cargarFaqsAdmin();
    if (tabId === 'auditoria') cargarAuditoria();
    if (tabId === 'config') cargarConfig();
}

function mostrarDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    cargarSorteosLista();
    switchTab('jugadas');
}

async function cargarSorteosLista() {
    try {
        const res = await fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const sorteos = await res.json();
            const select = document.getElementById('filtro-semana');
            select.innerHTML = '<option value="">Todas las semanas</option>';
            
            let defaultId = '';
            if (sorteos.length > 0) {
                // El primero suele ser el último creado (o podemos buscar el activo)
                const activo = sorteos.find(s => s.estado === 'Abierto');
                defaultId = activo ? activo.id : sorteos[0].id;
            }

            const container = document.getElementById('lista-sorteos-admin');
            if (container) container.innerHTML = '';

            sorteos.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.nombre_referencia} (${s.estado})</option>`;
                
                if (container) {
                    const isOpenToPublic = s.recibiendo_jugadas !== 0; // default is usually 1, sqlite might return 1/0 or true/false
                    
                    const div = document.createElement('div');
                    div.className = "bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col gap-2";
                    div.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold text-sm text-white">${s.nombre_referencia} <span class="text-xs ${s.estado === 'Abierto' ? 'text-green-400' : 'text-gray-400'}">(${s.estado})</span></p>
                                <p class="text-xs text-gray-400">Sem: $${s.pozo_semana || 0} | Con: $${s.pozo_consuelo || 0} | Sal: $${s.pozo_saladito || 0}</p>
                            </div>
                            <div class="flex flex-wrap gap-2 justify-end">
                                <button onclick="editarPozosSorteo(${s.id}, ${s.pozo_semana || 0}, ${s.pozo_consuelo || 0}, ${s.pozo_saladito || 0})" class="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded text-white transition">Editar Pozos</button>
                                ${s.estado === 'Abierto' ? 
                                    `<button onclick="toggleSorteoPublico(${s.id}, ${!isOpenToPublic})" class="text-xs ${isOpenToPublic ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'} px-2 py-1 rounded text-white transition">
                                        ${isOpenToPublic ? 'Cerrar al Público' : 'Abrir al Público'}
                                    </button>` 
                                : ''}
                                <button onclick="borrarSorteo(${s.id})" class="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-red-200 transition">Eliminar</button>
                            </div>
                        </div>
                        ${isOpenToPublic && s.estado === 'Abierto' ? '<p class="text-[10px] text-green-400 font-bold uppercase">● Recibiendo Jugadas Nuevas</p>' : '<p class="text-[10px] text-orange-400 font-bold uppercase">● No recibe jugadas nuevas</p>'}
                    `;
                    container.appendChild(div);
                }
            });

            // Set default if empty
            if (!select.value && defaultId) {
                select.value = defaultId;
            }
        }
    } catch (e) {
        console.error("Error al cargar sorteos", e);
    }
}

document.getElementById('filtro-semana')?.addEventListener('change', (e) => {
    cargarJugadas(e.target.value);
});

document.getElementById('filtro-pago')?.addEventListener('change', () => {
    cargarJugadas(document.getElementById('filtro-semana').value);
});

document.getElementById('filtro-orden')?.addEventListener('change', () => {
    cargarJugadas(document.getElementById('filtro-semana').value);
});

// Cargar Jugadas
async function cargarJugadas(sorteoId = '') {
    const tbody = document.getElementById('tbody-jugadas');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Cargando...</td></tr>';
    
    try {
        let winningNumbers = [];
        let sIdForWinning = sorteoId;
        
        // Si no hay sorteoId (Todas las semanas), intentamos obtener el último sorteo para el resaltado
        if (!sIdForWinning) {
            try {
                const resS = await fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } });
                if (resS.ok) {
                    const sorteos = await resS.json();
                    if (sorteos.length > 0) sIdForWinning = sorteos[0].id;
                }
            } catch (e) { console.error(e); }
        }

        if (sIdForWinning) {
            try {
                const resRes = await fetch(`/api/admin/resultados-sorteo?sorteo_id=${sIdForWinning}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resRes.ok) winningNumbers = await resRes.json();
            } catch (e) { console.error(e); }
        }

        let url = '/api/admin/jugadas';
        if (sorteoId) url += `?sorteo_id=${sorteoId}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout();
        
        const data = await res.json();
        
        // Aplicar filtros locales
        const filtroPago = document.getElementById('filtro-pago')?.value || 'todos';
        const filtroOrden = document.getElementById('filtro-orden')?.value || 'id_desc';
        
        let filtradas = data;
        if (filtroPago === 'pagados') {
            filtradas = filtradas.filter(j => j.pagada);
        } else if (filtroPago === 'pendientes') {
            filtradas = filtradas.filter(j => !j.pagada);
        }

        if (filtroOrden === 'id_desc') {
            filtradas.sort((a, b) => b.id - a.id);
        } else if (filtroOrden === 'aciertos_desc') {
            filtradas.sort((a, b) => b.aciertos_actuales - a.aciertos_actuales);
        } else if (filtroOrden === 'aciertos_asc') {
            filtradas.sort((a, b) => a.aciertos_actuales - b.aciertos_actuales);
        }

        tbody.innerHTML = '';
        
        filtradas.forEach(j => {
            const tr = document.createElement('tr');
            tr.className = "cursor-pointer hover:bg-gray-700 transition";
            tr.onclick = () => {
                const detailRow = document.getElementById(`detail-${j.id}`);
                detailRow.classList.toggle('hidden');
            };
            
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">#${j.id}</td>
                <td class="px-4 py-3 whitespace-nowrap font-medium text-white">${j.nombre_completo}</td>
                <td class="px-4 py-3 whitespace-nowrap text-indigo-300" onclick="event.stopPropagation()">
                    <a href="https://wa.me/${j.telefono}" target="_blank" class="hover:underline">${j.telefono}</a>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="font-bold ${j.aciertos_actuales >= 8 ? 'text-green-400' : 'text-gray-300'}">${j.aciertos_actuales}</span> / 10
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full ${j.pagada ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${j.pagada ? 'Pagada' : 'Pendiente'}
                    </span>
                    ${j.es_linea_gratis ? '<span class="ml-1 px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-300">Gratis</span>' : ''}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onclick="event.stopPropagation()">
                    <button onclick="togglePago(${j.id}, ${!j.pagada})" class="text-indigo-400 hover:text-indigo-300">
                        ${j.pagada ? 'Pendiente' : 'Pagada'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Fila desplegable oculta
            const detailTr = document.createElement('tr');
            detailTr.id = `detail-${j.id}`;
            detailTr.className = "hidden bg-gray-900 border-b border-gray-700";
            
            const nums = j.numeros_elegidos.split(',');
            const numsHtml = nums.map(n => {
                const num = n.trim();
                // Aseguramos que la comparación sea entre strings limpios
                const isMatch = winningNumbers.some(wn => String(wn).trim() === num);
                return `<span class="${isMatch ? 'text-green-400 font-bold' : 'text-gray-300'}">${num}</span>`;
            }).join(' - ');

            detailTr.innerHTML = `
                <td colspan="6" class="px-4 py-3">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-300">
                            <span class="font-bold text-indigo-400">Números jugados:</span> <span class="tracking-widest">${numsHtml}</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editarJugada(${j.id}, '${j.numeros_elegidos}')" class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition">Editar Línea</button>
                            <button onclick="borrarJugada(${j.id})" class="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-red-200 transition">Eliminar Línea</button>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(detailTr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error al cargar datos</td></tr>';
    }
}

async function togglePago(id, pagada) {
    try {
        await fetch('/api/admin/jugadas', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ id, pagada })
        });
        cargarJugadas(document.getElementById('filtro-semana').value);
    } catch (e) {
        Modal.alert("Error al actualizar pago");
    }
}

window.borrarJugada = function(id) {
    Modal.confirm("¿Seguro que deseas eliminar esta jugada? Esta acción no se puede deshacer.", async () => {
        try {
            await fetch(`/api/admin/jugadas?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cargarJugadas(document.getElementById('filtro-semana').value);
            Modal.alert("Jugada eliminada");
        } catch(e) { Modal.alert("Error"); }
    });
}

// Cargar Resultados
document.getElementById('form-resultados').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Procesando...";

    const numeros = document.getElementById('numeros_ganadores').value;
    const dia_semana = document.getElementById('dia_semana').value;
    
    try {
        const res = await fetch('/api/admin/resultados', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ numeros_ganadores_dia: numeros, dia_semana })
        });
        
        if (res.ok) {
            Modal.alert("Resultados cargados y aciertos recalculados.");
            document.getElementById('numeros_ganadores').value = '';
            cargarResultadosAdmin();
        } else {
            Modal.alert("Error al cargar resultados.");
        }
    } catch (e) {
        Modal.alert("Error de conexión");
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar y Recalcular Aciertos";
    }
});

// Sorteos
document.getElementById('btn-cerrar-sorteo').addEventListener('click', async () => {
    Modal.confirm("¿Seguro que quieres cerrar el sorteo actual?", async () => {
        try {
            const resS = await fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } });
            const sorteos = await resS.json();
            const activo = sorteos.find(s => s.estado === 'Abierto');
            
            if(activo) {
                await fetch('/api/admin/sorteos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'cerrar', id: activo.id })
                });
                Modal.alert("Sorteo cerrado.");
                cargarSorteosLista();
            } else {
                Modal.alert("No hay sorteo abierto.");
            }
        } catch (e) {
            console.error(e);
            Modal.alert("Error");
        }
    });
});

document.getElementById('form-nuevo-sorteo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nuevo_sorteo_nombre').value;
    const pozo_semana = document.getElementById('pozo_semana').value;
    const pozo_consuelo = document.getElementById('pozo_consuelo').value;
    const pozo_saladito = document.getElementById('pozo_saladito').value;

    try {
        await fetch('/api/admin/sorteos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                action: 'crear', 
                nombre_referencia: nombre,
                pozo_semana: parseFloat(pozo_semana) || 0,
                pozo_consuelo: parseFloat(pozo_consuelo) || 0,
                pozo_saladito: parseFloat(pozo_saladito) || 0
            })
        });
        Modal.alert("Sorteo creado.");
        cargarSorteosLista();
        document.getElementById('form-nuevo-sorteo').reset();
        document.getElementById('nuevo_sorteo_nombre').value = '';
        cargarSorteosLista();
    } catch (e) {
        alert("Error");
    }
});

// Configuración
async function cargarConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('conf-wp').value = data.admin_whatsapp;
            document.getElementById('conf-alias').value = data.admin_alias;
            document.getElementById('conf-titular').value = data.admin_titular;
            document.getElementById('conf-precio').value = data.precio_linea || 1000;
        }
    } catch (e) { console.error(e) }
}

document.getElementById('form-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                admin_whatsapp: document.getElementById('conf-wp').value,
                admin_alias: document.getElementById('conf-alias').value,
                admin_titular: document.getElementById('conf-titular').value,
                precio_linea: parseFloat(document.getElementById('conf-precio').value) || 1000,
                admin_user: document.getElementById('conf-user').value,
                admin_password: document.getElementById('conf-pass').value
            })
        });
        Modal.alert("Configuración actualizada.");
    } catch (e) {
        Modal.alert("Error");
    }
});

async function editarJugada(id, actual) {
    event.stopPropagation();
    Modal.prompt("Editar Jugada", "Editar números (separados por coma):", actual, async (nuevos) => {
        if (nuevos && nuevos !== actual) {
            try {
                await fetch('/api/admin/jugadas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id, numeros_elegidos: nuevos })
                });
                cargarJugadas(document.getElementById('filtro-semana').value);
            } catch (e) { Modal.alert("Error al editar línea"); }
        }
    });
}

// Jugadores
let jugadoresCache = [];

async function cargarJugadores() {
    const tbody = document.getElementById('tbody-jugadores');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Cargando jugadores...</td></tr>';
    
    try {
        const res = await fetch('/api/admin/jugadores', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            jugadoresCache = await res.json();
            tbody.innerHTML = '';
            jugadoresCache.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-4 py-3">#${p.id}</td>
                    <td class="px-4 py-3 font-medium text-white">${p.nombre_completo}</td>
                    <td class="px-4 py-3 text-indigo-300">${p.telefono}</td>
                    <td class="px-4 py-3 text-gray-400">${p.dni_cuil || '-'}</td>
                    <td class="px-4 py-3 text-gray-300">${p.lineas_gratis_disponibles}</td>
                    <td class="px-4 py-3 text-right space-x-2">
                        <button onclick="abrirModalJugador(${p.id})" class="text-indigo-400 hover:text-indigo-300">Editar</button>
                        <button onclick="borrarJugador(${p.id})" class="text-red-400 hover:text-red-300">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error al cargar jugadores</td></tr>';
    }
}

window.borrarJugador = function(id) {
    Modal.confirm("¿Estás seguro de eliminar este jugador? Perderá todas sus jugadas asociadas.", async () => {
        try {
            await fetch(`/api/admin/jugadores?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cargarJugadores();
            Modal.alert("Jugador eliminado.");
        } catch (e) { Modal.alert("Error"); }
    });
}

function abrirModalJugador(id) {
    const p = jugadoresCache.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('edit-j-id').value = p.id;
    document.getElementById('edit-j-nombre').value = p.nombre_completo;
    document.getElementById('edit-j-telefono').value = p.telefono;
    document.getElementById('edit-j-dni').value = p.dni_cuil || '';
    document.getElementById('edit-j-alias').value = p.alias_para_cobrar || '';
    document.getElementById('edit-j-titular').value = p.titular_cuenta || '';
    document.getElementById('edit-j-gratis').value = p.lineas_gratis_disponibles;
    
    document.getElementById('modal-jugador').classList.remove('hidden');
}

function cerrarModalJugador() {
    document.getElementById('modal-jugador').classList.add('hidden');
}

document.getElementById('form-editar-jugador')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const data = {
        id: document.getElementById('edit-j-id').value,
        nombre_completo: document.getElementById('edit-j-nombre').value,
        telefono: document.getElementById('edit-j-telefono').value,
        dni_cuil: document.getElementById('edit-j-dni').value,
        alias_para_cobrar: document.getElementById('edit-j-alias').value,
        titular_cuenta: document.getElementById('edit-j-titular').value,
        lineas_gratis_disponibles: parseInt(document.getElementById('edit-j-gratis').value) || 0
    };

    try {
        const res = await fetch('/api/admin/jugadores', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            cerrarModalJugador();
            cargarJugadores();
            Modal.alert("Jugador guardado exitosamente");
        } else {
            Modal.alert("Error al guardar cambios");
        }
    } catch (e) {
        Modal.alert("Error de conexión");
    } finally {
        btn.disabled = false;
    }
});

async function toggleMensual(id, valor) {
    Modal.confirm(`¿Marcar esta línea como Pago Mensual? (Se clonará automáticamente en los siguientes sorteos del mes)`, async () => {
        try {
            await fetch('/api/admin/jugadas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, es_mensual: valor })
            });
            cargarJugadas(document.getElementById('filtro-semana').value);
        } catch (e) { Modal.alert("Error"); }
    });
}

window.editarPozosSorteo = async function(id, s, c, sa) {
    // This should ideally be a form, for now just create a quick form in the Modal
    const bodyHtml = `
        <label class="block text-sm mb-1 text-gray-400">Pozo Semana</label>
        <input type="number" id="mod-pozo-sem" value="${s}" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2">
        <label class="block text-sm mb-1 text-gray-400">Pozo Consuelo</label>
        <input type="number" id="mod-pozo-con" value="${c}" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2">
        <label class="block text-sm mb-1 text-gray-400">Pozo Saladito</label>
        <input type="number" id="mod-pozo-sal" value="${sa}" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">
    `;
    window._tempSavePozos = async () => {
        const sem = document.getElementById('mod-pozo-sem').value;
        const con = document.getElementById('mod-pozo-con').value;
        const sal = document.getElementById('mod-pozo-sal').value;
        Modal.close();
        
        try {
            await fetch('/api/admin/sorteos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    action: 'actualizar_pozos', 
                    id: id,
                    pozo_semana: parseFloat(sem) || 0,
                    pozo_consuelo: parseFloat(con) || 0,
                    pozo_saladito: parseFloat(sal) || 0
                })
            });
            Modal.alert("Pozos actualizados.");
            cargarSorteosLista();
        } catch (e) {
            Modal.alert("Error al actualizar");
        }
    };
    
    Modal.open("Editar Pozos", bodyHtml, `
        <button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition">Cancelar</button>
        <button onclick="window._tempSavePozos()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded transition">Guardar</button>
    `);
}

window.toggleSorteoPublico = async function(id, abrir) {
    Modal.confirm(`¿Seguro que quieres ${abrir ? 'ABRIR' : 'CERRAR'} el sorteo al público? ${!abrir ? '(Ya no podrán cargar nuevas jugadas)' : ''}`, async () => {
        try {
            await fetch('/api/admin/sorteos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    action: 'toggle_publico', 
                    id: id,
                    recibiendo_jugadas: abrir
                })
            });
            cargarSorteosLista();
        } catch (e) {
            Modal.alert("Error al actualizar estado");
        }
    });
}

function logout() {
    document.getElementById('btn-logout').click();
}

window.cargarSorteosABM = cargarSorteosLista;

window.borrarSorteo = function(id) {
    Modal.confirm("¿Seguro que deseas eliminar el sorteo? Se eliminarán todas las jugadas y resultados asociados.", async () => {
        try {
            await fetch(`/api/admin/sorteos?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cargarSorteosLista();
            Modal.alert("Sorteo eliminado");
        } catch(e) { Modal.alert("Error"); }
    });
}

// AUDITORIA
async function cargarAuditoria() {
    const tbody = document.getElementById('tbody-auditoria');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Cargando...</td></tr>';
    try {
        const res = await fetch('/api/admin/auditoria', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            tbody.innerHTML = '';
            data.forEach(a => {
                tbody.innerHTML += `
                    <tr>
                        <td class="px-4 py-2">#${a.id}</td>
                        <td class="px-4 py-2">${new Date(a.fecha).toLocaleString()}</td>
                        <td class="px-4 py-2 text-indigo-400 font-bold">${a.tabla}</td>
                        <td class="px-4 py-2 font-mono ${a.accion === 'DELETE' ? 'text-red-400' : (a.accion === 'INSERT' ? 'text-green-400' : 'text-orange-400')}">${a.accion}</td>
                        <td class="px-4 py-2">${a.registro_id}</td>
                        <td class="px-4 py-2 text-gray-500">${a.admin_usuario}</td>
                    </tr>
                `;
            });
            if (data.length === 0) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Sin registros</td></tr>';
        }
    } catch (e) {}
}

// RESULTADOS ABM
async function cargarResultadosAdmin() {
    let listContainer = document.getElementById('lista-resultados-admin');
    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'lista-resultados-admin';
        listContainer.className = 'mt-6 space-y-2';
        document.getElementById('form-resultados').parentElement.appendChild(listContainer);
    }
    listContainer.innerHTML = '<p class="text-gray-400">Cargando resultados...</p>';
    
    try {
        const res = await fetch('/api/admin/resultados', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            listContainer.innerHTML = '<h3 class="font-bold text-gray-300 border-b border-gray-700 pb-2 mb-2 mt-6">Resultados Cargados</h3>';
            data.forEach(r => {
                listContainer.innerHTML += `
                    <div class="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700">
                        <div>
                            <p class="font-bold text-white">${r.dia_semana} (${r.fecha_dia})</p>
                            <p class="text-sm text-gray-400">Sorteo: ${r.nombre_referencia} | Números: <span class="text-green-400 font-mono">${r.numeros_ganadores_dia}</span></p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="borrarResultado(${r.id})" class="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded text-red-200 transition">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            if (data.length === 0) listContainer.innerHTML += '<p class="text-gray-500 text-sm">No hay resultados cargados.</p>';
        }
    } catch (e) {}
}

window.borrarResultado = function(id) {
    Modal.confirm("¿Seguro que deseas eliminar este resultado? Esto recalculará los aciertos de TODAS las jugadas de ese sorteo.", async () => {
        try {
            await fetch(`/api/admin/resultados?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cargarResultadosAdmin();
            Modal.alert("Eliminado correctamente");
        } catch(e) { Modal.alert("Error"); }
    });
}

// =====================
// POZOS DINÁMICOS (ABM)
// =====================
async function cargarPozos() {
    const container = document.getElementById('lista-pozos');
    const select = document.getElementById('pozo-filtro-sorteo');
    if (!container) return;
    if (select && select.options.length <= 1) {
        try {
            const res = await fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const sorteos = await res.json();
                select.innerHTML = '<option value="">Todos los sorteos</option>';
                sorteos.forEach(s => { select.innerHTML += `<option value="${s.id}">${s.nombre_referencia}</option>`; });
            }
        } catch(e) {}
    }
    const sorteoId = select?.value || '';
    container.innerHTML = '<p class="text-gray-400 text-sm">Cargando pozos...</p>';
    try {
        let url = '/api/admin/pozos';
        if (sorteoId) url += `?sorteo_id=${sorteoId}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const pozos = await res.json();
            container.innerHTML = '';
            if (pozos.length === 0) { container.innerHTML = '<p class="text-gray-500 text-sm">No hay pozos. Crea uno con el botón de arriba.</p>'; return; }
            pozos.forEach(p => {
                container.innerHTML += `<div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center gap-4"><div><p class="font-bold text-white">${p.nombre}</p>${p.descripcion ? `<p class="text-sm text-gray-400">${p.descripcion}</p>` : ''}<p class="text-sm text-indigo-300">$${parseFloat(p.monto_total).toLocaleString()} · ${p.divisiones > 1 ? `${p.divisiones} ganadores` : '1 ganador'}</p></div><div class="flex gap-2"><button onclick="abrirModalEditarPozo(${p.id})" class="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1 rounded text-white">Editar</button><button onclick="borrarPozo(${p.id})" class="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-red-200">Eliminar</button></div></div>`;
            });
            window._pozosCache = pozos;
        }
    } catch(e) { container.innerHTML = '<p class="text-red-400 text-sm">Error al cargar pozos.</p>'; }
}
window.abrirModalNuevoPozo = function() {
    fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(sorteos => {
        const optsHtml = sorteos.map(s => `<option value="${s.id}">${s.nombre_referencia}</option>`).join('');
        window._tempSavePozo = async () => {
            const d = { sorteo_id: document.getElementById('mod-pozo-sorteo').value, nombre: document.getElementById('mod-pozo-nombre').value, descripcion: document.getElementById('mod-pozo-desc').value, monto_total: document.getElementById('mod-pozo-monto').value, divisiones: document.getElementById('mod-pozo-divs').value };
            Modal.close();
            try { await fetch('/api/admin/pozos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(d) }); Modal.alert('Pozo creado.'); cargarPozos(); } catch(e) { Modal.alert('Error.'); }
        };
        Modal.open('Nuevo Pozo', `<label class="block text-sm mb-1 text-gray-400">Sorteo</label><select id="mod-pozo-sorteo" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2">${optsHtml}</select><label class="block text-sm mb-1 text-gray-400">Nombre</label><input type="text" id="mod-pozo-nombre" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Descripción (opcional)</label><input type="text" id="mod-pozo-desc" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Monto ($)</label><input type="number" id="mod-pozo-monto" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Ganadores</label><input type="number" id="mod-pozo-divs" value="1" min="1" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">`,
        `<button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 text-white rounded">Cancelar</button><button onclick="window._tempSavePozo()" class="px-4 py-2 bg-green-600 font-bold text-white rounded">Crear</button>`);
    });
}
window.abrirModalEditarPozo = function(id) {
    const p = (window._pozosCache||[]).find(x=>x.id===id); if(!p) return;
    window._tempUpdatePozo = async () => {
        const d = { id, nombre: document.getElementById('mod-ep-nombre').value, descripcion: document.getElementById('mod-ep-desc').value, monto_total: document.getElementById('mod-ep-monto').value, divisiones: document.getElementById('mod-ep-divs').value };
        Modal.close();
        try { await fetch('/api/admin/pozos', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(d) }); Modal.alert('Pozo actualizado.'); cargarPozos(); } catch(e) { Modal.alert('Error.'); }
    };
    Modal.open('Editar Pozo', `<label class="block text-sm mb-1 text-gray-400">Nombre</label><input type="text" id="mod-ep-nombre" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Descripción</label><input type="text" id="mod-ep-desc" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Monto ($)</label><input type="number" id="mod-ep-monto" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Ganadores</label><input type="number" id="mod-ep-divs" min="1" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">`,
    `<button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 text-white rounded">Cancelar</button><button onclick="window._tempUpdatePozo()" class="px-4 py-2 bg-indigo-600 font-bold text-white rounded">Guardar</button>`);
    setTimeout(()=>{ document.getElementById('mod-ep-nombre').value=p.nombre; document.getElementById('mod-ep-desc').value=p.descripcion||''; document.getElementById('mod-ep-monto').value=p.monto_total; document.getElementById('mod-ep-divs').value=p.divisiones; },50);
}
window.borrarPozo = function(id) { Modal.confirm('¿Eliminar este pozo?', async()=>{ try { await fetch(`/api/admin/pozos?id=${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}}); cargarPozos(); Modal.alert('Eliminado.'); } catch(e){Modal.alert('Error.');} }); }

// =====================
// FAQs ABM
// =====================
async function cargarFaqsAdmin() {
    const container = document.getElementById('lista-faqs'); if(!container) return;
    container.innerHTML = '<p class="text-gray-400 text-sm">Cargando FAQs...</p>';
    try {
        const res = await fetch('/api/admin/faqs', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const faqs = await res.json(); window._faqsCache = faqs; container.innerHTML='';
            if(faqs.length===0){container.innerHTML='<p class="text-gray-500 text-sm">No hay FAQs. Crea una con el botón de arriba.</p>';return;}
            faqs.forEach(f => { container.innerHTML += `<div class="bg-gray-800 p-4 rounded-lg border border-gray-700"><div class="flex justify-between items-start gap-4"><div class="flex-1"><p class="font-bold text-white">${f.pregunta}</p><p class="text-sm text-gray-400 mt-1">${f.respuesta}</p></div><div class="flex gap-2 flex-shrink-0"><button onclick="abrirModalEditarFaq(${f.id})" class="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1 rounded text-white">Editar</button><button onclick="borrarFaq(${f.id})" class="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-red-200">Eliminar</button></div></div></div>`; });
        }
    } catch(e) { container.innerHTML = '<p class="text-red-400 text-sm">Error.</p>'; }
}
window.abrirModalNuevaFaq = function() {
    window._tempSaveFaq = async () => { const d={pregunta:document.getElementById('mod-faq-preg').value,respuesta:document.getElementById('mod-faq-resp').value,orden:document.getElementById('mod-faq-orden').value}; Modal.close(); try{await fetch('/api/admin/faqs',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(d)});Modal.alert('FAQ creada.');cargarFaqsAdmin();}catch(e){Modal.alert('Error.');} };
    Modal.open('Nueva FAQ', `<label class="block text-sm mb-1 text-gray-400">Pregunta</label><input type="text" id="mod-faq-preg" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Respuesta</label><textarea id="mod-faq-resp" rows="3" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"></textarea><label class="block text-sm mb-1 text-gray-400">Orden</label><input type="number" id="mod-faq-orden" value="0" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">`,
    `<button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 text-white rounded">Cancelar</button><button onclick="window._tempSaveFaq()" class="px-4 py-2 bg-green-600 font-bold text-white rounded">Crear</button>`);
}
window.abrirModalEditarFaq = function(id) {
    const f=(window._faqsCache||[]).find(x=>x.id===id); if(!f) return;
    window._tempUpdateFaq = async () => { const d={id,pregunta:document.getElementById('mod-efaq-preg').value,respuesta:document.getElementById('mod-efaq-resp').value,orden:document.getElementById('mod-efaq-orden').value}; Modal.close(); try{await fetch('/api/admin/faqs',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(d)});Modal.alert('FAQ actualizada.');cargarFaqsAdmin();}catch(e){Modal.alert('Error.');} };
    Modal.open('Editar FAQ', `<label class="block text-sm mb-1 text-gray-400">Pregunta</label><input type="text" id="mod-efaq-preg" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"><label class="block text-sm mb-1 text-gray-400">Respuesta</label><textarea id="mod-efaq-resp" rows="3" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"></textarea><label class="block text-sm mb-1 text-gray-400">Orden</label><input type="number" id="mod-efaq-orden" class="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white">`,
    `<button onclick="Modal.close()" class="px-4 py-2 bg-gray-700 text-white rounded">Cancelar</button><button onclick="window._tempUpdateFaq()" class="px-4 py-2 bg-indigo-600 font-bold text-white rounded">Guardar</button>`);
    setTimeout(()=>{ document.getElementById('mod-efaq-preg').value=f.pregunta; document.getElementById('mod-efaq-resp').value=f.respuesta; document.getElementById('mod-efaq-orden').value=f.orden||0; },50);
}
window.borrarFaq = function(id) { Modal.confirm('¿Eliminar esta FAQ?', async()=>{ try{await fetch(`/api/admin/faqs?id=${id}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});cargarFaqsAdmin();Modal.alert('FAQ eliminada.');}catch(e){Modal.alert('Error.');} }); }

// =====================
// PURGA DE DATOS
// =====================
window.ejecutarPurga = function() {
    const n = parseInt(document.getElementById('purga-mantener').value);
    if (!n || n < 1) { Modal.alert('Ingresa un número válido.'); return; }
    Modal.confirm(`⚠️ ¿Confirmas la PURGA? Se conservarán solo los últimos ${n} sorteo(s). Los sorteos anteriores y sus jugadas, resultados y pozos serán ELIMINADOS. Los jugadores NO son afectados.`, async () => {
        try {
            const res = await fetch('/api/admin/purga', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ mantener_ultimos: n }) });
            const data = await res.json();
            Modal.alert(data.message || 'Purga completada.');
            cargarSorteosLista();
        } catch(e) { Modal.alert('Error al ejecutar la purga.'); }
    });
}
