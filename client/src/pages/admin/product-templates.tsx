import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminProductTemplates, useDeleteProductTemplate } from "@/hooks/use-products";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Search, Package, Loader2, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminProductTemplates() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const limit = 20;
  const { toast } = useToast();

  const { data, isLoading } = useAdminProductTemplates({ search, page, limit });
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteProductTemplate();

  const templates = data?.templates ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteTemplate(deleteId, {
      onSuccess: () => {
        toast({ title: "Template eliminado" });
        setDeleteId(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  // Top 5 más usados
  const topUsed = templates
    .filter((t: any) => t.usageCount > 0)
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Maestro de Productos</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={isBackfilling}
          onClick={async () => {
            setIsBackfilling(true);
            try {
              const res = await fetch("/api/admin/product-templates/backfill", {
                method: "POST",
                credentials: "include",
              });
              const data = await res.json();
              toast({ title: data.message || "Backfill completado" });
              window.location.reload();
            } catch (e: any) {
              toast({ title: "Error", description: e.message, variant: "destructive" });
            } finally {
              setIsBackfilling(false);
            }
          }}
        >
          {isBackfilling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-2">{isBackfilling ? "Sincronizando..." : "Sincronizar productos existentes"}</span>
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Templates registrados</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {templates.filter((t: any) => t.usageCount > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">Templates reutilizados</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{topUsed.length > 0 ? topUsed[0]?.name || "-" : "-"}</p>
              <p className="text-xs text-muted-foreground">Más usado</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, marca o código..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10 max-w-md"
          data-testid="input-templates-search"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Marca / Unidad</TableHead>
              <TableHead>Barras / SKU</TableHead>
              <TableHead>Precio Compra</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando templates...
                  </div>
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Package className="w-16 h-16 opacity-20" />
                    <p className="text-lg font-medium">No hay templates</p>
                    <p className="text-sm">Los templates se crean automáticamente al agregar productos.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.category?.name || <span className="text-muted-foreground/50">-</span>}</TableCell>
                  <TableCell>{t.supplier?.name || <span className="text-muted-foreground/50">-</span>}</TableCell>
                  <TableCell>
                    {(t.brand || t.unit)
                      ? [t.brand, t.unit].filter(Boolean).join(" / ")
                      : <span className="text-muted-foreground/50">-</span>}
                  </TableCell>
                  <TableCell>
                    {(t.barcode || t.sku)
                      ? [t.barcode, t.sku].filter(Boolean).join(" / ")
                      : <span className="text-muted-foreground/50">-</span>}
                  </TableCell>
                  <TableCell>
                    {t.lastPurchasePrice
                      ? `S/ ${Number(t.lastPurchasePrice).toFixed(2)}`
                      : <span className="text-muted-foreground/50">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {t.usageCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.lastUsedAt
                      ? new Date(t.lastUsedAt).toLocaleDateString("es-PE")
                      : <span className="text-muted-foreground/50">Nunca</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog open={deleteId === t.id} onOpenChange={(val) => { if (!val) setDeleteId(null); }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
                        >
                          {isDeleting && deleteId === t.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Los productos creados a partir de este template no se verán afectados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} ({total} templates)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
