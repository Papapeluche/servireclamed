"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_FIELD_NAMES, FIELD_BY_NAME, TIPO_SERVICIO_OPTIONS } from "@/lib/claimFields";
import { HEADER_FIELD_OPTIONS } from "@/lib/relacionFields";

const TABLE_FIELD_OPTIONS = ALL_FIELD_NAMES.map((name) => ({
  field: name,
  label: FIELD_BY_NAME[name].label,
}));

export default function TemplateEditor({ template, arsOptions }) {
  const router = useRouter();
  const isEditing = Boolean(template?.id);

  const [nombre, setNombre] = useState(template?.nombre || "");
  const [tipo, setTipo] = useState(template?.tipo || "relacion");
  const [arsId, setArsId] = useState(template?.ars_id || "");
  const [headerFields, setHeaderFields] = useState(template?.header_fields || []);
  const [tableColumns, setTableColumns] = useState(template?.table_columns || []);
  const [totalField, setTotalField] = useState(template?.total_field || "monto");
  const [categorias, setCategorias] = useState(template?.categorias || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const numericTableFields = tableColumns.filter(
    (c) => FIELD_BY_NAME[c.field]?.type === "number"
  );

  async function handleSave() {
    setError(null);
    if (!nombre.trim()) {
      setError("Ponle un nombre a la plantilla.");
      return;
    }
    if (tipo === "relacion" && tableColumns.length === 0) {
      setError("Agrega al menos una columna de tabla.");
      return;
    }
    if (tipo === "hoja_presentacion" && categorias.length === 0) {
      setError("Agrega al menos una categoría de facturación.");
      return;
    }

    setSaving(true);
    const payload = {
      nombre,
      tipo,
      ars_id: arsId || null,
      header_fields: headerFields,
      table_columns: tableColumns,
      total_field: totalField,
      categorias,
    };

    const res = await fetch(isEditing ? `/api/templates/${template.id}` : "/api/templates", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/plantillas");
      router.refresh();
    } else {
      const { error: msg } = await res.json();
      setError(msg || "No se pudo guardar la plantilla.");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    router.push("/plantillas");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre de la plantilla
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Relación Senasa"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="relacion">Relación</option>
            <option value="hoja_presentacion">Hoja de presentación</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          ARS (opcional — vacío = plantilla genérica)
        </label>
        <select
          value={arsId}
          onChange={(e) => setArsId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Genérica (cualquier ARS)</option>
          {arsOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </div>

      <FieldListEditor
        title="Campos del encabezado (una vez por documento — datos del médico/ARS)"
        options={HEADER_FIELD_OPTIONS}
        chosen={headerFields}
        onChange={setHeaderFields}
      />

      {tipo === "relacion" ? (
        <>
          <FieldListEditor
            title="Columnas de la tabla (una fila por reclamación)"
            options={TABLE_FIELD_OPTIONS}
            chosen={tableColumns}
            onChange={setTableColumns}
          />

          {numericTableFields.length > 0 && (
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Campo a sumar en la fila de total
              </label>
              <select
                value={totalField}
                onChange={(e) => setTotalField(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {numericTableFields.map((f) => (
                  <option key={f.field} value={f.field}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : (
        <CategoriasEditor categorias={categorias} onChange={setCategorias} />
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar plantilla"}
        </button>
        {isEditing && (
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export function FieldListEditor({ title, options, chosen, onChange }) {
  const [pendingField, setPendingField] = useState("");
  const chosenNames = new Set(chosen.map((c) => c.field));
  const available = options.filter((o) => !chosenNames.has(o.field));

  function addField() {
    const opt = options.find((o) => o.field === pendingField);
    if (!opt) return;
    onChange([...chosen, { field: opt.field, label: opt.label }]);
    setPendingField("");
  }

  function removeField(field) {
    onChange(chosen.filter((c) => c.field !== field));
  }

  function moveField(index, direction) {
    const next = [...chosen];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateLabel(field, label) {
    onChange(chosen.map((c) => (c.field === field ? { ...c, label } : c)));
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>

      {chosen.length === 0 && (
        <p className="mb-3 text-sm text-slate-400">Todavía no has agregado campos.</p>
      )}

      <div className="mb-3 flex flex-col gap-2">
        {chosen.map((c, idx) => (
          <div key={c.field} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moveField(idx, -1)}
                disabled={idx === 0}
                className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveField(idx, 1)}
                disabled={idx === chosen.length - 1}
                className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <span className="w-48 shrink-0 text-xs text-slate-500">{c.field}</span>
            <input
              value={c.label}
              onChange={(e) => updateLabel(c.field, e.target.value)}
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => removeField(c.field)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value={pendingField}
            onChange={(e) => setPendingField(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Agregar campo...</option>
            {available.map((o) => (
              <option key={o.field} value={o.field}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addField}
            disabled={!pendingField}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            + Agregar
          </button>
        </div>
      )}
    </div>
  );
}

function CategoriasEditor({ categorias, onChange }) {
  function addCategoria() {
    onChange([...categorias, { label: "", tipos: [] }]);
  }

  function removeCategoria(idx) {
    onChange(categorias.filter((_, i) => i !== idx));
  }

  function moveCategoria(idx, direction) {
    const next = [...categorias];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function updateLabel(idx, label) {
    onChange(categorias.map((c, i) => (i === idx ? { ...c, label } : c)));
  }

  function toggleTipo(idx, tipo) {
    onChange(
      categorias.map((c, i) => {
        if (i !== idx) return c;
        const tipos = c.tipos.includes(tipo)
          ? c.tipos.filter((t) => t !== tipo)
          : [...c.tipos, tipo];
        return { ...c, tipos };
      })
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-800">
        Categorías de facturación (una fila por categoría, sumando el monto de
        las reclamaciones cuyo tipo de servicio caiga en cada una)
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Ej. en la factura de ARS CMD: "Consultas", "Procedimientos
        ambulatorios (prueba y estudios)", "Honorarios / Emergencias",
        "Honorarios méd. / hospitalización".
      </p>

      {categorias.length === 0 && (
        <p className="mb-3 text-sm text-slate-400">Todavía no has agregado categorías.</p>
      )}

      <div className="mb-3 flex flex-col gap-3">
        {categorias.map((cat, idx) => (
          <div key={idx} className="rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveCategoria(idx, -1)}
                  disabled={idx === 0}
                  className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveCategoria(idx, 1)}
                  disabled={idx === categorias.length - 1}
                  className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <input
                value={cat.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                placeholder="Nombre de la categoría (ej. Consultas)"
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeCategoria(idx)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIPO_SERVICIO_OPTIONS.map((tipo) => (
                <label
                  key={tipo}
                  className={`cursor-pointer rounded-full border px-2 py-1 text-xs ${
                    cat.tipos.includes(tipo)
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-300 text-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={cat.tipos.includes(tipo)}
                    onChange={() => toggleTipo(idx, tipo)}
                    className="hidden"
                  />
                  {tipo}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCategoria}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
      >
        + Agregar categoría
      </button>
    </div>
  );
}
