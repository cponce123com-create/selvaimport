import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { Plus, Trash2, Save, GripVertical, Eye, EyeOff, Upload, Loader2, Image, ArrowUp, ArrowDown, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BannerSlide {
  id: number;
  title: string | null;
  subtitle: string | null;
  mediaType: "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  publicId: string | null;
  productId1: number | null;
  productId2: number | null;
  buttonText: string | null;
  buttonLink: string | null;
  buttonCategoryId: number | null;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminBanner() {
  const { toast } = useToast();
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: slides = [], isLoading } = useQuery<BannerSlide[]>({
    queryKey: ["/api/admin/banner-slides"],
  });

  const { data: products = [] } = useProducts({ admin: true });
  const { data: categories = [] } = useCategories();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BannerSlide>) => {
      const res = await apiRequest("POST", "/api/admin/banner-slides", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banner-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-slides"] });
      setIsCreating(false);
      setEditingSlide(null);
      toast({ title: "Slide creado exitosamente" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BannerSlide> }) => {
      const res = await apiRequest("PUT", `/api/admin/banner-slides/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banner-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-slides"] });
      setEditingSlide(null);
      toast({ title: "Slide actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/banner-slides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banner-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-slides"] });
      setEditingSlide(null);
      toast({ title: "Slide eliminado" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/banner-slides/reorder", { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banner-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-slides"] });
    },
  });

  const toggleActive = (slide: BannerSlide) => {
    updateMutation.mutate({ id: slide.id, data: { isActive: !slide.isActive } });
  };

  const moveSlide = (slide: BannerSlide, direction: "up" | "down") => {
    const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(s => s.id === slide.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al subir archivo");
      }
      const data = await res.json();
      if (editingSlide) {
        if (data.resourceType === "video") {
          setEditingSlide({ ...editingSlide, videoUrl: data.url, publicId: data.publicId, mediaType: "video" });
        } else {
          setEditingSlide({ ...editingSlide, imageUrl: data.url, publicId: data.publicId, mediaType: "image" });
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!editingSlide) return;
    const payload = {
      title: editingSlide.title,
      subtitle: editingSlide.subtitle,
      mediaType: editingSlide.mediaType,
      imageUrl: editingSlide.imageUrl,
      videoUrl: editingSlide.videoUrl,
      publicId: editingSlide.publicId,
      productId1: editingSlide.productId1,
      productId2: editingSlide.productId2,
      buttonText: editingSlide.buttonText,
      buttonLink: editingSlide.buttonCategoryId ? null : editingSlide.buttonLink,
      buttonCategoryId: editingSlide.buttonCategoryId,
      isActive: editingSlide.isActive,
    };
    if (isCreating) {
      createMutation.mutate({ ...payload, sortOrder: slides.length });
    } else {
      updateMutation.mutate({ id: editingSlide.id, data: payload });
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingSlide({
      id: 0,
      title: "",
      subtitle: "",
      mediaType: "image",
      imageUrl: null,
      videoUrl: null,
      publicId: null,
      productId1: null,
      productId2: null,
      buttonText: "Ver productos",
      buttonLink: null,
      buttonCategoryId: null,
      sortOrder: slides.length,
      isActive: true,
    });
  };

  const startEdit = (slide: BannerSlide) => {
    setIsCreating(false);
    setEditingSlide({ ...slide });
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingSlide(null);
  };

  const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedCatName = editingSlide?.buttonCategoryId
    ? (categories as Array<Record<string, any>>).find((c: any) => c.id === editingSlide.buttonCategoryId)?.name || ""
    : "";

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-banner-title">Banner Principal</h1>
          <p className="text-muted-foreground mt-1">Administra los slides del carrusel de portada.</p>
        </div>
        <Button onClick={startCreate} data-testid="button-create-slide">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Slide
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Slides ({sorted.length})</h2>
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : sorted.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Image className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sin slides</p>
              <p className="text-sm mt-1">Crea tu primer slide para el banner de portada.</p>
            </div>
          ) : (
            sorted.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => startEdit(slide)}
                data-testid={`banner-slide-${slide.id}`}
                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors ${
                  editingSlide?.id === slide.id && !isCreating ? "border-primary bg-primary/5 ring-1 ring-primary/20" : ""
                } ${!slide.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(slide, "up"); }}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    data-testid={`button-move-up-${slide.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(slide, "down"); }}
                    disabled={idx === sorted.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                    data-testid={`button-move-down-${slide.id}`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                  {slide.mediaType === "video" && slide.videoUrl ? (
                    <>
                      <video src={slide.videoUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent" />
                      </div>
                    </>
                  ) : slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{slide.title || "Sin titulo"}</p>
                  <p className="text-xs text-muted-foreground truncate">{slide.subtitle || "Sin descripcion"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {slide.isActive ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Activo</span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">Inactivo</span>
                    )}
                    {(slide.productId1 || slide.productId2) && (
                      <span className="text-[10px] text-muted-foreground">
                        {[slide.productId1, slide.productId2].filter(Boolean).length} producto(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(slide); }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    data-testid={`button-toggle-active-${slide.id}`}
                  >
                    {slide.isActive ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Eliminar este slide?")) deleteMutation.mutate(slide.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    data-testid={`button-delete-slide-${slide.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {editingSlide ? (
            <div className="border rounded-xl p-5 sticky top-4 space-y-4" data-testid="slide-editor">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{isCreating ? "Nuevo Slide" : "Editar Slide"}</h2>
                <Button variant="ghost" size="icon" onClick={cancelEdit} data-testid="button-cancel-edit">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Tipo de Media:</label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={editingSlide.mediaType === "image" ? "default" : "outline"}
                      onClick={() => setEditingSlide({ ...editingSlide, mediaType: "image" })}
                    >Imagen</Button>
                    <Button 
                      size="sm" 
                      variant={editingSlide.mediaType === "video" ? "default" : "outline"}
                      onClick={() => setEditingSlide({ ...editingSlide, mediaType: "video" })}
                    >Video</Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {editingSlide.mediaType === "video" ? "Video del Banner (Max 20MB)" : "Imagen Principal (1920x800 recomendado)"}
                  </label>
                  <div className="border-2 border-dashed rounded-xl overflow-hidden bg-muted/30">
                    {editingSlide.mediaType === "video" && editingSlide.videoUrl ? (
                      <div className="relative group" style={{ aspectRatio: "21/9" }}>
                        <video src={editingSlide.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} data-testid="button-change-video">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Cambiar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setEditingSlide({ ...editingSlide, videoUrl: null, publicId: null })} data-testid="button-remove-video">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : editingSlide.mediaType === "image" && editingSlide.imageUrl ? (
                      <div className="relative group" style={{ aspectRatio: "21/9" }}>
                        <img src={editingSlide.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} data-testid="button-change-image">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Cambiar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setEditingSlide({ ...editingSlide, imageUrl: null, publicId: null })} data-testid="button-remove-image">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        style={{ aspectRatio: "21/9" }}
                        data-testid="button-upload-media"
                      >
                        {uploading ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2" />
                            <span className="text-sm font-medium">
                              {editingSlide.mediaType === "video" ? "Subir Video (MP4, WebM)" : "Subir imagen (1920x800)"}
                            </span>
                            <span className="text-xs mt-1">
                              {editingSlide.mediaType === "video" ? "Max 20MB" : "JPG, PNG, WebP (max 5MB)"}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={editingSlide.mediaType === "video" ? "video/*" : "image/*"}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                {editingSlide.mediaType === "video" && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Poster del Video (Opcional - Imagen que se muestra antes de cargar)</label>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-12 rounded border bg-muted overflow-hidden flex-shrink-0">
                        {editingSlide.imageUrl ? (
                          <img src={editingSlide.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Image className="w-4 h-4" /></div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploading(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);
                              const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                              const data = await res.json();
                              setEditingSlide({ ...editingSlide, imageUrl: data.url });
                            } catch (e) {} finally { setUploading(false); }
                          }
                        };
                        input.click();
                      }}>Subir Poster</Button>
                      {editingSlide.imageUrl && <Button size="sm" variant="ghost" onClick={() => setEditingSlide({...editingSlide, imageUrl: null})}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Titulo</label>
                <Input
                  value={editingSlide.title || ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                  placeholder="Ej: Los mejores celulares"
                  data-testid="input-slide-title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Subtitulo</label>
                <Input
                  value={editingSlide.subtitle || ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                  placeholder="Ej: Hasta 30% de descuento"
                  data-testid="input-slide-subtitle"
                />
              </div>

              <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                <label className="text-sm font-semibold block">Boton de Accion</label>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Texto del Boton</label>
                  <Input
                    value={editingSlide.buttonText || ""}
                    onChange={(e) => setEditingSlide({ ...editingSlide, buttonText: e.target.value })}
                    placeholder="Ver productos"
                    data-testid="input-slide-button-text"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Categoria del Boton</label>
                  <Select
                    value={editingSlide.buttonCategoryId?.toString() || "none"}
                    onValueChange={(v) => setEditingSlide({
                      ...editingSlide,
                      buttonCategoryId: v === "none" ? null : Number(v),
                      buttonLink: v === "none" ? editingSlide.buttonLink : null,
                    })}
                  >
                    <SelectTrigger data-testid="select-button-category">
                      <SelectValue placeholder="Seleccionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoria (enlace manual)</SelectItem>
                      {(categories as Array<Record<string, any>>).map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingSlide.buttonCategoryId && selectedCatName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Link generado: /?cat={editingSlide.buttonCategoryId}#catalogo
                    </p>
                  )}
                </div>

                {!editingSlide.buttonCategoryId && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Enlace Manual</label>
                    <Input
                      value={editingSlide.buttonLink || ""}
                      onChange={(e) => setEditingSlide({ ...editingSlide, buttonLink: e.target.value })}
                      placeholder="/#catalogo"
                      data-testid="input-slide-button-link"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Producto Destacado 1</label>
                <Select
                  value={editingSlide.productId1?.toString() || "none"}
                  onValueChange={(v) => setEditingSlide({ ...editingSlide, productId1: v === "none" ? null : Number(v) })}
                >
                  <SelectTrigger data-testid="select-product-1">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} - S/ {Number(p.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Producto Destacado 2</label>
                <Select
                  value={editingSlide.productId2?.toString() || "none"}
                  onValueChange={(v) => setEditingSlide({ ...editingSlide, productId2: v === "none" ? null : Number(v) })}
                >
                  <SelectTrigger data-testid="select-product-2">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} - S/ {Number(p.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium">Visible en portada</label>
                <Switch
                  checked={editingSlide.isActive}
                  onCheckedChange={(v) => setEditingSlide({ ...editingSlide, isActive: v })}
                  data-testid="switch-slide-active"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1" data-testid="button-save-slide">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isCreating ? "Crear Slide" : "Guardar Cambios"}
                </Button>
                <Button variant="outline" onClick={cancelEdit} data-testid="button-cancel-slide">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <GripVertical className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Selecciona un slide para editar</p>
              <p className="text-sm mt-1">O crea uno nuevo con el boton "Nuevo Slide".</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
