// Lógica genérica de corrección para las unidades.
// Cada exercise es un <section class="exercise" data-exercise-name="..."
// data-activity-id="...(único en todo el sitio)"> que contiene inputs de
// texto con data-answers="opcion1|opcion2" y un botón [data-action="verificar"].
//
// Reglas de corrección: sin distinguir mayúsculas/minúsculas, ignorando
// espacios al inicio/fin. Se acepta cualquiera de las respuestas listadas
// en data-answers para ese input.

// ---- Fórmula institucional de la Nota 5 (Ebook), adaptada a Johao ----
// Meta: 65 actividades. El quiebre de 31 corresponde al mismo 9% que usa
// la planilla oficial (9% de 343 ≈ 31), expresado directamente en conteo
// en vez de porcentaje del libro completo.
const META_ACTIVIDADES = 65;
const QUIEBRE_ACTIVIDADES = 31;
const PROGRESO_PREFIX = "progreso::";
const RESPUESTAS_PREFIX = "respuestas::";
const FEEDBACK_PREFIX = "feedback::";

function notaCompletitud(actividadesHechas) {
  if (actividadesHechas >= META_ACTIVIDADES) return 7;
  if (actividadesHechas <= QUIEBRE_ACTIVIDADES) {
    return 1 + (actividadesHechas / QUIEBRE_ACTIVIDADES) * 3;
  }
  return 4 + ((actividadesHechas - QUIEBRE_ACTIVIDADES) / (META_ACTIVIDADES - QUIEBRE_ACTIVIDADES)) * 3;
}

function notaCorreccion(actividadesBuenas) {
  const porcentaje = (actividadesBuenas / META_ACTIVIDADES) * 100;
  const nota = porcentaje < 60 ? 1 + (porcentaje / 60) * 3 : 4 + ((porcentaje - 60) / 40) * 3;
  return Math.round(nota * 10) / 10;
}

function notaFinalEbook(actividadesHechas, actividadesBuenas) {
  return Math.round(((notaCompletitud(actividadesHechas) + notaCorreccion(actividadesBuenas)) / 2) * 10) / 10;
}

function normalizar(texto) {
  return texto.trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
}

// Cada actividad puede mezclar dos tipos de campo:
// - data-answers: se corrige solo (clave de respuestas).
// - data-freewrite: respuesta personal del estudiante, sin clave —
//   cuenta para completitud apenas está escrita, y su corrección la
//   entrega la docente manualmente en progreso.html.
function inputsAuto(seccion) {
  return Array.from(seccion.querySelectorAll("input[data-answers]"));
}

function inputsLibres(seccion) {
  return Array.from(seccion.querySelectorAll("input[data-freewrite]"));
}

function inputsActividad(seccion) {
  return [...inputsAuto(seccion), ...inputsLibres(seccion)];
}

function esCorrecta(input) {
  const respuestasValidas = input.dataset.answers.split("|").map(normalizar);
  return respuestasValidas.includes(normalizar(input.value));
}

function anunciar(regionId, mensaje) {
  const region = document.getElementById(regionId);
  if (!region) return;
  // Se limpia primero para forzar el anuncio incluso si el texto es igual
  // al anterior.
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = mensaje;
  }, 50);
}

function marcarInput(input, correcta) {
  const marca = input.parentElement.querySelector(".marca");
  input.classList.remove("correcto", "incorrecto");
  input.setAttribute("aria-invalid", correcta ? "false" : "true");
  if (correcta) {
    input.classList.add("correcto");
    if (marca) {
      marca.textContent = "✓ correcto";
      marca.className = "marca correcto-texto";
    }
  } else {
    input.classList.add("incorrecto");
    if (marca) {
      marca.textContent = "✗ revisa esta respuesta";
      marca.className = "marca incorrecto-texto";
    }
  }
}

function verificarEjercicio(seccion, { moverFoco = true } = {}) {
  const auto = inputsAuto(seccion);
  let correctas = 0;
  const incorrectos = [];
  auto.forEach((input) => {
    const ok = esCorrecta(input);
    marcarInput(input, ok);
    if (ok) {
      correctas += 1;
    } else {
      incorrectos.push(input);
    }
  });

  const libres = inputsLibres(seccion);
  const nombre = seccion.dataset.exerciseName || "Ejercicio";
  const resultadoEl = seccion.querySelector(".resultado-ejercicio");
  let mensaje;
  if (auto.length > 0 && libres.length > 0) {
    mensaje = `${nombre}: ${correctas} de ${auto.length} respuestas correctas. Las respuestas personales las revisa la profesora.`;
  } else if (auto.length > 0) {
    mensaje = `${nombre}: ${correctas} de ${auto.length} respuestas correctas.`;
  } else {
    mensaje = `${nombre}: actividad de respuesta personal, la corrección la entrega la profesora.`;
  }
  if (resultadoEl) resultadoEl.textContent = mensaje;

  const regionId = seccion.dataset.liveRegion || "estado-global";

  if (moverFoco && incorrectos.length > 0) {
    incorrectos[0].focus();
    // Se retrasa el anuncio un poco más que lo normal para que no se
    // superponga con lo que NVDA anuncia al mover el foco al campo.
    window.setTimeout(() => {
      anunciar(regionId, `${mensaje} Se movió el cursor a la primera respuesta por revisar.`);
    }, 250);
  } else {
    anunciar(regionId, mensaje);
  }

  return { correctas, total: auto.length };
}

// ---- Persistencia en localStorage (por actividad, identificada con
// data-activity-id, único en todo el sitio) ----

function guardarEnStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (err) {
    // localStorage puede fallar (modo privado, cuota llena, navegador
    // bloqueado); no debe interrumpir el uso normal de la actividad.
    return false;
  }
}

function leerDeStorage(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch (err) {
    return porDefecto;
  }
}

function guardarRespuestas(seccion) {
  const activityId = seccion.dataset.activityId;
  if (!activityId) return;
  const valores = {};
  inputsActividad(seccion).forEach((input) => {
    valores[input.id] = input.value;
  });
  guardarEnStorage(RESPUESTAS_PREFIX + activityId, valores);
}

function restaurarRespuestas(seccion) {
  const activityId = seccion.dataset.activityId;
  if (!activityId) return;
  const valores = leerDeStorage(RESPUESTAS_PREFIX + activityId, {});
  inputsActividad(seccion).forEach((input) => {
    if (valores[input.id] !== undefined) {
      input.value = valores[input.id];
    }
  });
}

function guardarProgresoActividad(seccion) {
  const activityId = seccion.dataset.activityId;
  if (!activityId) return;
  const auto = inputsAuto(seccion);
  const libres = inputsLibres(seccion);
  const todos = [...auto, ...libres];
  const respondidos = todos.filter((input) => input.value.trim().length > 0).length;
  const hecha = todos.length > 0 && respondidos === todos.length;
  const correctasAuto = hecha ? auto.filter(esCorrecta).length : 0;

  guardarEnStorage(PROGRESO_PREFIX + activityId, {
    unidad: document.title,
    nombreActividad: seccion.dataset.exerciseName || activityId,
    hecha,
    totalAuto: auto.length,
    correctasAuto,
    totalLibre: libres.length,
  });
}

function actualizarProgreso(seccion) {
  guardarRespuestas(seccion);
  guardarProgresoActividad(seccion);
}

function leerFeedbackLibre(activityId) {
  return leerDeStorage(FEEDBACK_PREFIX + activityId, { correctasLibre: 0 });
}

function guardarFeedbackLibre(activityId, correctasLibre) {
  guardarEnStorage(FEEDBACK_PREFIX + activityId, { correctasLibre });
}

function listarProgresoGlobal() {
  const resultados = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.indexOf(PROGRESO_PREFIX) === 0) {
      const datos = leerDeStorage(key, null);
      if (datos) {
        resultados.push({ id: key.slice(PROGRESO_PREFIX.length), ...datos });
      }
    }
  }
  return resultados.sort((a, b) => a.id.localeCompare(b.id));
}

function obtenerInputsConError() {
  return Array.from(document.querySelectorAll(".exercise input[data-answers]")).filter(
    (input) => !esCorrecta(input)
  );
}

function etiquetaDeInput(input) {
  const seccion = input.closest(".exercise");
  const nombreEjercicio = seccion ? seccion.dataset.exerciseName : "";
  const etiqueta = input.labels && input.labels[0] ? input.labels[0].textContent.trim() : "";
  return [nombreEjercicio, etiqueta].filter(Boolean).join(" — ");
}

function irAlSiguienteError() {
  const errores = obtenerInputsConError();

  if (errores.length === 0) {
    anunciar("estado-global", "No quedan errores. ¡Bien hecho!");
    return;
  }

  const indiceActivo = errores.indexOf(document.activeElement);
  const siguienteIndice = indiceActivo === -1 ? 0 : (indiceActivo + 1) % errores.length;
  const siguiente = errores[siguienteIndice];

  siguiente.focus();
  anunciar(
    "estado-global",
    `Error ${siguienteIndice + 1} de ${errores.length}. ${etiquetaDeInput(siguiente)}`
  );
}

function calcularResumenGlobal() {
  const secciones = Array.from(document.querySelectorAll(".exercise"));
  const lineas = [];
  let totalCorrectas = 0;
  let totalPreguntas = 0;
  let totalLibrePendiente = 0;

  secciones.forEach((seccion) => {
    const auto = inputsAuto(seccion);
    const libres = inputsLibres(seccion);
    const correctas = auto.filter(esCorrecta).length;
    totalCorrectas += correctas;
    totalPreguntas += auto.length;
    totalLibrePendiente += libres.length;
    const nombre = seccion.dataset.exerciseName || "Ejercicio";
    lineas.push(
      auto.length > 0
        ? `${nombre}: ${correctas}/${auto.length}${libres.length > 0 ? " (+ respuesta personal, revisión docente pendiente)" : ""}`
        : `${nombre}: respuesta personal, revisión docente pendiente`
    );
  });

  const porcentaje = totalPreguntas > 0
    ? Math.round((totalCorrectas / totalPreguntas) * 100)
    : 0;

  return { lineas, totalCorrectas, totalPreguntas, porcentaje, totalLibrePendiente };
}

function mostrarResumenFinal() {
  // Verificar visualmente cada ejercicio también, para que las marcas
  // individuales queden actualizadas antes de mostrar el resumen.
  document.querySelectorAll(".exercise").forEach((seccion) =>
    verificarEjercicio(seccion, { moverFoco: false })
  );

  const { lineas, totalCorrectas, totalPreguntas, porcentaje, totalLibrePendiente } = calcularResumenGlobal();
  const tituloUnidad = document.title;

  const texto = [
    `Resumen — ${tituloUnidad}`,
    ...lineas,
    `Total auto-corregido: ${totalCorrectas}/${totalPreguntas} (${porcentaje}%)`,
    ...(totalLibrePendiente > 0
      ? [`Respuestas personales pendientes de revisión docente: ${totalLibrePendiente}`]
      : []),
  ].join("\n");

  const contenedor = document.getElementById("resumen-final");
  const salida = document.getElementById("resumen-texto");
  const encabezado = document.getElementById("resumen-titulo");

  salida.textContent = texto;
  contenedor.hidden = false;

  anunciar(
    "estado-global",
    `Resumen listo. Puntaje total: ${totalCorrectas} de ${totalPreguntas}, ${porcentaje} por ciento.`
  );

  // Foco automático al resumen, como está definido para el cierre de
  // actividad.
  encabezado.setAttribute("tabindex", "-1");
  encabezado.focus();
}

async function copiarResumen() {
  const texto = document.getElementById("resumen-texto").textContent;
  const estadoCopia = document.getElementById("estado-copia");
  try {
    await navigator.clipboard.writeText(texto);
    estadoCopia.textContent = "Resumen copiado al portapapeles.";
  } catch (err) {
    // Respaldo si el navegador bloquea la API de portapapeles.
    const areaTemporal = document.createElement("textarea");
    areaTemporal.value = texto;
    document.body.appendChild(areaTemporal);
    areaTemporal.select();
    document.execCommand("copy");
    document.body.removeChild(areaTemporal);
    estadoCopia.textContent = "Resumen copiado al portapapeles.";
  }
  anunciar("estado-global", "Resumen copiado al portapapeles.");
}

function calcularYMostrarProgreso() {
  const tabla = document.getElementById("tabla-actividades");
  if (!tabla) return;

  const actividades = listarProgresoGlobal();
  tabla.innerHTML = "";

  let hechas = 0;
  let sumaBuenas = 0;

  actividades.forEach((act) => {
    const totalAuto = act.totalAuto || 0;
    const totalLibre = act.totalLibre || 0;
    const total = totalAuto + totalLibre;
    const feedback = totalLibre > 0 ? leerFeedbackLibre(act.id) : { correctasLibre: 0 };
    const correctasLibre = Math.min(feedback.correctasLibre || 0, totalLibre);
    const correctas = (act.correctasAuto || 0) + correctasLibre;
    const fraccion = act.hecha && total > 0 ? correctas / total : 0;

    if (act.hecha) {
      hechas += 1;
      sumaBuenas += fraccion;
    }

    const fila = document.createElement("tr");

    const celdaNombre = document.createElement("td");
    celdaNombre.textContent = `${act.unidad || ""} — ${act.nombreActividad || act.id}`;

    const celdaEstado = document.createElement("td");
    celdaEstado.textContent = act.hecha ? "Hecha" : "Pendiente";

    const celdaCorrectas = document.createElement("td");
    if (!act.hecha) {
      celdaCorrectas.textContent = "—";
    } else if (totalLibre === 0) {
      celdaCorrectas.textContent = `${correctas}/${total}`;
    } else {
      // Fila con actividad de respuesta personal: se muestra lo
      // auto-corregido (si hay) y un campo editable para que la
      // profesora ingrese cuántas de las respuestas personales están
      // buenas, de un total de totalLibre.
      const partes = [];
      if (totalAuto > 0) partes.push(`${act.correctasAuto || 0}/${totalAuto} auto`);
      partes.push("personal:");
      celdaCorrectas.append(document.createTextNode(partes.join(" ") + " "));

      const inputFeedback = document.createElement("input");
      inputFeedback.type = "number";
      inputFeedback.min = "0";
      inputFeedback.max = String(totalLibre);
      inputFeedback.value = String(correctasLibre);
      inputFeedback.style.width = "4em";
      inputFeedback.setAttribute(
        "aria-label",
        `Cuántas respuestas personales buenas de ${totalLibre}, para ${act.nombreActividad || act.id}`
      );
      inputFeedback.addEventListener("change", () => {
        let valor = parseInt(inputFeedback.value, 10);
        if (Number.isNaN(valor) || valor < 0) valor = 0;
        if (valor > totalLibre) valor = totalLibre;
        inputFeedback.value = String(valor);
        guardarFeedbackLibre(act.id, valor);
        calcularYMostrarProgreso();
      });

      celdaCorrectas.appendChild(inputFeedback);
      celdaCorrectas.append(document.createTextNode(` de ${totalLibre}`));
    }

    fila.append(celdaNombre, celdaEstado, celdaCorrectas);
    tabla.appendChild(fila);
  });

  const totalesEl = document.getElementById("totales");
  if (totalesEl) {
    totalesEl.textContent = actividades.length === 0
      ? "Todavía no hay actividades registradas. Completa alguna unidad primero."
      : `Actividades hechas: ${hechas} de ${META_ACTIVIDADES} requeridas. Suma de actividades "buenas": ${sumaBuenas.toFixed(2)} de ${META_ACTIVIDADES}.`;
  }

  const nc = notaCompletitud(hechas);
  const ncorr = notaCorreccion(sumaBuenas);
  const notaFinal = notaFinalEbook(hechas, sumaBuenas);

  const resultado = document.getElementById("resultado-nota");
  const notaTexto = document.getElementById("nota-texto");
  if (resultado && notaTexto) {
    notaTexto.textContent = [
      `Actividades hechas: ${hechas} de ${META_ACTIVIDADES}`,
      `Nota de completitud: ${nc.toFixed(1)}`,
      `Nota de corrección: ${ncorr.toFixed(1)}`,
      `Nota 5 (Ebook) estimada: ${notaFinal.toFixed(1)}`,
    ].join("\n");
    resultado.hidden = false;
  }

  anunciar("estado-global", `Nota 5 estimada: ${notaFinal.toFixed(1)}. Actividades hechas: ${hechas} de ${META_ACTIVIDADES}.`);
}

async function copiarNota() {
  const texto = document.getElementById("nota-texto").textContent;
  const estado = document.getElementById("estado-copia-nota");
  try {
    await navigator.clipboard.writeText(texto);
  } catch (err) {
    const areaTemporal = document.createElement("textarea");
    areaTemporal.value = texto;
    document.body.appendChild(areaTemporal);
    areaTemporal.select();
    document.execCommand("copy");
    document.body.removeChild(areaTemporal);
  }
  if (estado) estado.textContent = "Resultado copiado al portapapeles.";
  anunciar("estado-global", "Resultado copiado al portapapeles.");
}

document.addEventListener("DOMContentLoaded", () => {
  // Restaurar respuestas guardadas de sesiones anteriores y dejar
  // guardando el progreso automáticamente en cada cambio.
  document.querySelectorAll(".exercise[data-activity-id]").forEach((seccion) => {
    restaurarRespuestas(seccion);
    actualizarProgreso(seccion);
    inputsActividad(seccion).forEach((input) => {
      input.addEventListener("input", () => actualizarProgreso(seccion));
    });
  });

  document.querySelectorAll('[data-action="verificar"]').forEach((boton) => {
    boton.addEventListener("click", () => {
      const seccion = boton.closest(".exercise");
      verificarEjercicio(seccion);
      actualizarProgreso(seccion);
    });
  });

  const botonSiguienteError = document.getElementById("boton-siguiente-error");
  if (botonSiguienteError) {
    botonSiguienteError.addEventListener("click", irAlSiguienteError);
  }

  const botonResumen = document.getElementById("boton-resumen");
  if (botonResumen) {
    botonResumen.addEventListener("click", mostrarResumenFinal);
  }

  const botonCopiar = document.getElementById("boton-copiar");
  if (botonCopiar) {
    botonCopiar.addEventListener("click", copiarResumen);
  }

  // Página progreso.html
  const botonCalcular = document.getElementById("boton-calcular");
  if (botonCalcular) {
    botonCalcular.addEventListener("click", calcularYMostrarProgreso);
    calcularYMostrarProgreso();
  }

  const botonCopiarNota = document.getElementById("boton-copiar-nota");
  if (botonCopiarNota) {
    botonCopiarNota.addEventListener("click", copiarNota);
  }
});
