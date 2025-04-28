fetch(chrome.runtime.getURL('terminologia_medica.json'))
  .then(response => response.json())
  .then(terminologia => {
    const categorias = Object.keys(terminologia);
    const encabezados = {
      antecedentes: /\b(AP:|Antec(?:edentes)?(?: de)?:)/i,
      riesgo: /\b(FR:|Factores de riesgo:)/i,
      medicacion: /\b(MH:|Med(?:icación)?(?: habitual)?:)/i,
      laboratorio: /\b(Lab:|Labo:)/i
    };

        // 1. Definir contieneNegacion en el ámbito correcto
function contieneNegacion(oracion, termino) {
  const negaciones = ["no", "niega", "sin", "ausencia de", "negativo para"];
  const afirmaciones = ["sí", "si", "presenta", "refiere", "con", "diagnosticado de"];
  const reversores = ["pero", "aunque", "sin embargo", "no obstante"];
  
  const separadores = /[,;]|(?:\bpero\b|\baunque\b|\bsin embargo\b|\bno obstante\b)/i;
  const partes = oracion.toLowerCase().split(separadores); // Cortamos la oración en segmentos.
  const terminoLower = termino.toLowerCase();
  
  let negado = false;  // Esto guardará el estado de la negación

  // Iteramos por cada segmento
  for (const parte of partes) {
    const palabras = parte.trim().split(/\s+/);
    
    // Iteramos por cada palabra en el segmento
    for (let i = 0; i < palabras.length; i++) {
      const palabra = palabras[i];
    
      // Verificamos si encontramos una negación
      if (negaciones.includes(palabra)) {
        negado = true;
      } else if (afirmaciones.includes(palabra)) {
        negado = false;  // Si encontramos una afirmación, la negación se anula
      } else if (reversores.includes(palabra)) {
        negado = false;  // Reversores como "pero" o "aunque" también anulan la negación
      }
      
      // Verificamos si encontramos el término dentro de esa sección
      if (palabra === terminoLower) {
        return negado; // Devolvemos si estaba negado justo en ese momento
      }
    }
  }
  
  return false;  // Si no encontramos el término o no estaba negado
}

    // 2. Extracción de edad
    function extraerEdad(texto) {
      const regexEdad = /(?:Edad|Años|Paciente)\s*[:=]?\s*(\d+)|(\d+)\s*(?:años|y)/i;
      const match = texto.match(regexEdad);
      return match ? (match[1] || match[2]) : "No detectada";
    }

    // 3. Extracción de bloques
    function extraerBloquesPorEncabezado(texto) {
      const bloques = {};
      let actual = null;
      texto.split(/\n|\r/).forEach(linea => {
        linea = linea.trim();
        if (!linea) return;

        for (const [cat, regex] of Object.entries(encabezados)) {
          if (regex.test(linea)) {
            actual = cat;
            bloques[cat] = [];
            linea = linea.replace(regex, "").trim();
            break;
          }
        }
        if (actual && linea) bloques[actual].push(linea);
      });
      return bloques;
    }

    // 4. Búsqueda de términos
    function buscarTerminos(texto, categoria) {
      const encontrados = new Set();
      if (!texto) return [];

      texto.split(/(?<=[.!?])/).forEach(oracion => {
        for (const [base, sinonimos] of Object.entries(terminologia[categoria])) {
          const patrones = [base, ...sinonimos];
          patrones.forEach(termino => {
            const regex = new RegExp(`\\b${termino}\\b`, "i");
            if (regex.test(oracion) && !contieneNegacion(oracion, termino)) {
              encontrados.add(base);
            }
          });
        }
      });
      return Array.from(encontrados);
    }

    // 5. Búsqueda de laboratorios
    function buscarLaboratorio(texto) {
      const resultados = [];
      if (!texto) return [];

      for (const [base, sinonimos] of Object.entries(terminologia.laboratorio)) {
        const patrones = [base, ...sinonimos];
        patrones.forEach(sin => {
          const regex = new RegExp(`\\b${sin}\\b[\\s:]*([\\d.,]+\\s*(?:mg/dL|mmol/L)?)`, "gi");
          let match;
          while ((match = regex.exec(texto))) {
            resultados.push(`${base}: ${match[1] || '--'}`);
          }
        });
      }
      return resultados;
    }

    // 6. Función principal
    function extraerDatos(texto) {
      const bloques = extraerBloquesPorEncabezado(texto);
      return {
        edad: extraerEdad(texto),
        antecedentes: buscarTerminos(bloques.antecedentes?.join(" ") || texto, "antecedentes"),
        riesgo: buscarTerminos(bloques.riesgo?.join(" ") || texto, "riesgo"),
        medicacion: buscarTerminos(bloques.medicacion?.join(" ") || texto, "medicacion"),
        laboratorio: buscarLaboratorio(bloques.laboratorio?.join(" ") || texto)
      };
    }

    // --- Ejecución principal ---
    const textoHC = document.body.innerText;
    try {
      const datosExtraidos = extraerDatos(textoHC);
      console.log("Datos extraídos:", datosExtraidos);
      chrome.runtime.sendMessage({ 
        tipo: 'datosExtraidos', 
        datos: datosExtraidos,
        metadata: {
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error al extraer datos:", error);
      chrome.runtime.sendMessage({ 
        tipo: 'error', 
        mensaje: "Falló la extracción de datos",
        error: error.message 
      });
    }
  })
  .catch(error => {
    console.error("Error al cargar terminología médica:", error);
  });