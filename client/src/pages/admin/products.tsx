import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Upload, X, ImageIcon, Loader2, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const MAX_IMAGES = 5;

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripcion es obligatoria"),
  price: z.string().min(1, "El precio es obligatorio"),
  offerPrice: z.string().optional(),
  inventory: z.coerce.number().min(0, "El inventario no puede ser negativo"),
  categoryId: z.coerce.number().optional(),
});

function generateSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminProducts() {
  const { data: products = [], isLoading } = useProducts({ admin: true });
  const { data: categories = [] } = useCategories();
  const { mutate: createProduct } = useCreateProduct();
  const { mutate: updateProduct } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPublicId, setVideoPublicId] = useState<string | null>(null);
  const [isOffer, setIsOffer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", price: "", offerPrice: "", inventory: 0 },
  });

  const openEdit = (p: any) => {
    setEditingId(p.id);
    form.reset({
      name: p.name, description: p.description,
      price: Number(p.price).toString(),
      offerPrice: p.offerPrice ? Number(p.offerPrice).toString() : "",
      inventory: p.inventory,
      categoryId: p.categoryId,
    });
    const existingImages: string[] = [];
    if (p.images && p.images.length > 0) {
      existingImages.push(...p.images);
    } else if (p.imageUrl) {
      existingImages.push(p.imageUrl);
    }
    setImages(existingImages);
    setVideoUrl(p.videoUrl || null);
    setVideoPublicId(p.videoPublicId || null);
    setIsOffer(!!p.isOffer);
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", price: "", offerPrice: "", inventory: 0 });
    setImages([]);
    setVideoUrl(null);
    setVideoPublicId(null);
    setIsOffer(false);
    setIsOpen(true);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ title: "Limite alcanzado", description: `Maximo ${MAX_IMAGES} imagenes por producto.`, variant: "destructive" });
      return;
    }
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Error al subir imagen");
        }
        const data = await res.json();
        uploaded.push(data.url);
      }
      setImages(prev => [...prev, ...uploaded]);
      toast({ title: `${uploaded.length} imagen(es) subida(s)` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al subir video");
      }
      const data = await res.json();
      setVideoUrl(data.url);
      setVideoPublicId(data.publicId);
      toast({ title: "Video subido exitosamente" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const watchPrice = form.watch("price");
  const watchOfferPrice = form.watch("offerPrice");
  const discountPercent = watchPrice && watchOfferPrice && Number(watchOfferPrice) > 0 && Number(watchOfferPrice) < Number(watchPrice)
    ? Math.round(((Number(watchPrice) - Number(watchOfferPrice)) / Number(watchPrice)) * 100)
    : null;

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload = {
      ...data,
      slug: generateSlug(data.name),
      imageUrl: images.length > 0 ? images[0] : null,
      images: images,
      videoUrl: videoUrl,
      videoPublicId: videoPublicId,
      isOffer: isOffer,
      offerPrice: isOffer && data.offerPrice && Number(data.offerPrice) > 0 ? data.offerPrice : null,
    };

    if (editingId) {
      updateProduct({ id: editingId, ...payload }, {
        onSuccess: () => {
          toast({ title: "Producto actualizado" });
          setIsOpen(false);
        }
      });
    } else {
      createProduct(payload as any, {
        onSuccess: () => {
          toast({ title: "Producto creado" });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if(confirm("Estas seguro de que quieres eliminar este producto?")) {
      deleteProduct(id, { onSuccess: () => toast({ title: "Producto eliminado" }) });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-products-title">Productos</h1>
        <Dialog open={isOpen} onOpenChange={(val) => { if(!val) { setEditingId(null); form.reset(); setImages([]); setIsOffer(false); } setIsOpen(val); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew} data-testid="button-add-product"><Plus className="w-4 h-4 mr-2" /> Agregar Producto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Producto" : "Crear Producto"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({field}) => (
                  <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input data-testid="input-product-name" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Descripcion</FormLabel><FormControl><Textarea data-testid="input-product-description" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="price" render={({field}) => (
                    <FormItem><FormLabel>Precio (S/)</FormLabel><FormControl><Input type="number" step="0.01" data-testid="input-product-price" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="inventory" render={({field}) => (
                    <FormItem><FormLabel>Inventario</FormLabel><FormControl><Input type="number" data-testid="input-product-inventory" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="categoryId" render={({field}) => (
                    <FormItem><FormLabel>Categoria</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-category"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )} />
                </div>

                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="isOffer"
                      checked={isOffer}
                      onCheckedChange={(checked) => setIsOffer(!!checked)}
                      data-testid="checkbox-is-offer"
                    />
                    <label htmlFor="isOffer" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Tag className="w-4 h-4 text-primary" />
                      Marcar como Oferta
                    </label>
                  </div>
                  {isOffer && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <FormField control={form.control} name="offerPrice" render={({field}) => (
                        <FormItem>
                          <FormLabel>Precio Oferta (S/)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej: 149.99" data-testid="input-product-offer-price" {...field} />
                          </FormControl>
                          <FormMessage/>
                        </FormItem>
                      )} />
                      {discountPercent !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold px-2.5 py-1 rounded-full text-xs">
                            -{discountPercent}%
                          </span>
                          <span className="text-muted-foreground">
                            De S/ {Number(watchPrice).toFixed(2)} a S/ {Number(watchOfferPrice).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormLabel>Imagenes del Producto ({images.length}/{MAX_IMAGES})</FormLabel>
                    <div className="mt-2 grid grid-cols-5 gap-3">
                      {images.map((url, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted" data-testid={`image-preview-${i}`}>
                          <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            data-testid={`button-remove-image-${i}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                              Principal
                            </span>
                          )}
                        </div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-upload-image"
                        >
                          {uploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-5 h-5" />
                              <span className="text-[10px] font-medium">Subir</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUpload(e.target.files)}
                      data-testid="input-file-upload"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximo {MAX_IMAGES} imagenes. Formatos: JPG, PNG, WebP.
                    </p>
                  </div>

                  <div>
                    <FormLabel>Video del Producto (Opcional)</FormLabel>
                    <div className="mt-2">
                      {videoUrl ? (
                        <div className="relative group aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                          <video src={videoUrl} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setVideoUrl(null); setVideoPublicId(null); }}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                          className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingVideo ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8" />
                              <span className="text-sm font-medium">Subir Video (Max 20MB)</span>
                              <span className="text-xs">MP4, WebM</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleVideoUpload(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" data-testid="button-save-product">Guardar Producto</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Inventario</TableHead>
              <TableHead>Imagenes</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No se encontraron productos</TableCell></TableRow>
            ) : (
              products.map((p: any) => (
                <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                        {(p.images?.[0] || p.imageUrl) ? (
                          <img src={p.images?.[0] || p.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <span>{p.name}</span>
                      {p.isOffer && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3" /> OFERTA
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.isOffer && p.offerPrice ? (
                      <div>
                        <span className="line-through text-muted-foreground text-xs">S/ {Number(p.price).toFixed(2)}</span>
                        <span className="block font-bold text-red-600 dark:text-red-400">S/ {Number(p.offerPrice).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span>S/ {Number(p.price).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>{p.inventory}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {(p.images?.length || (p.imageUrl ? 1 : 0))} / {MAX_IMAGES}
                    </span>
                  </TableCell>
                  <TableCell>{p.category?.name || '-'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} data-testid={`button-edit-product-${p.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} data-testid={`button-delete-product-${p.id}`}><Trash2 className="w-4 h-4" /></Button>
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
