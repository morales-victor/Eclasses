# Contexto del proyecto — Plataforma accesible de inglés para Johao Carrión

Lee este documento completo antes de modificar o agregar cualquier archivo.
Este proyecto tiene reglas no negociables y convenciones descubiertas a lo
largo de muchas iteraciones de prueba real con NVDA — varias no son obvias
mirando solo el código, y romperlas degrada la accesibilidad real para un
estudiante ciego que depende de esto para su nota del ramo.

## Qué es esto

Plataforma web HTML/CSS/JS plano que reemplaza el Ebook de Oxford (American
English File) para Johao Carrión, estudiante con ceguera total de Duoc UC
(curso INPV311, inglés). El Ebook no es compatible con NVDA; esta plataforma
sí. Se construye unidad por unidad, siguiendo el "File" (1A, 1B, 1C, 2A...)
de la hoja de ruta oficial del curso.

## Reglas técnicas no negociables

- HTML/CSS/JS plano. **Nunca** React, Vite, ni nada que re-renderice el DOM
  dinámicamente — rompe el foco y los anuncios del lector de pantalla.
- Formularios con `<input>` nativos. Nunca simular controles con `<div>`/`<span>` + JS.
- Sitio multi-página tradicional (un `.html` por File), no SPA.
- Hosting: GitHub Pages, deploy from branch, root del repo.
- Español de Chile, sin voseo, en todo el contenido de instrucciones.

## Archivos del proyecto

- `index.html` — menú de unidades + sección "Cómo funciona cada unidad" +
  sección de atajos de NVDA recomendados.
- `file-XX.html` — una por cada File del curso (file-1a.html, file-1b.html...).
- `style.css` — estilos compartidos.
- `script.js` — toda la lógica: corrección, persistencia, cálculo de nota,
  respaldo. Compartido por todas las páginas.
- `progreso.html` — agregador de progreso de todas las unidades + cálculo
  de Nota 5 + respaldo/restauración.

## Reglas de accesibilidad descubiertas (NO repetir estos errores)

1. **Nunca mayúsculas para dar énfasis.** NVDA/eSpeak lee una palabra toda
   en mayúscula como sigla, letra por letra ("IS" → "i, ese"). Usar
   `<strong>` para énfasis visual real.
2. **Títulos abreviados con punto (Mr., Mrs., Ms., Dr., St.) deben
   escribirse completos en inglés** ("Missus", "Mister", "Doctor") — eSpeak
   NG no los expande y los deletrea letra por letra.
3. **`lang="en"` debe envolver *solo* el fragmento en inglés, nunca texto
   en español dentro del mismo span.** Si mezclas, NVDA intenta leer las
   palabras en español con fonética inglesa (o viceversa) y suena
   irreconocible. Nunca uses `lang="en"` en un span cuyo contenido
   incluya palabras en español.
4. **Todo `<input>` de respuesta en inglés lleva `lang="en"` directamente
   en el input** (no solo en el texto de alrededor) — lo que el lector
   anuncia de vuelta al escribir es el *valor* del campo, que no hereda
   idioma de otro lado.
5. **Nombre accesible de cada campo en blanco**: usar
   `<span id="X-lbl" class="sr-only" aria-hidden="true">Espacio N</span>`
   + `<input aria-labelledby="X-lbl">`, **no** un `<label>` nativo. Un
   `<label>` normal SÍ se lee como texto de corrido durante lectura lineal
   (Say All / flechas), sonando intercalado y confuso en medio de la
   oración. El span oculto con `aria-hidden="true"` referenciado por
   `aria-labelledby` resuelve esto: no se lee de corrido, pero sí se anuncia
   al llegar al campo por Tab. El número "Espacio N" reinicia en cada
   ejercicio (sección `.exercise`), no es corrido en toda la unidad. El
   texto de estos spans debe ir **solo en español** — ver regla 3.
6. **Símbolos matemáticos (+, =) no activan el cambio de idioma** porque no
   tienen letras — un lector puede leerlos en español aunque estén dentro de
   un `lang="en"`. Si hay que practicar sumas, escribir la operación
   completa en palabras en inglés ("Twenty plus ten is ___"), nunca con
   símbolos.
7. **Nunca dejar comentarios HTML ni texto visible que revele qué se
   adaptó, reemplazó o simplificó** del material original (el estudiante no
   debe enterarse de que algo fue cambiado por su condición). Explicaciones
   de ese tipo van en la conversación con el profesor, nunca en el código
   entregado.
8. **Guion normal del teclado (-), nunca guion largo (–)** en ningún lado —
   si alguna vez se usa como respuesta esperada (ver File 2A, ítems de
   "a/an" sin artículo), el guion largo no coincide con lo que el teclado
   produce.

## Lógica de corrección (en `script.js`)

- `normalizar()`: minúsculas, sin espacios extra, guiones tratados igual
  que espacios ("twenty-one" = "twenty one"), signo de interrogación
  ignorado.
- `esCorrecta()`: coincidencia exacta tras normalizar, **o** tolerancia a
  **un** error de tipeo (distancia de edición ≤ 1) — pero solo en
  respuestas de **5 o más letras**, para no arriesgar que una palabra corta
  distinta (ej. "is" vs "as") pase como buena.
- Cada `<input>` de respuesta cerrada lleva `data-answers="opcion1|opcion2"`
  (varias opciones separadas por `|`).
- Actividades de **respuesta personal / escritura libre** (sin una
  respuesta única correcta) usan `data-freewrite="true"` en vez de
  `data-answers`. Cuentan como "hecha" al completarse, pero su corrección
  queda pendiente de revisión manual de la docente en `progreso.html`
  (hay un campo numérico ahí para ingresar cuántas están buenas).
- `contextoDeInput()`: arma la oración completa de contexto (con el campo
  marcado como "___") para los anuncios de "Verificar" y "Ir al siguiente
  error" — así el estudiante sabe a qué pregunta corresponde el error sin
  tener que releer manualmente.

## Sistema de nota (Nota 5 / Ebook)

- Meta fija: **65 actividades** completadas (mismo número absoluto exigido
  a cualquier estudiante del curso, no un porcentaje relativo a cuántas
  actividades tenga esta plataforma).
- Quiebre en 31 (corresponde al mismo 9% que usa la planilla oficial del
  Programa de Inglés, aplicado directamente como conteo).
- Fórmulas en `script.js`: `notaCompletitud()`, `notaCorreccion()`,
  `notaFinalEbook()`. No modificar sin volver a validar contra la fórmula
  oficial del Programa de Inglés (Excel que maneja Nancy/el Programa).
- Una "actividad" = un `<section class="exercise">` completo (no cada
  blank individual). Se cuenta "hecha" cuando *todos* sus campos (incluidos
  los de escritura libre) tienen algo escrito.
- Progreso guardado en `localStorage` del navegador — **riesgo conocido**:
  el notebook que Duoc le entregará a Johao puede tener un "soft reset" al
  apagarse que borre el perfil del navegador. Pendiente confirmar con TI de
  Duoc el alcance exacto. Mientras tanto, `progreso.html` tiene botones de
  descargar/restaurar respaldo (`.json`) como mitigación manual.

## Política de contenido (qué construir y qué no)

- Solo se construye contenido marcado **KC** en la hoja de ruta del curso;
  el contenido **SC** no se enseña ni se evalúa.
- Files 100% SC (sin ningún KC) se excluyen completos: **2C, 4A, 6A, 6C**.
- Cuando un File tiene KC sin ningún ejercicio que lo evalúe en el PDF
  original, se construye un ejercicio propio — usando vocabulario que ya
  aparece en la teoría de ese mismo eclass, nunca vocabulario nuevo sin
  avisar. Ejemplos ya resueltos así: plurales en File 2A, colores y
  modifiers en File 2B, verb phrases en File 3A.
- Ejercicios que dependen de **ver una imagen** para responder (fotos,
  banderas, crucigramas, sopas de letras) se reemplazan por una pista de
  texto equivalente en español — nunca se intenta adivinar qué imagen es
  sin tener certeza real de qué muestra.
- Preguntas que en el PDF piden "arma la pregunta y respóndela" se
  simplifican a **solo armar la pregunta** (se quita la parte de responder
  sobre uno mismo) — se determinó que pedir ambas cosas a la vez era
  demasiada carga cognitiva.
- No se agrega ningún resumen teórico largo al principio de cada unidad —
  en su lugar, un cuadro corto "Recuerda:" (clase CSS `.nota`) justo antes
  de cada ejercicio, con solo la lista/patrón mínimo necesario (no
  explicación extensa). Decisión explícita de la docente: los estudiantes
  videntes tienen el libro/pizarra a mano mientras hacen el Ebook: esto
  reemplaza esa referencia visual rápida, sin ser una clase completa.

## Estado actual de construcción

**Completos:** File 1A, 1B, 1C, 2A, 2B, 3A, 3B, 3C.

**Pendientes según hoja de ruta (tienen KC):** File 4B, 4C, 5A, 5B, 5C, 6B.

**Excluidos (100% SC, no construir):** File 2C, 4A, 6A, 6C.

**Decisiones pendientes de resolver antes de construir esos Files:**
- **File 5A**: el KC real es solo "Verb phrases"; "Can/can't" es SC pero es
  el único vehículo del eclass original para enseñar esas verb phrases. Se
  decidió construir un ejercicio de vocabulario de habilidades que NO pase
  por la estructura can/can't (en vez de usar el eclass tal cual).
- **File 5C**: el KC pide "weather and seasons" pero el eclass original no
  tiene absolutamente nada de ese contenido — hay que conseguir o crear
  ese material desde cero, no existe fuente qué adaptar.

## Convención de nombres

Las páginas se llaman "File 1A", "File 1B", etc. — **nunca** "Unidad N". En
el curso real, "Unidad" agrupa 3 Files (A, B, C), así que usar "Unidad" para
referirse a un solo File es incorrecto y confuso para cualquiera que compare
con la hoja de ruta oficial.

## Protocolo de testing

Cada pieza de contenido nueva se prueba con NVDA real (eSpeak NG, con
"Automatic language switching" activado, package de idioma español
instalado en Windows con componente text-to-speech). Pide siempre el texto
EXACTO que se escuchó, nunca "sonó bien" o "sonó raro" — varios bugs reales
solo se detectaron así. Antes de dar por buena una pieza de contenido,
correr los chequeos automáticos ya establecidos (ver cualquier commit
anterior): balance de etiquetas HTML, mayúsculas sostenidas sospechosas,
abreviaciones con punto, español dentro de `lang="en"`, inputs de respuesta
sin `lang="en"`, y ausencia de notas de implementación visibles.
