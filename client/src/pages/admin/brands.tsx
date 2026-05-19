import { AdminLayout } from "@/components/layout/AdminLayout";
import { useBrands, useCreateBrand, useDeleteBrand } from "@/hooks/use-brands";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminBrands() {
  const { data: brands = [], isLoading } = useBrands();
  const { mutate: createBrand, isPending: isCreating } = useCreateBrand();
  const { mutate: deleteBrand } = useDeleteBrand();
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createBrand(
      { name },
      {
        onSuccess: () => { setNewName(""); toast({ title: `Marca "${name}" creada` }); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Marcas</h1>
      </div>

      {/* ── Add new ── */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Nombre de la marca..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          className="max-w-xs"
          data-testid="input-brand-name"
        />
        <Button onClick={handleAdd} disabled={isCreating || !newName.trim()} data-testid="button-add-brand">
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span className="ml-2">Agregar</span>
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-16">
                  <Tags className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No hay marcas registradas</p>
                </TableCell>
              </TableRow>
            ) : (
              brands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-muted-foreground text-sm">{b.id}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog open={deleteId === b.id} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar marca?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Los productos con esta marca quedarán sin marca asignada. No se eliminarán productos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBrand(b.id, { onSuccess: () => { toast({ title: "Marca eliminada" }); setDeleteId(null); }})} className="bg-destructive">
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
      </div>
    </AdminLayout>
  );
}
