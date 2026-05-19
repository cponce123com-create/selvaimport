import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/hooks/use-suppliers";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Loader2, Building2, Phone, Mail, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  contact: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email("Email inválido").optional().or(z.literal("")).default(""),
  notes: z.string().optional().default(""),
});

type FormData = z.infer<typeof formSchema>;

export default function AdminSuppliers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { mutate: createSupplier, isPending: isCreating } = useCreateSupplier();
  const { mutate: updateSupplier, isPending: isUpdating } = useUpdateSupplier();
  const { mutate: deleteSupplier, isPending: isDeleting } = useDeleteSupplier();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", contact: "", phone: "", email: "", notes: "" },
  });

  const openEdit = (s: any) => {
    setEditingId(s.id);
    form.reset({
      name: s.name,
      contact: s.contact || "",
      phone: s.phone || "",
      email: s.email || "",
      notes: s.notes || "",
    });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", contact: "", phone: "", email: "", notes: "" });
    setIsOpen(true);
  };

  const onSubmit = (data: FormData) => {
    // Convertir strings vacíos a null para el backend
    const payload = {
      name: data.name,
      contact: data.contact || null,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    };

    if (editingId) {
      updateSupplier(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Proveedor actualizado" });
            setIsOpen(false);
          },
          onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      createSupplier(payload, {
        onSuccess: () => {
          toast({ title: "Proveedor creado" });
          setIsOpen(false);
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteSupplier(deleteId, {
      onSuccess: () => {
        toast({ title: "Proveedor eliminado" });
        setDeleteId(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-suppliers-title">
          Proveedores
        </h1>
        <Dialog open={isOpen} onOpenChange={(val) => { if (!val) { setEditingId(null); form.reset(); } setIsOpen(val); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="button-add-supplier">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del proveedor" data-testid="input-supplier-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Persona de contacto" data-testid="input-supplier-contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+51 999 999 999" data-testid="input-supplier-phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="proveedor@ejemplo.com" data-testid="input-supplier-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas adicionales..." data-testid="input-supplier-notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating} data-testid="button-save-supplier">
                    {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando proveedores...
                  </div>
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Building2 className="w-12 h-12 opacity-30" />
                    <p className="text-lg font-medium">No hay proveedores registrados</p>
                    <p className="text-sm">Agrega tu primer proveedor para empezar.</p>
                    <Button variant="outline" size="sm" onClick={openNew}>
                      <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s: any) => (
                <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell>{s.contact || <span className="text-muted-foreground/50">-</span>}</TableCell>
                  <TableCell>
                    {s.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        {s.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {s.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {s.notes ? (
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{s.notes}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`button-edit-supplier-${s.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog open={deleteId === s.id} onOpenChange={(val) => { if (!val) setDeleteId(null); }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                          data-testid={`button-delete-supplier-${s.id}`}
                        >
                          {isDeleting && deleteId === s.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará a <strong>{s.name}</strong> y los productos asociados quedarán sin proveedor.
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
      </div>
    </AdminLayout>
  );
}
