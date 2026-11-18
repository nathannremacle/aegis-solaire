import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const alt =
  "Aegis Solaire — L'astuce entre propriétaires en Wallonie : -18 % en mettant 3 installateurs RESCERT en concurrence"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

async function getLogoDataUri(): Promise<string | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    const buf = await readFile(logoPath)
    return `data:image/png;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export default async function AstuceOpenGraphImage() {
  const logoSrc = await getLogoDataUri()

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#EEF2F4",
          padding: "36px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
            border: "2px solid #DCE5EB",
            borderRadius: "24px",
            padding: "40px 48px",
          }}
        >
          {/* En-tête : logo officiel + badge de confiance */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #E6EDF1",
              paddingBottom: "22px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt="Aegis Solaire"
                  width={176}
                  height={96}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#142D42",
                    letterSpacing: "-0.02em",
                  }}
                >
                  AEGIS SOLAIRE
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#E8F2ED",
                borderRadius: "8px",
                padding: "10px 18px",
              }}
            >
              <span
                style={{
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "#1D5D45",
                }}
              >
                L&apos;astuce entre propriétaires · Wallonie
              </span>
            </div>
          </div>

          {/* Promesse centrale */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#305A76",
              }}
            >
              Tiers de confiance indépendant · De votre côté
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "46px",
                fontWeight: 700,
                lineHeight: 1.14,
                letterSpacing: "-0.025em",
                color: "#142D42",
              }}
            >
              <span>Ne payez pas votre devis solaire plein pot.</span>
              <span style={{ color: "#194767" }}>
                Comparez jusqu&apos;à 3 installateurs RESCERT.
              </span>
            </div>
          </div>

          {/* Deux blocs chiffrés + bandeau crème bas */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "20px",
                width: "100%",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#F0F5F8",
                  border: "1px solid #DCE5EB",
                  borderRadius: "12px",
                  padding: "18px 22px",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "17px", color: "#4D6374" }}>
                  Économie moyenne constatée
                </span>
                <span
                  style={{
                    fontSize: "34px",
                    fontWeight: 700,
                    color: "#142D42",
                  }}
                >
                  -18 % dès le 1er devis
                </span>
                <span style={{ fontSize: "17px", color: "#4D6374" }}>
                  Jusqu&apos;à 1 850 € d&apos;écart à matériel égal
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#F0F5F8",
                  border: "1px solid #DCE5EB",
                  borderRadius: "12px",
                  padding: "18px 22px",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "17px", color: "#4D6374" }}>
                  Qualité verrouillée
                </span>
                <span
                  style={{
                    fontSize: "34px",
                    fontWeight: 700,
                    color: "#142D42",
                  }}
                >
                  Zéro compromis Tier-1
                </span>
                <span style={{ fontSize: "17px", color: "#4D6374" }}>
                  Agrément RESCERT · RGIE · Décennale vérifiés
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#FFF5DF",
                borderLeft: "5px solid #D69729",
                borderRadius: "8px",
                padding: "14px 20px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#684916",
                }}
              >
                100 % gratuit · Zéro centre d&apos;appels · Contact par écrit d&apos;abord
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#142D42",
                }}
              >
                aegissolaire.com/astuce
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
