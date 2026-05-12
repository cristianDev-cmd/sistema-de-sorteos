let jugadasData = []; // Cache para filtrar por nombre localmente
let currentSorteoId = '';

document.addEventListener('DOMContentLoaded', async () => {
    await cargarSemanas();
    await cargarReporte(); // Carga el default (último)

    document.getElementById('filtro-semana').addEventListener('change', (e) => {
        currentSorteoId = e.target.value;
        cargarReporte(currentSorteoId);
    });

    document.getElementById('filtro-nombre').addEventListener('input', (e) => {
        renderTabla(e.target.value);
    });
});

async function cargarSemanas() {
    const select = document.getElementById('filtro-semana');
    try {
        const res = await fetch('/api/sorteos-lista');
        if (res.ok) {
            const sorteos = await res.json();
            select.innerHTML = '<option value="">Seleccionar Semana</option>';
            sorteos.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.nombre_referencia;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error al cargar semanas", e);
    }
}

async function cargarReporte(sorteoId = '') {
    const tbody = document.getElementById('tbody-reporte');
    const resSec = document.getElementById('resultados-diarios-section');
    const semanaNombre = document.getElementById('reporte-semana-nombre');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Cargando reporte...</td></tr>';
    resSec.classList.add('hidden');

    try {
        let url = '/api/reporte';
        if (sorteoId) url += `?sorteo_id=${sorteoId}`;
        
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            
            semanaNombre.textContent = data.sorteo.nombre_referencia;
            jugadasData = data.jugadas;
            
            // Render Resultados
            const gridRes = document.getElementById('grid-resultados');
            gridRes.innerHTML = '';
            if (data.resultados_diarios && data.resultados_diarios.length > 0) {
                resSec.classList.remove('hidden');
                data.resultados_diarios.forEach(r => {
                    const div = document.createElement('div');
                    div.className = "bg-gray-800/50 p-4 rounded-xl border border-gray-700/50";
                    div.innerHTML = `
                        <p class="text-indigo-400 font-bold text-xs uppercase mb-1">${r.dia_semana}</p>
                        <p class="text-white font-mono tracking-widest font-bold">${r.numeros_ganadores_dia.split(',').join(' - ')}</p>
                    `;
                    gridRes.appendChild(div);
                });
            }

            renderTabla();
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-400">Error al cargar el reporte</td></tr>';
    }
}

function renderTabla(filtroNombre = '') {
    const tbody = document.getElementById('tbody-reporte');
    const noJugadas = document.getElementById('no-jugadas');
    
    const filtradas = jugadasData.filter(j => 
        j.nombre_completo.toLowerCase().includes(filtroNombre.toLowerCase())
    );

    tbody.innerHTML = '';
    
    if (filtradas.length === 0) {
        noJugadas.classList.remove('hidden');
        return;
    }
    
    noJugadas.classList.add('hidden');

    filtradas.forEach(j => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-500/5 transition";
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">#${j.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">${j.nombre_completo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-300 tracking-wider">
                ${j.numeros_elegidos.split(',').join(' - ')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${j.aciertos_actuales >= 8 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/30 text-gray-400'}">
                    ${j.aciertos_actuales}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
