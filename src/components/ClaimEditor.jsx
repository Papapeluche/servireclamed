"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CLAIM_SECTIONS, REQUIRED_FIELD_NAMES } from "@/lib/claimFields";
import ImageZoomViewer from "@/components/ImageZoomViewer";

export default function ClaimEditor({ claim, imageUrl, arsOptions, doctors = [] }) {
  const router = useRouter();
  const [values, setValues] = useState(() => {
    const initial = {};
    for (const section of CLAIM_SECTIONS) {
      for (const field of section.fields) {
        initial[field.name] = claim[field.name] ?? "";
      }
    }
    initial.ars_id = claim.ars_id ?? "";
    return initial;
  });
  const [lowConfidence, setLowConfidence] = useState(
    () => new Set(claim.low_confidence_fields || [])
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const missingRequired = useMemo(
    () => REQUIRED_FIELD_NAMES.filter((name) => !String(values[name] || "").trim()),
    [values]
  );

  function updateField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  // Médicos que tienen código registrado para la ARS seleccionada (o todos,
  // si aún no se ha elegido ARS).
  const doctorsForArs = useMemo(() => {
    if (!values.ars_id) return doctors;
    return doctors.filter((d) =>
      (d.doctor_ars_codigos || []).some((c) => c.ars_id === values.ars_id)
    );
  }, [doctors, values.ars_id]);

  function handleDoctorNombreChange(name) {
    updateField("doctor_nombre", name);

    const match = doctors.find((d) => d.nombre.trim().toLowerCase() === name.trim().toLowerCase());
    if (!match) return;

    const codigoForArs = (match.doctor_ars_codigos || []).find((c) => c.ars_id === values.ars_id);

    setValues((v) => ({
      ...v,
      doctor_nombre: match.nombre,
      doctor_cedula: match.cedula || v.doctor_cedula,
      doctor_rnc: match.rnc || v.doctor_rnc,
      especialidad: match.especialidad || v.especialidad,
      centro_medico: match.centro_medico || v.centro_medico,
      doctor_codigo: codigoForArs ? codigoForArs.codigo : v.doctor_codigo,
    }));
  }

  function toggleLowConfidence(name) {
    setLowConfidence((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function findDoctorByNombre(nombre) {
    return doctors.find(
      (d) => d.nombre.trim().toLowerCase() === String(nombre || "").trim().toLowerCase()
    );
  }

  function buildPayload(nextStatus, userId) {
    const payload = { ...values, ars_id: values.ars_id || null };
    payload.doctor_id = findDoctorByNombre(values.doctor_nombre)?.id || null;
    for (const section of CLAIM_SECTIONS) {
      for (const field of section.fields) {
        const raw = values[field.name];
        if (field.type === "number") {
          payload[field.name] = raw === "" || raw == null ? null : Number(raw);
        } else if (field.type === "date") {
          payload[field.name] = raw || null;
        }
      }
    }
    payload.low_confidence_fields = Array.from(lowConfidence);
    payload.status = nextStatus;

    if (nextStatus === "revisado") {
      payload.verified_by = userId ?? null;
      payload.verified_at = new Date().toISOString();
    } else {
      payload.digitized_by = userId ?? null;
      payload.digitized_at = new Date().toISOString();
    }
    return payload;
  }

  async function save(nextStatus) {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = buildPayload(nextStatus, user?.id);
    const { error } = await supabase.from("claims").update(payload).eq("id", claim.id);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    if (nextStatus === "revisado") {
      router.push("/dashboard");
    } else {
      setMessage({ type: "success", text: "Guardado." });
    }
  }

  async function saveAndDuplicate() {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = buildPayload("en_proceso", user?.id);
    const { error: updateError } = await supabase
      .from("claims")
      .update(payload)
      .eq("id", claim.id);

    if (updateError) {
      setSaving(false);
      setMessage({ type: "error", text: updateError.message });
      return;
    }

    // Nueva línea a partir de la misma imagen — para formularios con más de
    // un procedimiento (ej. Humano, ARS-UASD), copiando lo que suele
    // repetirse: ARS y datos del médico.
    const { data: newClaim, error: insertError } = await supabase
      .from("claims")
      .insert({
        image_path: claim.image_path,
        status: "pendiente",
        ars_id: values.ars_id || null,
        doctor_id: findDoctorByNombre(values.doctor_nombre)?.id || null,
        doctor_nombre: values.doctor_nombre || null,
        doctor_codigo: values.doctor_codigo || null,
        doctor_cedula: values.doctor_cedula || null,
        especialidad: values.especialidad || null,
        centro_medico: values.centro_medico || null,
        telefono_medico: values.telefono_medico || null,
        digitized_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (insertError) {
      setMessage({ type: "error", text: insertError.message });
      return;
    }

    router.push(`/reclamaciones/${newClaim.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-[70vh] lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
        <ImageZoomViewer src={imageUrl} alt="Reclamación escaneada" />
      </div>

      <div>
        {lowConfidence.size > 0 && (
          <div className="mb-4 rounded-lg bg-warn-100 px-3 py-2 text-sm text-warn-700">
            {lowConfidence.size} campo(s) marcados como "no se entiende" — revísalos con
            cuidado antes de enviar.
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">ARS</label>
          <select
            value={values.ars_id}
            onChange={(e) => updateField("ars_id", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona la ARS...</option>
            {arsOptions.map((ars) => (
              <option key={ars.id} value={ars.id}>
                {ars.nombre}
              </option>
            ))}
          </select>
        </div>

        {CLAIM_SECTIONS.map((section) => (
          <fieldset key={section.title} className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              {section.title}
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(val) =>
                    field.name === "doctor_nombre"
                      ? handleDoctorNombreChange(val)
                      : updateField(field.name, val)
                  }
                  flagged={lowConfidence.has(field.name)}
                  onToggleFlag={() => toggleLowConfidence(field.name)}
                  listId={field.name === "doctor_nombre" ? "doctors-list" : undefined}
                />
              ))}
            </div>
          </fieldset>
        ))}

        <datalist id="doctors-list">
          {doctorsForArs.map((d) => (
            <option key={d.id} value={d.nombre} />
          ))}
        </datalist>

        {message && (
          <p
            className={`mb-3 text-sm ${
              message.type === "error" ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {message.text}
          </p>
        )}

        {missingRequired.length > 0 && (
          <p className="mb-3 text-sm text-warn-700">
            Faltan campos obligatorios para poder marcar como revisado.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => save("en_proceso")}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Guardar y seguir después
          </button>
          <button
            onClick={() => save("revisado")}
            disabled={saving || missingRequired.length > 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Marcar como revisado
          </button>
          <button
            onClick={saveAndDuplicate}
            disabled={saving}
            title="Para formularios con más de un procedimiento/servicio en la misma hoja"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            + Otra línea de esta misma imagen
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange, flagged, onToggleFlag, listId }) {
  const isWide = field.type === "textarea";

  return (
    <div className={isWide ? "sm:col-span-2" : ""}>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        <button
          type="button"
          onClick={onToggleFlag}
          title="Marcar como letra ilegible / no se entiende"
          className={`text-xs ${flagged ? "font-semibold text-warn-700" : "text-slate-400 hover:text-warn-700"}`}
        >
          {flagged ? "⚠ No se entiende" : "¿No se entiende?"}
        </button>
      </div>

      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={inputClass(flagged)}
        />
      ) : field.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass(flagged)}>
          <option value="">Selecciona...</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          list={listId}
          className={inputClass(flagged)}
        />
      )}
    </div>
  );
}

function inputClass(flagged) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    flagged
      ? "border-warn-500 bg-warn-100/40 focus:border-warn-500 focus:ring-warn-500"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-500"
  }`;
}
