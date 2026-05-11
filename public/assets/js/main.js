// Variables Globales
let jugadorData = null;
let configuracionAdmin = null;
let lineasElegidas = []; // array de arrays de numeros
let numerosSeleccionados = [];
const PRECIO_LINEA = 500;
let idsJugadas = [];

// DOM Elements
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const formJugador = document.getElementById('form-jugador');
const gridNumeros = document.getElementById('grid-numeros');
const contadorNumeros = document.getElementById('contador-numeros');
const btnAgregarLinea = document.getElementById('btn-agregar-linea');
const btnIrCheckout = document.getElementById('btn-ir-checkout');
const listaLineas = document.getElementById('lista-lineas');
const lineasGuardadasContainer = document.getElementById('lineas-guardadas-container');
const infoGratis = document.getElementById('info-gratis');
const cantidadGratis = document.getElementById('cantidad-gratis');
const btnWhatsapp = document.getElementById('btn-whatsapp');

// Configuración inicial
document.addEventListener('DOMContentLoaded', async () => {
    // Generar grilla de números 00-99
    for (let i = 0; i < 100; i++) {
        const num = i.toString().padStart(2, '0');
        const btn = document.createElement('div');
        btn.className = 'number-btn';
        btn.textContent = num;
        btn.dataset.numero = num;
        btn.addEventListener('click', () => toggleNumero(btn, num));
        gridNumeros.appendChild(btn);
    }

    // Cargar config del admin
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            configuracionAdmin = await res.json();
            document.getElementById('config-titular').textContent = configuracionAdmin.admin_titular;
            document.getElementById('config-alias').textContent = configuracionAdmin.admin_alias;
        }
    } catch (e) {
        console.error("Error al cargar config", e);
    }
});

// Paso 1: Guardar Jugador
formJugador.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formJugador.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const data = {
        nombre_completo: document.getElementById('nombre').value,
        telefono: document.getElementById('telefono').value,
        dni_cuil: document.getElementById('dni').value,
        alias_para_cobrar: document.getElementById('alias').value,
        titular_cuenta: document.getElementById('titular').value
    };

    try {
        const res = await fetch('/api/jugadores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            const result = await res.json();
            jugadorData = { ...data, id: result.id, lineas_gratis: result.lineas_gratis };
            
            if (jugadorData.lineas_gratis > 0) {
                infoGratis.classList.remove('hidden');
                cantidadGratis.textContent = jugadorData.lineas_gratis;
            }

            // Transición a paso 2
            step1.classList.remove('active');
            step2.classList.add('active');
        } else {
            alert("Error al guardar datos. Revisa la conexión.");
            btn.disabled = false;
            btn.textContent = 'Continuar a Jugar 🚀';
        }
    } catch (error) {
        console.error(error);
        alert("Error de red.");
        btn.disabled = false;
        btn.textContent = 'Continuar a Jugar 🚀';
    }
});

// Paso 2: Seleccionar números
function toggleNumero(btn, num) {
    if (numerosSeleccionados.includes(num)) {
        // Deseleccionar
        numerosSeleccionados = numerosSeleccionados.filter(n => n !== num);
        btn.classList.remove('selected');
    } else {
        // Seleccionar (máximo 10)
        if (numerosSeleccionados.length < 10) {
            numerosSeleccionados.push(num);
            btn.classList.add('selected');
        } else {
            // Animación de error sutil si intenta elegir más de 10
            btn.style.transform = 'translateX(5px)';
            setTimeout(() => btn.style.transform = '', 100);
            return;
        }
    }

    contadorNumeros.textContent = numerosSeleccionados.length;
    
    if (numerosSeleccionados.length === 10) {
        btnAgregarLinea.disabled = false;
        btnAgregarLinea.classList.remove('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
        btnAgregarLinea.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
    } else {
        btnAgregarLinea.disabled = true;
        btnAgregarLinea.classList.add('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
        btnAgregarLinea.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
    }
}

// Guardar Línea (dentro de paso 2)
btnAgregarLinea.addEventListener('click', () => {
    if (numerosSeleccionados.length !== 10) return;

    // Ordenar números para que queden prolijos
    numerosSeleccionados.sort((a, b) => parseInt(a) - parseInt(b));
    lineasElegidas.push([...numerosSeleccionados]);
    
    // Actualizar UI
    actualizarListaLineas();
    
    // Resetear selección
    numerosSeleccionados = [];
    contadorNumeros.textContent = "0";
    document.querySelectorAll('.number-btn.selected').forEach(btn => btn.classList.remove('selected'));
    
    btnAgregarLinea.disabled = true;
    btnAgregarLinea.classList.add('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
    btnAgregarLinea.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
    
    document.getElementById('linea-actual').textContent = lineasElegidas.length + 1;
});

function actualizarListaLineas() {
    if (lineasElegidas.length > 0) {
        lineasGuardadasContainer.classList.remove('hidden');
    }
    
    listaLineas.innerHTML = '';
    lineasElegidas.forEach((linea, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-800/50 p-2 rounded';
        li.innerHTML = `<span>Línea ${index + 1}: <strong class="text-indigo-300 tracking-wider">${linea.join(' - ')}</strong></span>`;
        listaLineas.appendChild(li);
    });
}

// Ir al Checkout (Fin paso 2)
btnIrCheckout.addEventListener('click', async () => {
    btnIrCheckout.disabled = true;
    btnIrCheckout.textContent = 'Procesando...';

    // Preparar el string de lineas
    const lineasStrings = lineasElegidas.map(l => l.join(','));

    try {
        const res = await fetch('/api/jugadas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jugador_id: jugadorData.id,
                lineas: lineasStrings
            })
        });

        if (res.ok) {
            const result = await res.json();
            idsJugadas = result.ids;

            // Calcular totales
            let lineasPagas = lineasElegidas.length;
            let lineasGratisUsadas = 0;
            
            if (jugadorData.lineas_gratis > 0) {
                lineasGratisUsadas = Math.min(lineasPagas, jugadorData.lineas_gratis);
                lineasPagas -= lineasGratisUsadas;
                document.getElementById('resumen-descuento-container').classList.remove('hidden');
                document.getElementById('resumen-descuento').textContent = `-$${lineasGratisUsadas * PRECIO_LINEA}`;
            }

            const total = lineasPagas * PRECIO_LINEA;

            // Actualizar UI Checkout
            document.getElementById('resumen-cantidad').textContent = lineasElegidas.length;
            document.getElementById('resumen-total').textContent = `$${total}`;

            // Cambiar vista
            step2.classList.remove('active');
            step3.classList.add('active');
        } else {
            alert("Error al procesar jugadas.");
            btnIrCheckout.disabled = false;
            btnIrCheckout.textContent = 'Finalizar y Pagar ✅';
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión");
        btnIrCheckout.disabled = false;
        btnIrCheckout.textContent = 'Finalizar y Pagar ✅';
    }
});

// Paso 3: Enviar WhatsApp
btnWhatsapp.addEventListener('click', () => {
    if (!configuracionAdmin) return alert("Falta cargar configuración de admin");
    
    let total = 0;
    let lineasPagas = lineasElegidas.length;
    let lineasGratisUsadas = 0;
    if (jugadorData.lineas_gratis > 0) {
        lineasGratisUsadas = Math.min(lineasPagas, jugadorData.lineas_gratis);
        lineasPagas -= lineasGratisUsadas;
    }
    total = lineasPagas * PRECIO_LINEA;

    const idsFormateados = idsJugadas.join(', ');
    const mensaje = `Hola, soy ${jugadorData.nombre_completo}. Mi teléfono es ${jugadorData.telefono}.\nCargué las líneas #${idsFormateados}.\nEl total a pagar es $${total}.\nTe adjunto el comprobante de transferencia a ${configuracionAdmin.admin_alias}.`;
    
    const urlWa = `https://wa.me/${configuracionAdmin.admin_whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWa, '_blank');
});
