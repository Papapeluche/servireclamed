// Identifica a qué médico del catálogo pertenece una reclamación. En el
// papel el nombre casi nunca viene igual que en el catálogo ("Cristian
// Escarfuller" vs "Cristian Antonio Escarfuller Olivo", sin tildes, con
// "Dr."), así que comparar el nombre letra por letra deja reclamaciones sin
// enlazar: y sin doctor_id no se encuentran sus comprobantes (NCF) ni se
// agrupan bien sus relaciones.
//
// `doctors` trae { id, nombre, cedula, doctor_ars_codigos: [{ ars_id, codigo }] }.
// Devuelve { medico, por } o null si no hay una coincidencia única y segura.

const TITULOS = new Set(["dr", "dra", "doctor", "doctora", "lic", "licda", "licdo", "ing"]);

export function normalizarNombre(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !TITULOS.has(p))
    .join(" ");
}

function soloDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

// Cada palabra significativa del nombre escrito aparece en el del catálogo.
function nombreCompatible(escrito, catalogo) {
  const palabras = normalizarNombre(escrito).split(" ").filter((p) => p.length >= 3);
  if (palabras.length < 2) return false;
  const delCatalogo = new Set(normalizarNombre(catalogo).split(" "));
  return palabras.every((p) => delCatalogo.has(p));
}

function unico(lista) {
  return lista.length === 1 ? lista[0] : null;
}

export function resolverMedico({ doctor_nombre, doctor_cedula, doctor_codigo, ars_id }, doctors) {
  if (!doctors?.length) return null;
  const nombre = normalizarNombre(doctor_nombre);
  const cedula = soloDigitos(doctor_cedula);
  const codigo = soloDigitos(doctor_codigo);

  // 1. Código del médico en esa ARS — lo más confiable, pero en el catálogo
  //    hay ARS que repiten un código entre dos médicos: ahí se desempata.
  if (ars_id && codigo) {
    const porCodigo = doctors.filter((d) =>
      (d.doctor_ars_codigos || []).some((c) => c.ars_id === ars_id && soloDigitos(c.codigo) === codigo)
    );
    const m =
      unico(porCodigo) ||
      unico(porCodigo.filter((d) => cedula && soloDigitos(d.cedula) === cedula)) ||
      unico(porCodigo.filter((d) => nombre && normalizarNombre(d.nombre) === nombre)) ||
      unico(porCodigo.filter((d) => nombreCompatible(doctor_nombre, d.nombre)));
    if (m) return { medico: m, por: "codigo" };
  }

  // 2. Cédula.
  if (cedula.length >= 9) {
    const m = unico(doctors.filter((d) => soloDigitos(d.cedula) === cedula));
    if (m) return { medico: m, por: "cedula" };
  }

  // 3. Nombre igual sin tildes, mayúsculas, puntos ni "Dr.".
  if (nombre) {
    const m = unico(doctors.filter((d) => normalizarNombre(d.nombre) === nombre));
    if (m) return { medico: m, por: "nombre" };
  }

  // 4. Nombre incompleto (faltan segundos nombres/apellidos), solo si
  //    coincide con un único médico.
  const m = unico(doctors.filter((d) => nombreCompatible(doctor_nombre, d.nombre)));
  if (m) return { medico: m, por: "nombre" };

  return null;
}

// Completa los datos del médico que el papel no trae (o trae vacíos) con
// los del catálogo, sin pisar lo que sí se escribió.
export function completarDesdeCatalogo(valores, medico, ars_id) {
  const codigoArs = (medico.doctor_ars_codigos || []).find((c) => c.ars_id === ars_id)?.codigo;
  const vacio = (v) => v === null || v === undefined || String(v).trim() === "";
  const r = {};
  if (vacio(valores.doctor_cedula) && medico.cedula) r.doctor_cedula = medico.cedula;
  if (vacio(valores.doctor_rnc) && medico.rnc) r.doctor_rnc = medico.rnc;
  if (vacio(valores.especialidad) && medico.especialidad) r.especialidad = medico.especialidad;
  if (vacio(valores.centro_medico) && medico.centro_medico) r.centro_medico = medico.centro_medico;
  if (vacio(valores.doctor_codigo) && codigoArs) r.doctor_codigo = codigoArs;
  return r;
}
