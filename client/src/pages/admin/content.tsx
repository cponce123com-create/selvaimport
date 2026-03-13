import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, FileText, Upload, Loader2, X, Eye } from "lucide-react";
import DOMPurify from "dompurify";

const RichTextEditor = lazy(() =>
  import("@/components/editor/RichTextEditor").then((m) => ({ default: m.RichTextEditor }))
);

interface PageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  imageUrl: string | null;
  updatedAt: string;
}

export default function AdminContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pages = [], isLoading } = useQuery<PageData[]>({
    queryKey: ["/api/pages"],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: { title?: string; content?: string; imageUrl?: string | null } }) => {
      const res = await fetch(`/api/admin/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al guardar");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({ title: "Pagina actualizada correctamente" });
    },
    onError: (err) => {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    },
  });

  const openEditor = (page: PageData) => {
    setActiveSlug(page.slug);
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditImageUrl(page.imageUrl);
    setPreviewMode(false);
  };

  const handleSave = () => {
    if (!activeSlug) return;
    saveMutation.mutate({
      slug: activeSlug,
      data: { title: editTitle, content: editContent, imageUrl: editImageUrl },
    });
  };

  const handleUploadImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      setEditImageUrl(data.url);
      toast({ title: "Imagen subida correctamente" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const pageLabels: Record<string, string> = {
    "terminos": "Terminos y Condiciones",
    "privacidad": "Politica de Privacidad",
    "envios": "Envios y Devoluciones",
    "quienes-somos": "Quienes Somos",
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-admin-content-title">Gestion de Contenido</h1>
        <p className="text-muted-foreground mt-1">Edita las paginas de informacion de tu tienda con el editor visual.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Paginas</h3>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            pages.map((page) => (
              <button
                key={page.slug}
                onClick={() => openEditor(page)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activeSlug === page.slug
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card hover:bg-accent border-border"
                }`}
                data-testid={`button-page-${page.slug}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{pageLabels[page.slug] || page.title}</p>
                    <p className={`text-xs ${activeSlug === page.slug ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      /{page.slug}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {activeSlug ? (
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <h2 className="font-semibold text-lg">{pageLabels[activeSlug] || editTitle}</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="gap-1.5"
                    data-testid="button-toggle-preview"
                  >
                    <Eye className="w-4 h-4" />
                    {previewMode ? "Editar" : "Vista Previa"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="gap-1.5"
                    data-testid="button-save-page"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium mb-2 block">Titulo de la Pagina</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-base"
                    data-testid="input-page-title"
                  />
                </div>

                {activeSlug === "quienes-somos" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Imagen de Portada</label>
                    {editImageUrl ? (
                      <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border group">
                        <img src={editImageUrl} alt="Imagen de pagina" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditImageUrl(null)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid="button-remove-page-image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full max-w-xs aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        data-testid="button-upload-page-image"
                      >
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        <span className="text-xs font-medium">Subir imagen de portada</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e.target.files)}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Contenido</label>
                  {previewMode ? (
                    <div
                      className="prose prose-sm sm:prose-base max-w-none border rounded-xl px-5 py-4 min-h-[400px] bg-background prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editContent) }}
                      data-testid="preview-page-content"
                    />
                  ) : (
                    <Suspense fallback={<div className="border rounded-xl p-8 min-h-[400px] flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando editor...</div>}>
                      <RichTextEditor
                        content={editContent}
                        onChange={setEditContent}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground border-dashed">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecciona una pagina</p>
              <p className="text-sm">Elige una pagina del menu para editarla.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
