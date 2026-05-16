let jugadasData = [];
let currentSorteoId = '';
let winningNumbers = [];

document.addEventListener('DOMContentLoaded', async () => {
    await cargarSemanas();
    await cargarReporte();

    document.getElementById('filtro-semana').addEventListener('change', (e) => {
        currentSorteoId = e.target.value;
        cargarReporte(currentSorteoId);
    });

    document.getElementById('filtro-nombre').addEventListener('input', (e) => {
        renderTabla(e.target.value);
    });

    document.getElementById('filtro-aciertos')?.addEventListener('change', () => {
        renderTabla(document.getElementById('filtro-nombre').value);
    });

    });
});

window.filtrarPorAciertosPublic = function(val) {
    const sel = document.getElementById('filtro-aciertos-pub');
    if (!sel) return;
    sel.value = (sel.value === val) ? '' : val;
    renderTabla(document.getElementById('filtro-nombre').value);
};

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

            // Render Pozos Dinámicos
            const sectionPozos = document.getElementById('section-pozos');
            const pozosContainer = document.getElementById('pozos-container');

            if (data.pozos && data.pozos.length > 0) {
                sectionPozos.classList.remove('hidden');
                pozosContainer.innerHTML = '';
                data.pozos.forEach(p => {
                    const div = parseInt(p.divisiones) || 1;
                    const montoTotal = parseFloat(p.monto_total) || 0;
                    const montoPorGanador = div > 1 ? Math.floor(montoTotal / div) : montoTotal;
                    const divHtml = div > 1
                        ? `<p class="text-xs text-gray-400 mt-1">÷ ${div} ganadores = <span class="text-green-400 font-bold">$${montoPorGanador.toLocaleString()}</span> c/u</p>`
                        : '';
                    const el = document.createElement('div');
                    el.className = 'bg-gray-800/60 border border-indigo-500/20 rounded-xl p-4 text-center';
                    el.innerHTML = `
                        <p class="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">${p.nombre}</p>
                        ${p.descripcion ? `<p class="text-xs text-gray-500 mb-2">${p.descripcion}</p>` : ''}
                        <p class="text-2xl font-black text-white">$${montoTotal.toLocaleString()}</p>
                        ${divHtml}
                    `;
                    pozosContainer.appendChild(el);
                });
            } else if (data.sorteo.pozo_semana || data.sorteo.pozo_consuelo || data.sorteo.pozo_saladito) {
                // Fallback a pozos legacy fijos con divisiones
                sectionPozos.classList.remove('hidden');
                const legacyPozos = [
                    { nombre: 'Pozo Semana', color: 'indigo', monto: data.sorteo.pozo_semana, div: data.sorteo.div_semana },
                    { nombre: 'Pozo Consuelo', color: 'yellow', monto: data.sorteo.pozo_consuelo, div: data.sorteo.div_consuelo },
                    { nombre: 'Saladito', color: 'orange', monto: data.sorteo.pozo_saladito, div: data.sorteo.div_saladito },
                ].filter(p => p.monto > 0);
                pozosContainer.innerHTML = legacyPozos.map(p => {
                    const d = parseInt(p.div) || 1;
                    const monto = parseFloat(p.monto) || 0;
                    const porGanador = d > 1 ? `<p class="text-xs text-gray-400 mt-1">÷ ${d} ganadores = <span class="text-green-400 font-bold">$${Math.floor(monto/d).toLocaleString()}</span> c/u</p>` : '';
                    return `<div class="bg-gray-800/60 border border-${p.color}-500/20 rounded-xl p-4 text-center">
                        <p class="text-xs text-${p.color}-400 font-bold uppercase mb-1">${p.nombre}</p>
                        <p class="text-2xl font-black text-white">$${monto.toLocaleString()}</p>
                        ${porGanador}
                    </div>`;
                }).join('');

            } else {
                sectionPozos.classList.add('hidden');
            }

            // Resultados diarios
            const gridRes = document.getElementById('grid-resultados');
            gridRes.innerHTML = '';
            winningNumbers = [];
            if (data.resultados_diarios && data.resultados_diarios.length > 0) {
                resSec.classList.remove('hidden');
                data.resultados_diarios.forEach(r => {
                    r.numeros_ganadores_dia.split(',').forEach(n => {
                        if (n.trim()) winningNumbers.push(n.trim());
                    });
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
    const filtroOrden = document.getElementById('filtro-aciertos')?.value || '';
    const filtroPub = document.getElementById('filtro-aciertos-pub')?.value || '';

    let filtradas = jugadasData.filter(j =>
        j.nombre_completo.toLowerCase().includes(filtroNombre.toLowerCase())
    );

    // Actualizar contadores (solo líneas pagadas, sin filtro de aciertos)
    const pagadasParaConteo = filtradas.filter(j => j.pagada);
    ['pub-cnt-0','pub-cnt-8','pub-cnt-9','pub-cnt-10'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const n = parseInt(id.replace('pub-cnt-',''));
        el.textContent = pagadasParaConteo.filter(j => j.aciertos_actuales === n).length;
    });

    // Aplicar filtro por aciertos especificos
    if (filtroPub !== '') {
        filtradas = filtradas.filter(j => j.aciertos_actuales === parseInt(filtroPub));
    }

    // Ordenar
    if (filtroOrden === 'desc') {
        filtradas.sort((a, b) => b.aciertos_actuales - a.aciertos_actuales);
    } else if (filtroOrden === 'asc') {
        filtradas.sort((a, b) => a.aciertos_actuales - b.aciertos_actuales);
    }

    tbody.innerHTML = '';

    if (filtradas.length === 0) {
        noJugadas.classList.remove('hidden');
        return;
    }

    noJugadas.classList.add('hidden');

    filtradas.forEach(j => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-500/5 transition";

        const nums = j.numeros_elegidos.split(',');
        const numsHtml = nums.map(n => {
            const num = n.trim();
            const isMatch = winningNumbers.some(wn => String(wn).trim() === num);
            return `<span class="inline-block px-2 py-1 rounded-lg font-black text-base ${isMatch ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40' : 'text-gray-400'}">${num}</span>`;
        }).join(' ');

        let aciertosEmoji = '';
        let aciertosClass = 'bg-gray-700/40 text-gray-300';
        if (j.aciertos_actuales === 10)     { aciertosEmoji = '🏆'; aciertosClass = 'bg-yellow-500/20 text-yellow-300'; }
        else if (j.aciertos_actuales === 9) { aciertosEmoji = '🔥'; aciertosClass = 'bg-purple-500/20 text-purple-300'; }
        else if (j.aciertos_actuales >= 8)  { aciertosEmoji = '✨'; aciertosClass = 'bg-blue-500/20 text-blue-300'; }
        else if (j.aciertos_actuales === 0) { aciertosEmoji = '🥗'; aciertosClass = 'bg-orange-500/20 text-orange-300'; }

        tr.innerHTML = `
            <td class="px-5 py-4 whitespace-nowrap text-base text-gray-400 font-bold">#${j.id}</td>
            <td class="px-5 py-4 whitespace-nowrap text-lg font-black text-white">${j.nombre_completo}</td>
            <td class="px-5 py-4 flex flex-wrap gap-1">${numsHtml}</td>
            <td class="px-5 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xl font-black ${aciertosClass}">
                    ${aciertosEmoji} ${j.aciertos_actuales}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}



