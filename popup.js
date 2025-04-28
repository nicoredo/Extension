// ======================
// Variables Globales
// ======================
const terminosMedicos = {
    antecedentes: new Set(),
    riesgo: new Set(),
    medicacion: new Set(),
    laboratorio: new Set()
  };
  
  let datosPaciente = {
    edad: 0,
    antecedentes: [],
    riesgo: [],
    medicacion: [],
    laboratorio: []
  };
  
  // ======================
  // Funciones Principales
  // ======================
  
  function mostrarDatos(datos = {}) {
    const datosCompletos = {
      edad: datos.edad || "No detectada",
      antecedentes: Array.isArray(datos.antecedentes) ? datos.antecedentes : [],
      riesgo: Array.isArray(datos.riesgo) ? datos.riesgo : [],
      medicacion: Array.isArray(datos.medicacion) ? datos.medicacion : [],
      laboratorio: Array.isArray(datos.laboratorio) ? datos.laboratorio : []
    };
  
    document.getElementById("edad-valor").textContent = datosCompletos.edad;
    document.getElementById("antecedentes-valor").textContent = datosCompletos.antecedentes.join(", ") || "-";
    document.getElementById("riesgo-valor").textContent = datosCompletos.riesgo.join(", ") || "-";
    document.getElementById("med-valor").textContent = datosCompletos.medicacion.join(", ") || "-";
    document.getElementById("lab-valor").textContent = datosCompletos.laboratorio.join(", ") || "-";
  }
  
  async function cargarTerminologia() {
    try {
      const response = await fetch(chrome.runtime.getURL('terminologia_medica.json'));
      const data = await response.json();
      
      Object.entries(data).forEach(([categoria, terminos]) => {
        Object.keys(terminos).forEach(termino => {
          terminosMedicos[categoria].add(termino.toLowerCase());
        });
      });
    } catch (error) {
      console.error("Error cargando terminología:", error);
    }
  }
  
  function configurarBotonesEdicion() {
    const campos = [
      { id: 'edad', esTexto: false, autocomplete: false },
      { id: 'antecedentes', esTexto: true, autocomplete: true },
      { id: 'riesgo', esTexto: true, autocomplete: true },
      { id: 'med', esTexto: true, autocomplete: true },
      { id: 'lab', esTexto: true, autocomplete: true }
    ];
  
    campos.forEach(({ id, esTexto, autocomplete }) => {
      const btnEditar = document.getElementById(`btn-editar-${id}`);
      const btnConfirmar = document.getElementById(`btn-confirmar-${id}`);
      const valorSpan = document.getElementById(`${id}-valor`);
      const input = document.getElementById(`${id}-input`);
      const wrapper = autocomplete ? document.getElementById(`${id}-autocomplete`) : null;
  
      if (!btnEditar || !btnConfirmar || !valorSpan || !input) {
        console.error(`Elementos no encontrados para ${id}`);
        return;
      }
  
      // --- EDITAR ---
      btnEditar.addEventListener('click', () => {
        valorSpan.style.display = 'none';
  
        if (autocomplete && wrapper) {
          wrapper.style.display = 'block';
          input.style.display = 'inline-block';
          document.getElementById(`${id}-suggestions`).innerHTML = ''; // limpiar sugerencias previas
        } else {
          input.style.display = 'inline-block';
        }
  
        btnEditar.style.display = 'none';
        btnConfirmar.style.display = 'inline-block';
  
        input.value = valorSpan.textContent !== '-' ? valorSpan.textContent : '';
        input.focus();
      });
  
      // --- CONFIRMAR ---
      btnConfirmar.addEventListener('click', () => {
        const nuevoValor = input.value.trim();
        valorSpan.textContent = nuevoValor || '-';
        valorSpan.style.display = 'inline';
  
        if (autocomplete && wrapper) {
          wrapper.style.display = 'none';
          input.style.display = 'none';
        } else {
          input.style.display = 'none';
        }
  
        btnConfirmar.style.display = 'none';
        btnEditar.style.display = 'inline-block';
  
        // Actualizar datos internos
        const valores = nuevoValor
          ? nuevoValor.split(',').map(s => s.trim()).filter(s => s)
          : [];
  
        if (id === 'edad') {
          datosPaciente.edad = parseFloat(nuevoValor) || 0;
        } else {
          datosPaciente[id === 'med' ? 'medicacion' : id === 'lab' ? 'laboratorio' : id] = valores;
        }
      });
    });
  }
  
  
  function inicializarAutocompletado() {
    const campos = [
      { id: 'antecedentes', tipo: 'antecedentes' },
      { id: 'riesgo', tipo: 'riesgo' },
      { id: 'med', tipo: 'medicacion' },
      { id: 'lab', tipo: 'laboratorio' }
    ];
  
    campos.forEach(({ id, tipo }) => {
      const input = document.getElementById(`${id}-input`);
      const suggestionsContainer = document.getElementById(`${id}-suggestions`);
  
      if (!input || !suggestionsContainer) {
        console.error(`Faltan elementos para ${id}`);
        return;
      }
  
      input.addEventListener('input', (e) => {
        const currentText = e.target.value;
        const lastTerm = currentText.split(',').pop().trim().toLowerCase();
        mostrarSugerencias(lastTerm, tipo, suggestionsContainer, input);
      });
  
      input.addEventListener('keydown', (e) => {
        if (e.key === ',') {
          setTimeout(() => {
            const currentText = input.value;
            const lastTerm = currentText.split(',').pop().trim().toLowerCase();
            mostrarSugerencias(lastTerm, tipo, suggestionsContainer, input);
          }, 10);
        }
      });
  
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
          suggestionsContainer.innerHTML = '';
        }
      });
    });
  }
  
  function mostrarSugerencias(searchTerm, tipo, container, input) {
    container.innerHTML = '';
    if (!searchTerm || searchTerm.length < 1) return;
  
    const sugerencias = Array.from(terminosMedicos[tipo]);
    const resultados = sugerencias
      .filter(term => term.includes(searchTerm))
      .slice(0, 8);
  
    resultados.forEach((term) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = tipo === 'laboratorio' ? `${term}: ` : term;
  
      item.addEventListener('click', () => {
        const currentText = input.value;
        const terms = currentText.split(',').map(t => t.trim());
        terms[terms.length - 1] = tipo === 'laboratorio' ? `${term}: ` : term;
        input.value = terms.join(', ') + (tipo !== 'laboratorio' ? ', ' : '');
        container.innerHTML = '';
        input.focus();
      });
  
      container.appendChild(item);
    });
  }
  
  
 // ======================
  // Evaluación de Paciente
  // ======================
  
  function evaluarPaciente() {
    // 1. Obtener y parsear datos estructurados del paciente
    const datosPaciente = {
        edad: parseFloat(document.getElementById('edad-valor').textContent) || 0,
        antecedentes: document.getElementById('antecedentes-valor').textContent
            .toLowerCase()
            .split(', ')
            .filter(x => x && x !== '-'),
        factores: document.getElementById('riesgo-valor').textContent
            .toLowerCase()
            .split(', ')
            .filter(x => x && x !== '-'),
        medicacion: document.getElementById('med-valor').textContent
            .toLowerCase()
            .split(', ')
            .filter(x => x && x !== '-'),
        laboratorio: parseLaboratorio(document.getElementById('lab-valor').textContent)
    };

    // 2. Cargar criterios de estudios
    fetch(chrome.runtime.getURL('criterios_estudios.json'))
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar criterios');
            return response.json();
        })
        .then(estudios => {
            const resultados = {};
            
            // 3. Evaluar cada estudio
            for (const [nombreEstudio, criterios] of Object.entries(estudios.estudios)) {
                resultados[nombreEstudio] = evaluarEstudioPriorizado(datosPaciente, criterios);
            }
            
            // 4. Mostrar resultados
            mostrarResultadosDetallados(resultados);
        })
        .catch(error => {
            console.error("Error en evaluación:", error);
            document.getElementById('resultado-evaluacion').innerHTML = 
                `<span class="excluido">Error al evaluar: ${error.message}</span>`;
        });
}

// Función auxiliar para parsear datos de laboratorio
function parseLaboratorio(textoLab) {
    const resultados = {};
    if (!textoLab || textoLab.trim() === '-' || textoLab.trim() === '') return resultados;

    textoLab.split(', ').forEach(item => {
        const [key, value] = item.split(':').map(part => part.trim());
        if (key && value) {
            const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
            if (!isNaN(numericValue)) {
                resultados[key.toLowerCase()] = numericValue;
            }
        }
    });
    return resultados;
}

// Función principal de evaluación priorizada
function evaluarEstudioPriorizado(datos, criterios) {
    const resultado = {
        estado: "no_cumple",
        faltantes: [],
        exclusiones: []
    };

    // Paso 1: Evaluar EXCLUSIONES (máxima prioridad)
    for (const [grupo, items] of Object.entries(criterios.exclusion || {})) {
        for (const item of items) {
            if (cumpleCriterio(datos, grupo, item)) {
                resultado.exclusiones.push(`${grupo}: ${item}`);
            }
        }
    }
    
    if (resultado.exclusiones.length > 0) {
        resultado.estado = "excluido";
        return resultado;
    }

    // Paso 2: Evaluar EDAD si existe como criterio
    if (criterios.inclusion.edad) {
        const cumpleEdad = criterios.inclusion.edad.some(item => 
            cumpleCriterio(datos, "edad", item)
        );
        if (!cumpleEdad) {
            resultado.faltantes.push(`Edad no cumple: ${criterios.inclusion.edad.join(' o ')}`);
            resultado.estado = "no_cumple";
            return resultado;
        }
    }

    // Paso 3: Evaluar criterios restantes
    const gruposEvaluar = ['antecedentes', 'factores', 'laboratorio'];
    let totalCumplidos = 0;
    let totalRequerido = 0;

    gruposEvaluar.forEach(grupo => {
        if (criterios.inclusion[grupo]) {
            criterios.inclusion[grupo].forEach(item => {
                totalRequerido++;
                if (cumpleCriterio(datos, grupo, item)) {
                    totalCumplidos++;
                } else {
                    resultado.faltantes.push(`${grupo}: ${item}`);
                }
            });
        }
    });

    // Determinar estado final
    if (totalCumplidos === totalRequerido) {
        resultado.estado = "cumple";
    } else if (totalCumplidos >= 2 && totalCumplidos >= totalRequerido * 0.5) {
        resultado.estado = "parcial";
    }

    return resultado;
}

// Función para evaluar criterios individuales
function cumpleCriterio(datos, grupo, criterio) {
    try {
        switch(grupo) {
            case 'edad':
                return evaluarRango(datos.edad, criterio);
                
            case 'laboratorio':
                return evaluarLaboratorio(datos.laboratorio, criterio);
                
            default: // Para antecedentes, factores, medicacion
                const regex = new RegExp(criterio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                return datos[grupo].some(item => regex.test(item));
        }
    } catch (error) {
        console.error(`Error evaluando criterio: ${grupo}=${criterio}`, error);
        return false;
    }
}

// Función para evaluar valores de laboratorio
function evaluarLaboratorio(labData, criterio) {
  const match = criterio.match(/(.+?)\s*(>=|<=|>|<|=)\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return false;

  const [_, parametroRaw, operador, valorStr] = match;
  const parametro = parametroRaw.trim().toLowerCase();
  const valorCriterio = parseFloat(valorStr.replace(',', '.'));
  const valorPaciente = labData[parametro];

  if (valorPaciente === undefined || isNaN(valorCriterio)) return false;

  switch (operador) {
    case '>': return valorPaciente > valorCriterio;
    case '<': return valorPaciente < valorCriterio;
    case '>=': return valorPaciente >= valorCriterio;
    case '<=': return valorPaciente <= valorCriterio;
    case '=': return valorPaciente === valorCriterio;
    default: return false;
  }
}


// Función para evaluar rangos de edad
function evaluarRango(edad, criterio) {
    if (criterio.includes('-')) {
        const [min, max] = criterio.split('-').map(Number);
        return !isNaN(min) && !isNaN(max) && edad >= min && edad <= max;
    }

    const match = criterio.match(/(>=|<=|>|<)\s*(\d+)/);
    if (match) {
        const [_, operador, valorStr] = match;
        const valor = Number(valorStr);
        if (isNaN(valor)) return false;
        
        switch(operador) {
            case '>': return edad > valor;
            case '<': return edad < valor;
            case '>=': return edad >= valor;
            case '<=': return edad <= valor;
        }
    }

    return edad === Number(criterio);
}

// Función para mostrar resultados
// Función para obtener los tooltips desde un archivo JSON local
function obtenerTooltips() {
  return new Promise((resolve, reject) => {
    const url = chrome.runtime.getURL('tooltips.json'); // Obtener la ruta local del archivo JSON
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText)); // Parsear el contenido JSON
      } else {
        reject('No se pudo cargar el archivo tooltips.json');
      }
    };

    xhr.onerror = function() {
      reject('Error en la solicitud XMLHttpRequest');
    };

    xhr.send();
  });
}

// Función para mostrar resultados detallados
// Función para obtener los tooltips desde un archivo JSON local
function obtenerTooltips() {
  return new Promise((resolve, reject) => {
    const url = chrome.runtime.getURL('tooltips.json'); // Obtener la ruta local del archivo JSON
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText)); // Parsear el contenido JSON
      } else {
        reject('No se pudo cargar el archivo tooltips.json');
      }
    };

    xhr.onerror = function() {
      reject('Error en la solicitud XMLHttpRequest');
    };

    xhr.send();
  });
}

// Función para mostrar resultados detallados
// Función para obtener los tooltips desde un archivo JSON local
function obtenerTooltips() {
  return new Promise((resolve, reject) => {
    const url = chrome.runtime.getURL('tooltips.json'); // Obtener la ruta local del archivo JSON
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText)); // Parsear el contenido JSON
      } else {
        reject('No se pudo cargar el archivo tooltips.json');
      }
    };

    xhr.onerror = function() {
      reject('Error en la solicitud XMLHttpRequest');
    };

    xhr.send();
  });
}

// Función para mostrar resultados detallados
async function mostrarResultadosDetallados(resultados) {
  const tooltips = await obtenerTooltips(); // Cargamos los tooltips localmente

  const contenedor = document.getElementById('resultado-evaluacion');
  contenedor.innerHTML = '';

  if (Object.keys(resultados).length === 0) {
    contenedor.innerHTML = '<span class="excluido">No se encontraron estudios para evaluar</span>';
    return;
  }

  for (const [estudio, resultado] of Object.entries(resultados)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'acordeon-estudio';

    const encabezado = document.createElement('div');
    encabezado.className = 'acordeon-titulo';
    encabezado.textContent = estudio;

    // Vinculamos el tooltip con el estudio
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltips[estudio] || 'Información no disponible'; // Si no hay tooltip, mostramos un texto por defecto.
    encabezado.appendChild(tooltip);

    const estado = document.createElement('span');
    estado.className = `estado ${resultado.estado}`;
    estado.textContent = resultado.estado === 'cumple'
      ? '✅ Cumple'
      : resultado.estado === 'parcial'
      ? '⚠️ Parcial'
      : resultado.estado === 'excluido'
      ? '❌ Excluido'
      : '❌ No cumple';

    encabezado.appendChild(estado);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'acordeon-cuerpo';
    cuerpo.style.display = 'none';

    // Detalles
    let html = '';
    if (resultado.exclusiones.length > 0) {
      html += `<p><strong>Excluido por:</strong> ${resultado.exclusiones.join(', ')}</p>`;
    } else if (resultado.faltantes.length > 0) {
      html += `<p><strong>Faltan:</strong> ${resultado.faltantes.join(', ')}</p>`;
    } else {
      html += `<p><strong>✔️ Cumple todos los criterios</strong></p>`;
    }

    cuerpo.innerHTML = html;

    // Toggle acordeón
    encabezado.addEventListener('click', () => {
      cuerpo.style.display = cuerpo.style.display === 'none' ? 'block' : 'none';
    });

    wrapper.appendChild(encabezado);
    wrapper.appendChild(cuerpo);
    contenedor.appendChild(wrapper);
  }
}


// Asignar evento al botón
document.getElementById('evaluar').addEventListener('click', evaluarPaciente);

  // ======================
  // Inicialización
  // ======================
  document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Minimizar
    document.getElementById('toggle-minimizar').addEventListener('click', () => {
      const contenido = document.getElementById('contenido-popup');
      const boton = document.getElementById('toggle-minimizar');
    
      if (contenido.style.display === 'none') {
        contenido.style.display = 'block';
        boton.textContent = '−';
      } else {
        contenido.style.display = 'none';
        boton.textContent = '+';
      }
    });
   
  
    // Cargar terminología médica
    await cargarTerminologia();
  
    // Configurar interfaz
    configurarBotonesEdicion();
    inicializarAutocompletado();
  
    // Inyectar content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      mostrarDatos({ edad: "Analizando...", antecedentes: ["Cargando datos"] });
    } catch (error) {
      console.error("Error:", error);
      mostrarDatos({ edad: "Error", antecedentes: ["Fallo al cargar"] });
    }
  
    // Evento evaluar
    document.getElementById('evaluar').addEventListener('click', evaluarPaciente);
  
    // Escuchar mensajes
    chrome.runtime.onMessage.addListener((message) => {
      if (message.tipo === 'datosExtraidos') {
        mostrarDatos(message.datos);
      }
    });
  });