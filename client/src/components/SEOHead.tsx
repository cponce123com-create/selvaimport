import { Helmet } from "react-helmet-async";

const SITE_URL = "https://selvaimport.onrender.com";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article";
}

export function SEOHead({
  title = "Selva Import - Tu tienda de confianza",
  description = "Tienda online en San Ramón. Tecnología, moda, hogar y más. Envíos a La Merced y coordinación por WhatsApp.",
  canonicalPath,
  image = "/logo-800w.webp",
  type = "website",
}: SEOHeadProps) {
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : SITE_URL;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
