/**
 * La segunda línea (la chiquita) debajo del nombre del cliente.
 *
 * Regla: lo que se ve es lo que se edita. La línea sale de `nombre_fantasia` y
 * de ningún otro lado, así que el usuario puede corregirla o borrarla desde el
 * detalle del cliente y la pantalla le hace caso.
 *
 * Antes la lista caía a `datos_contacto.second` cuando `nombre_fantasia` estaba
 * vacío, y eso trajo dos problemas. Uno: sobre 1425 clientes, 383 de esas líneas
 * repetían la razón social o eran un carácter suelto, o sea el mismo nombre dos
 * veces, uno encima del otro. Dos: ese campo no se edita desde ningún lado, así
 * que la línea equivocada no había forma de arreglarla.
 *
 * `second` no era un nombre de fantasía: en el sistema viejo era una segunda
 * línea de nombre sin ninguna regla, y adentro hay de todo (el mismo nombre, el
 * laboratorio real, la persona de contacto, otro cliente). Por eso no se migra
 * en bloque: se ofrece como sugerencia y decide quien conoce al cliente.
 */

/** Para comparar dos nombres: sin acentos, sin mayúsculas, sin espacios de más. */
export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Sin una sola letra ni número no es un nombre: ".", " - ", "   ". */
function esBasura(texto: string): boolean {
  return !/[a-z0-9]/i.test(texto);
}

/** Un texto sirve como segunda línea si dice algo distinto al nombre de arriba. */
function aporta(candidato: string, razonSocial: string): boolean {
  if (!candidato || esBasura(candidato)) return false;
  return normalizarNombre(candidato) !== normalizarNombre(razonSocial);
}

/**
 * El texto de la segunda línea, o null si no hay que dibujarla.
 */
export function nombreFantasiaVisible(
  nombre: string | null | undefined,
  nombreFantasia: string | null | undefined
): string | null {
  const razonSocial = (nombre ?? "").trim();
  const candidato = (nombreFantasia ?? "").trim();

  if (!candidato) return null;
  // Sin razón social el candidato ya se muestra como título: no se repite abajo.
  if (!razonSocial) return null;
  if (!aporta(candidato, razonSocial)) return null;

  return candidato;
}

/**
 * Lo que el sistema viejo tenía anotado, para ofrecerlo con un botón "Usar"
 * cuando el cliente todavía no tiene nombre de fantasía. Devuelve null si no hay
 * nada que valga la pena ofrecer.
 */
export function sugerenciaNombreFantasia(
  nombre: string | null | undefined,
  nombreFantasia: string | null | undefined,
  second: string | null | undefined
): string | null {
  // Si ya hay un nombre de fantasía cargado, la sugerencia no molesta.
  if ((nombreFantasia ?? "").trim()) return null;

  const razonSocial = (nombre ?? "").trim();
  const candidato = (second ?? "").trim();

  return aporta(candidato, razonSocial) ? candidato : null;
}
