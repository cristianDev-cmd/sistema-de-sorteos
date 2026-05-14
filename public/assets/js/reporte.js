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

    cargarFaqs();
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

            // Render Pozos Dinámicos
            const sectionPozos = document.getElementById('section-pozos');
            const pozosContainer = document.getElementById('pozos-container');

            if (data.pozos && data.pozos.length > 0) {
                sectionPozos.classList.remove('hidden');
                pozosContainer.innerHTML = '';
                data.pozos.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'bg-gray-800/60 border border-indigo-500/20 rounded-xl p-4 text-center';
                    div.innerHTML = `
                        <p class="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">${p.nombre}</p>
                        ${p.descripcion ? `<p class="text-xs text-gray-500 mb-2">${p.descripcion}</p>` : ''}
                        <p class="text-2xl font-black text-white">$${parseFloat(p.monto_total).toLocaleString()}</p>
                        ${p.divisiones > 1 ? `<p class="text-xs text-gray-400 mt-1">${p.divisiones} ganadores · $${parseFloat(p.monto_por_division).toLocaleString()} c/u</p>` : ''}
                    `;
                    pozosContainer.appendChild(div);
                });
            } else if (data.sorteo.pozo_semana || data.sorteo.pozo_consuelo || data.sorteo.pozo_saladito) {
                // Fallback a pozos legacy fijos
                sectionPozos.classList.remove('hidden');
                pozosContainer.innerHTML = `
                    <div class="bg-gray-800/60 border border-indigo-500/20 rounded-xl p-4 text-center">
                        <p class="text-xs text-indigo-400 font-bold uppercase mb-1">Pozo Semana</p>
                        <p class="text-2xl font-black text-white">$${(data.sorteo.pozo_semana || 0).toLocaleString()}</p>
                    </div>
                    <div class="bg-gray-800/60 border border-yellow-500/20 rounded-xl p-4 text-center">
                        <p class="text-xs text-yellow-400 font-bold uppercase mb-1">Pozo Consuelo</p>
                        <p class="text-2xl font-black text-white">$${(data.sorteo.pozo_consuelo || 0).toLocaleString()}</p>
                    </div>
                    <div class="bg-gray-800/60 border border-green-500/20 rounded-xl p-4 text-center">
                        <p class="text-xs text-green-400 font-bold uppercase mb-1">Saladito</p>
                        <p class="text-2xl font-black text-white">$${(data.sorteo.pozo_saladito || 0).toLocaleString()}</p>
                    </div>
                `;
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
    const filtroAciertos = document.getElementById('filtro-aciertos')?.value || '';

    let filtradas = jugadasData.filter(j =>
        j.nombre_completo.toLowerCase().includes(filtroNombre.toLowerCase())
    );

    if (filtroAciertos === 'desc') {
        filtradas.sort((a, b) => b.aciertos_actuales - a.aciertos_actuales);
    } else if (filtroAciertos === 'asc') {
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
            return `<span class="${isMatch ? 'text-green-400 font-bold' : 'text-indigo-300'}">${num}</span>`;
        }).join(' <span class="text-gray-600">-</span> ');

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">#${j.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">${j.nombre_completo}</td>
            <td class="px-6 py-4 text-sm font-mono tracking-wider">${numsHtml}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${j.aciertos_actuales >= 8 ? 'bg-green-500/20 text-green-400' : (j.aciertos_actuales === 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700/30 text-gray-400')}">
                    ${j.aciertos_actuales === 0 ? '🥗 0' : j.aciertos_actuales}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarFaqs() {
    const container = document.getElementById('faqs-container');
    if (!container) return;
    try {
        const res = await fetch('/api/faqs');
        if (res.ok) {
            const faqs = await res.json();
            if (faqs.length === 0) {
                document.getElementById('section-faqs')?.classList.add('hidden');
                return;
            }
            document.getElementById('section-faqs')?.classList.remove('hidden');
            container.innerHTML = '';
            faqs.forEach((f, i) => {
                container.innerHTML += `
                    <div class="border border-gray-700/50 rounded-xl overflow-hidden">
                        <button onclick="toggleFaq(${i})" class="w-full text-left px-6 py-4 bg-gray-800/60 hover:bg-gray-700/60 transition flex justify-between items-center gap-4">
                            <span class="font-semibold text-white">${f.pregunta}</span>
                            <svg id="faq-icon-${i}" class="w-5 h-5 text-indigo-400 flex-shrink-0 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="faq-body-${i}" class="hidden px-6 py-4 bg-gray-900/40 text-gray-300 text-sm leading-relaxed">
                            ${f.respuesta}
                        </div>
                    </div>
                `;
            });
        }
    } catch (e) {
        console.error("Error al cargar FAQs", e);
    }
}

function toggleFaq(i) {
    const body = document.getElementById(`faq-body-${i}`);
    const icon = document.getElementById(`faq-icon-${i}`);
    body.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}
