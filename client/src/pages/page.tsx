import { AppLayout } from "@/components/layout/AppLayout";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import DOMPurify from "dompurify";
import { toWebP } from "@/lib/utils";

const ALLOWED_TAGS = ["p", "h1", "h2", "h3", "strong", "em", "u", "a", "ul", "ol", "li", "img", "hr", "br", "div", "span", "blockquote"];
const ALLOWED_ATTR = ["href", "src", "alt", "class", "style", "target", "rel"];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

function isHtmlContent(content: string): boolean {
  return /<(p|h[1-3]|ul|ol|li|strong|em|img|hr|br|div|a)\b/i.test(content);
}

export default function SitePage() {
  const { slug } = useParams();

  const { data: page, isLoading } = useQuery({
    queryKey: ["/api/pages", slug],
    queryFn: async () => {
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse">
          <div className="h-10 bg-muted rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/5"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!page) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4" data-testid="text-page-not-found">Pagina no encontrada</h2>
          <Link href="/">
            <button className="inline-flex items-center text-sm text-primary hover:underline" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isAboutPage = slug === "quienes-somos";
  const htmlMode = isHtmlContent(page.content);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors" data-testid="link-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-8" data-testid="text-page-title">{page.title}</h1>

        {isAboutPage && page.imageUrl ? (
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="rounded-2xl overflow-hidden border shadow-sm">
              <img src={toWebP(page.imageUrl)} alt={page.title} className="w-full h-full object-cover" data-testid="img-about-page" />
            </div>
            {htmlMode ? (
              <div
                className="prose prose-lg max-w-none text-muted-foreground leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
                data-testid="text-page-content"
              />
            ) : (
              <div className="prose prose-lg max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-page-content">
                {page.content}
              </div>
            )}
          </div>
        ) : htmlMode ? (
          <div
            className="prose prose-lg max-w-none text-muted-foreground leading-relaxed bg-card border rounded-2xl p-6 sm:p-8 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
            data-testid="text-page-content"
          />
        ) : (
          <div className="prose prose-lg max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed bg-card border rounded-2xl p-6 sm:p-8" data-testid="text-page-content">
            {page.content}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
