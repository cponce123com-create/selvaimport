import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, Loader2, LayoutGrid, Rows3, X, Check } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HomeRow {
  id: number;
  title: string;
  rowType: string;
  categoryId: number | null;
  sortOrder: number;
  isActive: boolean;
  items: { id: number; productId: number; product: any }[];
}

interface HomeRectangle {
  id: number;
  position: number;
  title: string;
  rectType: string;
  productId: number | null;
  categoryId: number | null;
  isActive: boolean;
  product?: any;
  category?: any;
  items?: { productId: number; product: any }[];
}

// ─────────────────────────────────────────────
// Multi-product selector (for rows and rect-2)
// ─────────────────────────────────────────────
function ProductMultiSelect({
  selected,
  onChange,
  products,
  max,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  products: any[];
  max?: number;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      p.category?.slug !== "tacora"
  );

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, id]);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="p-2 border-b bg-muted/30">
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.slice(0, 50).map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                isSelected ? "bg-primary/10" : ""
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="truncate">{p.name}</span>
              {p.inventory === 0 && (
                <span className="ml-auto text-[10px] text-red-500 flex-shrink-0">Sin stock</span>
              )}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="p-2 border-t bg-muted/20 flex flex-wrap gap-1">
          {selected.map((id) => {
            const p = products.find((pr) => pr.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
              >
                {p?.name?.slice(0, 20) || id}
                <button type="button" onClick={() => toggle(id)}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Home Rows Section
// ─────────────────────────────────────────────
function HomeRowsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery<HomeRow[]>({
    queryKey: ["/api/admin/home-rows"],
  });
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<HomeRow> & { productIds?: number[] }>({});

  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/home-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/home-rows"] });
      qc.invalidateQueries({ queryKey: ["/api/home-rows"] });
      setEditingId(null);
      toast({ title: "Fila creada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/home-rows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/home-rows"] });
      qc.invalidateQueries({ queryKey: ["/api/home-rows"] });
      setEditingId(null);
      toast({ title: "Fila actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/admin/home-rows/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/home-rows"] });
      qc.invalidateQueries({ queryKey: ["/api/home-rows"] });
      toast({ title: "Fila eliminada" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await fetch("/api/admin/home-rows/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/home-rows"] }),
  });

  const moveRow = (row: HomeRow, dir: "up" | "down") => {
    const idx = sorted.findIndex((r) => r.id === row.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    reorderMutation.mutate(newOrder.map((r) => r.id));
  };

  const startEdit = (row: HomeRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      rowType: row.rowType,
      categoryId: row.categoryId,
      isActive: row.isActive,
      productIds: row.items?.map((i) => i.productId) || [],
    });
  };

  const startCreate = () => {
    setEditingId(-1);
    setForm({ title: "", rowType: "products", isActive: true, productIds: [] });
  };

  const handleSave = () => {
    const payload = {
      title: form.title,
      rowType: form.rowType,
      categoryId: form.rowType === "category" ? form.categoryId : null,
      isActive: form.isActive,
      productIds: form.rowType === "products" ? form.productIds : [],
    };
    if (editingId === -1) {
      createMutation.mutate(payload);
    } else if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Rows3 className="w-5 h-5" /> Filas estilo Amazon
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crea filas de productos con scroll horizontal para el home.
          </p>
        </div>
        <Button onClick={startCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nueva fila
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lista de filas */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : sorted.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Rows3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sin filas creadas. Crea la primera.</p>
            </div>
          ) : (
            sorted.map((row, idx) => (
              <div
                key={row.id}
                onClick={() => startEdit(row)}
                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors ${
                  editingId === row.id ? "border-primary bg-primary/5" : ""
                } ${!row.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveRow(row, "up"); }}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveRow(row, "down"); }}
                    disabled={idx === sorted.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.rowType === "category" ? "Por categoría" : `${row.items?.length || 0} productos`}
                    {" · "}
                    {row.isActive ? "Activa" : "Inactiva"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        {editingId !== null && (
          <div className="border rounded-2xl p-5 space-y-4 bg-card">
            <h3 className="font-semibold">{editingId === -1 ? "Nueva fila" : "Editar fila"}</h3>

            <div>
              <label className="text-sm font-medium mb-1 block">Título de la fila</label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Los más vendidos en cocina"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de fila</label>
              <Select
                value={form.rowType || "products"}
                onValueChange={(v) => setForm({ ...form, rowType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Productos manuales</SelectItem>
                  <SelectItem value="category">Por categoría (automático)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.rowType === "category" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Categoría</label>
                <Select
                  value={form.categoryId?.toString() || ""}
                  onValueChange={(v) => setForm({ ...form, categoryId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories as Array<Record<string, any>>)
                      .filter((c: any) => c.slug !== "tacora")
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.rowType === "products" && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Productos ({form.productIds?.length || 0} seleccionados)
                </label>
                <ProductMultiSelect
                  selected={form.productIds || []}
                  onChange={(ids) => setForm({ ...form, productIds: ids })}
                  products={products as Array<Record<string, any>>}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <span className="text-sm">Fila activa</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Home Rectangles Section
// ─────────────────────────────────────────────
function HomeRectanglesAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rects = [] } = useQuery<HomeRectangle[]>({
    queryKey: ["/api/home-rectangles"],
  });
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const [editingPos, setEditingPos] = useState<number | null>(null);
  const [forms, setForms] = useState<Record<number, any>>({});

  const updateMutation = useMutation({
    mutationFn: async ({ position, data }: { position: number; data: any }) => {
      const res = await fetch(`/api/admin/home-rectangles/${position}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/home-rectangles"] });
      setEditingPos(null);
      toast({ title: "Rectángulo actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startEdit = (pos: number) => {
    const rect = rects.find((r) => r.position === pos);
    setEditingPos(pos);
    setForms({
      ...forms,
      [pos]: {
        title: rect?.title || "",
        rectType: rect?.rectType || "product",
        productId: rect?.productId || null,
        categoryId: rect?.categoryId || null,
        isActive: rect?.isActive ?? true,
        productIds: rect?.items?.map((i) => i.productId) || [],
      },
    });
  };

  const handleSave = (pos: number) => {
    const f = forms[pos] || {};
    updateMutation.mutate({
      position: pos,
      data: {
        title: f.title,
        rectType: f.rectType,
        productId: f.rectType === "product" ? f.productId : null,
        categoryId: f.rectType === "category" ? f.categoryId : null,
        isActive: f.isActive,
        productIds: f.rectType === "multi" ? f.productIds : [],
      },
    });
  };

  const updateForm = (pos: number, patch: any) => {
    setForms({ ...forms, [pos]: { ...forms[pos], ...patch } });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" /> Sección de 4 Rectángulos
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura los 4 rectángulos visuales del home (estilo Amazon).
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((pos) => {
          const rect = rects.find((r) => r.position === pos);
          const isEditing = editingPos === pos;
          const f = forms[pos] || {};

          return (
            <div
              key={pos}
              className={`border rounded-2xl overflow-hidden transition-all ${
                isEditing ? "border-primary ring-1 ring-primary/20" : "border-border"
              }`}
            >
              {/* Header */}
              <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
                <span className="font-semibold text-sm">Rectángulo {pos}</span>
                {!isEditing ? (
                  <Button size="sm" variant="outline" onClick={() => startEdit(pos)}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleSave(pos)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPos(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview / Edit */}
              <div className="p-4 space-y-3">
                {!isEditing ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium truncate">{rect?.title || "(Sin título)"}</p>
                    <p className="text-muted-foreground text-xs">
                      {rect?.rectType === "multi"
                        ? `${rect?.items?.length || 0} productos`
                        : rect?.rectType === "category"
                        ? `Categoría: ${rect?.category?.name || "-"}`
                        : `Producto: ${rect?.product?.name?.slice(0, 30) || "-"}`}
                    </p>
                    <p className={`text-xs ${rect?.isActive ? "text-green-600" : "text-red-500"}`}>
                      {rect?.isActive ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Título</label>
                      <Input
                        value={f.title || ""}
                        onChange={(e) => updateForm(pos, { title: e.target.value })}
                        placeholder="Título del rectángulo"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block">Tipo</label>
                      <Select
                        value={f.rectType || "product"}
                        onValueChange={(v) => updateForm(pos, { rectType: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">1 producto</SelectItem>
                          <SelectItem value="multi">Hasta 4 productos</SelectItem>
                          <SelectItem value="category">Por categoría</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {f.rectType === "product" && (
                      <div>
                        <label className="text-xs font-medium mb-1 block">Producto</label>
                        <Select
                          value={f.productId?.toString() || ""}
                          onValueChange={(v) => updateForm(pos, { productId: Number(v) })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {(products as Array<Record<string, any>>)
                              .filter((p: any) => p.category?.slug !== "tacora")
                              .map((p: any) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name.slice(0, 35)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {f.rectType === "multi" && (
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Productos (máx. 4)
                        </label>
                        <ProductMultiSelect
                          selected={f.productIds || []}
                          onChange={(ids) => updateForm(pos, { productIds: ids })}
                          products={products as Array<Record<string, any>>}
                          max={4}
                        />
                      </div>
                    )}

                    {f.rectType === "category" && (
                      <div>
                        <label className="text-xs font-medium mb-1 block">Categoría</label>
                        <Select
                          value={f.categoryId?.toString() || ""}
                          onValueChange={(v) => updateForm(pos, { categoryId: Number(v) })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories as Array<Record<string, any>>)
                              .filter((c: any) => c.slug !== "tacora")
                              .map((c: any) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={f.isActive ?? true}
                        onCheckedChange={(v) => updateForm(pos, { isActive: v })}
                      />
                      <span className="text-xs">Activo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function AdminHomeSections() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Secciones del Home</h1>
        <p className="text-muted-foreground mt-1">
          Administra las filas de productos y los rectángulos visuales del inicio.
        </p>
      </div>

      <div className="space-y-10">
        <HomeRectanglesAdmin />
        <hr className="border-border" />
        <HomeRowsSection />
      </div>
    </AdminLayout>
  );
}
