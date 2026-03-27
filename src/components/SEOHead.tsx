import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}

const SEOHead = ({
  title = "Hades Client — Undetected Minecraft Cheat | Ghost Injection",
  description = "The best undetected Minecraft cheat. Ghost injection, anti-cheat bypass for Watchdog & Vulcan, 100+ hack modules. Download now.",
  path = "/",
  image = "https://hadesclient.com/og-image.png",
}: SEOHeadProps) => {
  const url = `https://hadesclient.com${path}`;
  const fullTitle = path === "/" ? title : `${title} | Hades Client`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEOHead;
