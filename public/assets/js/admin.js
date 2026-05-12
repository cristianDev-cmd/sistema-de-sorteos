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
        alert("Error de red");
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

// TABS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'text-white'));
    event?.target?.classList?.add('active', 'text-white');

    if (tabId === 'jugadas') cargarJugadas(document.getElementById('filtro-semana').value);
    if (tabId === 'jugadores') cargarJugadores();
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
        const res = await fetch('/api/admin/sorteos-lista', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const sorteos = await res.json();
            const select = document.getElementById('filtro-semana');
            select.innerHTML = '<option value="">Todas las semanas</option>';
            sorteos.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.nombre_referencia} (${s.estado})</option>`;
            });
        }
    } catch (e) {
        console.error("Error al cargar sorteos");
    }
}

document.getElementById('filtro-semana')?.addEventListener('change', (e) => {
    cargarJugadas(e.target.value);
});

// Cargar Jugadas
async function cargarJugadas(sorteoId = '') {
    const tbody = document.getElementById('tbody-jugadas');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Cargando...</td></tr>';
    
    try {
        let winningNumbers = [];
        if (sorteoId) {
            try {
                const resRes = await fetch(`/api/admin/resultados-sorteo?sorteo_id=${sorteoId}`, {
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
        tbody.innerHTML = '';
        
        data.forEach(j => {
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
                const isMatch = winningNumbers.includes(num);
                return `<span class="${isMatch ? 'text-green-400 font-bold' : ''}">${num}</span>`;
            }).join(' - ');

            detailTr.innerHTML = `
                <td colspan="6" class="px-4 py-3">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-300">
                            <span class="font-bold text-indigo-400">Números jugados:</span> <span class="tracking-widest">${numsHtml}</span>
                        </div>
                        <button onclick="editarJugada(${j.id}, '${j.numeros_elegidos}')" class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition">Editar Línea</button>
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
        cargarJugadas();
    } catch (e) {
        alert("Error al actualizar pago");
    }
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
            alert("Resultados cargados y aciertos recalculados.");
            document.getElementById('numeros_ganadores').value = '';
        } else {
            alert("Error al cargar resultados.");
        }
    } catch (e) {
        alert("Error de conexión");
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar y Recalcular Aciertos";
    }
});

// Sorteos
document.getElementById('btn-cerrar-sorteo').addEventListener('click', async () => {
    if(!confirm("¿Seguro que quieres cerrar el sorteo actual?")) return;
    
    try {
        // En una app real, podrías querer listar el sorteo activo y enviar su ID.
        // Aquí asumiremos que el backend cierra el último activo (o simplificamos enviando ID nulo si la query lo maneja, pero según la function requiere ID).
        // Modificación: Necesitamos el ID del sorteo. Lo obtendremos antes o modificamos el backend para cerrar "el activo".
        // Para simplicidad, busquemos los sorteos primero.
        const resS = await fetch('/api/admin/sorteos', { headers: { 'Authorization': `Bearer ${token}` } });
        const sorteos = await resS.json();
        const activo = sorteos.find(s => s.estado === 'Abierto');
        
        if(activo) {
            await fetch('/api/admin/sorteos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'cerrar', id: activo.id })
            });
            alert("Sorteo cerrado.");
        } else {
            alert("No hay sorteo abierto.");
        }
    } catch (e) {
        console.error(e);
        alert("Error");
    }
});

document.getElementById('form-nuevo-sorteo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nuevo_sorteo_nombre').value;
    try {
        await fetch('/api/admin/sorteos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'crear', nombre_referencia: nombre })
        });
        alert("Sorteo creado.");
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
                admin_user: document.getElementById('conf-user').value,
                admin_password: document.getElementById('conf-pass').value
            })
        });
        alert("Configuración actualizada.");
    } catch (e) {
        alert("Error");
    }
});

async function editarJugada(id, actual) {
    event.stopPropagation();
    const nuevos = prompt("Editar números (separados por coma):", actual);
    if (nuevos && nuevos !== actual) {
        try {
            await fetch('/api/admin/jugadas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, numeros_elegidos: nuevos })
            });
            cargarJugadas(document.getElementById('filtro-semana').value);
        } catch (e) { alert("Error al editar línea"); }
    }
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
                    <td class="px-4 py-3 text-right">
                        <button onclick="abrirModalJugador(${p.id})" class="text-indigo-400 hover:text-indigo-300">Editar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error al cargar jugadores</td></tr>';
    }
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
        } else {
            alert("Error al guardar cambios");
        }
    } catch (e) {
        alert("Error de conexión");
    } finally {
        btn.disabled = false;
    }
});

function logout() {
    document.getElementById('btn-logout').click();
}

