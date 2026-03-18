import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  slug: z.string().min(1, "El slug es obligatorio"),
  description: z.string().optional(),
  showOnHome: z.boolean().default(true),
});

export default function AdminCategories() {
  const { data: categories = [], isLoading } = useCategories();
  const { mutate: createCategory } = useCreateCategory();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", slug: "", description: "", showOnHome: true },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCategory(data, {
      onSuccess: () => {
        toast({ title: "Categoria creada" });
        setIsOpen(false);
        form.reset();
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-categories-title">Categorias</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category"><Plus className="w-4 h-4 mr-2" /> Agregar Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Categoria</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input data-testid="input-category-name" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({field}) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input data-testid="input-category-slug" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Descripcion</FormLabel><FormControl><Input data-testid="input-category-description" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="showOnHome" render={({field}) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mostrar en el Home</FormLabel>
                      <p className="text-xs text-muted-foreground">Si se desactiva, la categoría y sus productos no aparecerán en el inicio ni carruseles.</p>
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" data-testid="button-save-category">Guardar</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Home</TableHead>
              <TableHead>Descripcion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No se encontraron categorias</TableCell></TableRow>
            ) : (
              categories.map((c: any) => (
                <TableRow key={c.id} data-testid={`row-category-${c.id}`}>
                  <TableCell className="font-mono text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell>
                    {c.showOnHome ? (
                      <span className="flex items-center text-green-600 text-xs font-medium"><Eye className="w-3 h-3 mr-1" /> Visible</span>
                    ) : (
                      <span className="flex items-center text-amber-600 text-xs font-medium"><EyeOff className="w-3 h-3 mr-1" /> Oculta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.description || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
