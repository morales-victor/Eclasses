// Lógica genérica de corrección para las unidades.
// Cada exercise es un <section class="exercise" data-exercise-name="...">
// que contiene inputs de texto con data-answers="opcion1|opcion2" y un
// botón [data-action="verificar"].
//
// Reglas de corrección: sin distinguir mayúsculas/minúsculas, ignorando
// espacios al inicio/fin. Se acepta cualquiera de las respuestas listadas
// en data-answers para ese input.

function normalizar(texto) {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
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

function verificarEjercicio(seccion) {
  const inputs = Array.from(seccion.querySelectorAll("input[data-answers]"));
  let correctas = 0;
  inputs.forEach((input) => {
    const ok = esCorrecta(input);
    marcarInput(input, ok);
    if (ok) correctas += 1;
  });

  const nombre = seccion.dataset.exerciseName || "Ejercicio";
  const resultadoEl = seccion.querySelector(".resultado-ejercicio");
  const mensaje = `${nombre}: ${correctas} de ${inputs.length} respuestas correctas.`;
  if (resultadoEl) resultadoEl.textContent = mensaje;

  const regionId = seccion.dataset.liveRegion || "estado-global";
  anunciar(regionId, mensaje);

  return { correctas, total: inputs.length };
}

function calcularResumenGlobal() {
  const secciones = Array.from(document.querySelectorAll(".exercise"));
  const lineas = [];
  let totalCorrectas = 0;
  let totalPreguntas = 0;

  secciones.forEach((seccion) => {
    const inputs = Array.from(seccion.querySelectorAll("input[data-answers]"));
    const correctas = inputs.filter(esCorrecta).length;
    totalCorrectas += correctas;
    totalPreguntas += inputs.length;
    const nombre = seccion.dataset.exerciseName || "Ejercicio";
    lineas.push(`${nombre}: ${correctas}/${inputs.length}`);
  });

  const porcentaje = totalPreguntas > 0
    ? Math.round((totalCorrectas / totalPreguntas) * 100)
    : 0;

  return { lineas, totalCorrectas, totalPreguntas, porcentaje };
}

function mostrarResumenFinal() {
  // Verificar visualmente cada ejercicio también, para que las marcas
  // individuales queden actualizadas antes de mostrar el resumen.
  document.querySelectorAll(".exercise").forEach(verificarEjercicio);

  const { lineas, totalCorrectas, totalPreguntas, porcentaje } = calcularResumenGlobal();
  const tituloUnidad = document.title;

  const texto = [
    `Resumen — ${tituloUnidad}`,
    ...lineas,
    `Total: ${totalCorrectas}/${totalPreguntas} (${porcentaje}%)`,
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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[data-action="verificar"]').forEach((boton) => {
    boton.addEventListener("click", () => {
      const seccion = boton.closest(".exercise");
      verificarEjercicio(seccion);
    });
  });

  const botonResumen = document.getElementById("boton-resumen");
  if (botonResumen) {
    botonResumen.addEventListener("click", mostrarResumenFinal);
  }

  const botonCopiar = document.getElementById("boton-copiar");
  if (botonCopiar) {
    botonCopiar.addEventListener("click", copiarResumen);
  }
});
