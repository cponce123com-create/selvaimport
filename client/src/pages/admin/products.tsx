import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProductVisibility } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Upload, X, ImageIcon, Loader2, Tag, Barcode, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/product/BarcodeScanner";
import { ProductCombobox, type ProductTemplateSlim } from "@/components/product/ProductCombobox";

const MAX_IMAGES = 10;

// Comprime una imagen antes de subirla al servidor
// Reduce el tamaño manteniendo calidad aceptable (máx 1200px, calidad 85%)
async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  // Solo comprimir imágenes (no videos ni otros)
  if (!file.type.startsWith("image/")) return file;
  // Si pesa menos de 300KB no vale la pena comprimir
  if (file.size < 300 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Escalar si es más ancha que maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // Si la compresión no ayuda, usar original
          } else {
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripcion es obligatoria"),
  price: z.string().min(1, "El precio es obligatorio"),
  purchasePrice: z.string().optional(),
  offerPrice: z.string().optional(),
  inventory: z.coerce.number().min(0, "El inventario no puede ser negativo"),
  minStock: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
  entryDate: z.string().optional(),
});

// Botón separado para abrir la cámara directamente (solo funciona sin "multiple")
// En móvil abre la cámara, en desktop abre el selector de archivos
function CameraUploadButton({ uploading, onCapture }: { uploading: boolean; onCapture: (files: FileList | null) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1.5 disabled:opacity-50"
        data-testid="button-camera-capture"
      >
        <Upload className="w-3.5 h-3.5" />
        Tomar foto con cámara
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onCapture(e.target.files)}
      />
    </>
  );
}

function generateSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminProducts() {
  const { data: products = [], isLoading } = useProducts({ admin: true });
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { mutate: createProduct } = useCreateProduct();
  const { mutate: updateProduct } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: toggleVisibility } = useToggleProductVisibility();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPublicId, setVideoPublicId] = useState<string | null>(null);
  const [isOffer, setIsOffer] = useState(false);
  const [barcode, setBarcode] = useState("");

  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
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
      purchasePrice: p.purchasePrice ? Number(p.purchasePrice).toString() : "",
      offerPrice: p.offerPrice ? Number(p.offerPrice).toString() : "",
      inventory: p.inventory,
      minStock: p.minStock ?? undefined,
      categoryId: p.categoryId,
      entryDate: p.entryDate ? new Date(p.entryDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
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
    setSupplierId(p.supplierId || null);
    setBarcode(p.barcode || "");
    setIsOpen(true);
  };
const openNew = () => {
  setEditingId(null);
  form.reset({ name: "", description: "", price: "", purchasePrice: "", offerPrice: "", inventory: 0, minStock: undefined, categoryId: undefined, entryDate: new Date().toISOString().split("T")[0] });
  setImages([]);
  setVideoUrl(null);
  setVideoPublicId(null);
  setIsOffer(false);
  setBarcode("");
  setSupplierId(null);
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
    setUploading(true); // Incluye tiempo de compresión
    try {
      const uploaded: string[] = [];
      for (const rawFile of filesToUpload) {
        const file = await compressImage(rawFile);
        const originalKB = Math.round(rawFile.size / 1024);
        const compressedKB = Math.round(file.size / 1024);
        if (compressedKB < originalKB) {
          console.log(`🗜️ Imagen comprimida: ${originalKB}KB → ${compressedKB}KB`);
        }
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
    // Convertir entryDate de string (YYYY-MM-DD) a Date para la API
    const entryDateValue = data.entryDate
      ? new Date(data.entryDate + "T12:00:00")
      : undefined;

    const payload = {
      ...data,
      entryDate: entryDateValue,
      slug: generateSlug(data.name),
      imageUrl: images.length > 0 ? images[0] : null,
      images: images,
      videoUrl: videoUrl,
      videoPublicId: videoPublicId,
      isOffer: isOffer,
      offerPrice: isOffer && data.offerPrice && Number(data.offerPrice) > 0 ? data.offerPrice : null,
      barcode: barcode || null,
      purchasePrice: data.purchasePrice || null,
      supplierId: supplierId || null,
    };

    if (editingId) {
      updateProduct({ id: editingId, ...payload }, {
        onSuccess: () => {
          toast({ title: "Producto actualizado" });
          setIsOpen(false);
        }
      });
    } else {
      createProduct(payload, {
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

  // Filtrar productos según el checkbox
  const filteredProducts = showHidden ? products : products.filter((p: any) => p.isVisible !== false);

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
                  <FormItem>
                    <FormLabel>Nombre <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <ProductCombobox
                        value={field.value}
                        onChange={field.onChange}
                        onTemplateSelect={(template) => {
                          // Auto-fill category if not set
                          if (template.categoryId && !form.getValues("categoryId")) {
                            form.setValue("categoryId", template.categoryId);
                          }
                          // Auto-fill supplier if not set
                          if (template.supplierId && !supplierId) {
                            setSupplierId(template.supplierId);
                          }
                          // Auto-fill barcode if not set
                          if (template.barcode && !barcode) {
                            setBarcode(template.barcode);
                          }
                          // Auto-fill purchasePrice if not set
                          if (template.lastPurchasePrice && !form.getValues("purchasePrice")) {
                            form.setValue("purchasePrice", Number(template.lastPurchasePrice).toString());
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Descripcion</FormLabel><FormControl><Textarea data-testid="input-product-description" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="price" render={({field}) => (
                    <FormItem><FormLabel>Precio (S/)</FormLabel><FormControl><Input type="number" step="0.01" data-testid="input-product-price" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="purchasePrice" render={({field}) => (
                    <FormItem><FormLabel>Precio Compra (S/)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 50.00" data-testid="input-product-purchase-price" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="inventory" render={({field}) => (
                    <FormItem><FormLabel>Inventario</FormLabel><FormControl><Input type="number" data-testid="input-product-inventory" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="minStock" render={({field}) => (
                   <FormItem><FormLabel>Stock Mínimo</FormLabel><FormControl><Input type="number" placeholder="Ej: 5" data-testid="input-product-minstock" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="entryDate" render={({field}) => (
                   <FormItem><FormLabel>Fecha Ingreso</FormLabel><FormControl><Input type="date" data-testid="input-product-entrydate" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="categoryId" render={({field}) => (
                   <FormItem><FormLabel>Categoria</FormLabel>                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
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

                {/* ── Proveedor ── */}
                <div className="space-y-2">
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={(v) => setSupplierId(Number(v))} value={supplierId?.toString() || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-supplier"><SelectValue placeholder="Sin proveedor..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {/* ── Código de Barras ── */}
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-muted-foreground" />
                    Código de Barras
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <BarcodeScanner value={barcode} onChange={setBarcode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormLabel>Imagenes del Producto ({images.length}/{MAX_IMAGES})</FormLabel>
                    <div className={`mt-2 grid grid-cols-5 xl:grid-cols-${Math.min(images.length + 1, MAX_IMAGES)} gap-3`}>
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
                    {/* Input para galería (múltiples archivos) */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUpload(e.target.files)}
                      data-testid="input-file-upload"
                    />
                    {/* Input para cámara (foto única, sin multiple para que capture funcione) */}
                    <CameraUploadButton
                      uploading={uploading}
                      onCapture={(files) => handleUpload(files)}
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
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length} producto(s)
          </span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showHidden}
              onCheckedChange={(val) => setShowHidden(!!val)}
              data-testid="checkbox-show-hidden"
            />
            <span className="text-muted-foreground">Incluir productos ocultos</span>
          </label>
        </div>
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Precio Compra</TableHead>
              <TableHead>Inventario</TableHead>
              <TableHead>Stock Mín</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">No se encontraron productos</TableCell></TableRow>
            ) : (
              filteredProducts.map((p: any) => (
                <TableRow key={p.id} data-testid={`row-product-${p.id}`} className={!p.isVisible ? "opacity-60" : ""}>
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
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {!p.isVisible && (
                          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <EyeOff className="w-3 h-3" /> OCULTO
                          </span>
                        )}
                        {p.isOffer && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Tag className="w-3 h-3" /> OFERTA
                          </span>
                        )}
                      </div>
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
                  <TableCell>
                    {p.purchasePrice ? (
                      <span className="text-muted-foreground">S/ {Number(p.purchasePrice).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={p.minStock != null && p.inventory <= p.minStock ? "text-destructive font-bold" : ""}>
                        {p.inventory}
                      </span>
                      {p.minStock != null && p.inventory <= p.minStock && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          BAJO
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={p.minStock != null && p.inventory <= p.minStock ? "text-destructive font-semibold" : "text-muted-foreground"}>
                      {p.minStock ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{p.supplier?.name || '-'}</span>
                  </TableCell>
                  <TableCell>{p.category?.name || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility({ id: p.id, isVisible: !p.isVisible })}
                      title={p.isVisible ? "Ocultar producto" : "Mostrar producto"}
                      data-testid={`button-toggle-visibility-${p.id}`}
                    >
                      {p.isVisible ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
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
