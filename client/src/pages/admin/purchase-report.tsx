import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Loader2, Printer } from "lucide-react";

interface ReportItem {
  supplierId: number | null;
  supplierName: string;
  items: {
    productId: number;
    productName: string;
    imageUrl: string | null;
    images: string[];
    barcode: string | null;
    brand: string | null;
    model: string | null;
    price: number;
    offerPrice: number | null;
    purchasePrice: number;
    unitProfit: number;
    totalProfit: number;
    inventory: number;
    entryDate: string | null;
  }[];
  subtotalProducts: number;
  subtotalUnits: number;
  subtotalCost: number;
  subtotalProfit: number;
}

interface ReportData {
  suppliers: ReportItem[];
  grandTotalProducts: number;
  grandTotalUnits: number;
  grandTotalCost: number;
  grandTotalProfit: number;
  generatedAt: string;
  desde: string | null;
  hasta: string | null;
}

const fmt = (n: number) => `S/ ${n.toFixed(2)}`;
const fmtProfit = (n: number) => `${n >= 0 ? "+" : ""}S/ ${n.toFixed(2)}`;

export default function AdminPurchaseReport() {
  const { data: suppliers = [] } = useSuppliers();
  const printRef = useRef<HTMLDivElement>(null);

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [generated, setGenerated] = useState(false);

  const { data: report, isLoading, isError, refetch } = useQuery<ReportData>({
    queryKey: ["/api/admin/purchase-report", { desde, hasta, supplierId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (supplierId && supplierId !== "all") params.set("supplierId", supplierId);
      const res = await fetch(`/api/admin/purchase-report?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al generar el informe");
      }
      return res.json();
    },
    enabled: false,
  });

  const handleGenerate = () => {
    setGenerated(true);
    refetch();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout>
      {/* ── Estilos de impresión ── */}
      <style>{`
        .report-root {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }

        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          body > * { display: none !important; }
          body > #root { display: block !important; }
          #root { position: relative; }
          #print-area { display: block !important; }

          #print-area {
            width: 100%;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 8pt;
            color: #111;
            background: #fff;
          }

          .no-print { display: none !important; }
          .print-only { display: block !important; }

          .supplier-block { page-break-inside: avoid; margin-bottom: 18pt; }

          .report-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
          .report-table th {
            background: #1a3a2a !important;
            color: #fff !important;
            padding: 5pt 6pt;
            text-align: left;
            font-weight: 600;
            letter-spacing: 0.02em;
          }
          .report-table th.num { text-align: right; }
          .report-table td { padding: 4pt 6pt; border-bottom: 0.5pt solid #e5e7eb; vertical-align: middle; }
          .report-table tr:nth-child(even) td { background: #f8faf9 !important; }
          .report-table .subtotal-row td {
            background: #e8f5ee !important;
            font-weight: 600;
            border-top: 1pt solid #a7d8b8;
          }
          .report-table .total-row td {
            background: #1a3a2a !important;
            color: #fff !important;
            font-weight: 700;
            font-size: 8.5pt;
            border-top: 2pt solid #0d2016;
          }
          .num { text-align: right; }
          .profit-pos { color: #16a34a !important; }
          .profit-neg { color: #dc2626 !important; }
          .total-row .profit-pos { color: #4ade80 !important; }
          .price-strike { text-decoration: line-through; color: #9ca3af; font-size: 6.5pt; }

          .supplier-header {
            background: #e8f5ee !important;
            border-left: 3pt solid #1a3a2a;
            padding: 5pt 8pt;
            font-weight: 700;
            font-size: 9pt;
            color: #1a3a2a;
            margin-bottom: 0;
          }

          .print-header { margin-bottom: 14pt; padding-bottom: 10pt; border-bottom: 1.5pt solid #1a3a2a; }
          .print-header-top { display: flex; align-items: center; gap: 10pt; margin-bottom: 4pt; }
          .print-logo { width: 36pt; height: 36pt; border-radius: 6pt; object-fit: cover; }
          .print-title { font-size: 14pt; font-weight: 700; color: #1a3a2a; margin: 0; }
          .print-subtitle { font-size: 8pt; color: #6b7280; margin: 0; }
          .print-meta { font-size: 7.5pt; color: #6b7280; margin-top: 3pt; }

          .summary-bar {
            display: flex;
            gap: 14pt;
            background: #f0faf4 !important;
            border: 0.5pt solid #a7d8b8;
            border-radius: 4pt;
            padding: 6pt 10pt;
            margin-bottom: 12pt;
          }
          .summary-item { flex: 1; }
          .summary-label { font-size: 6.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
          .summary-value { font-size: 10pt; font-weight: 700; color: #1a3a2a; }
          .summary-value.profit { color: #16a34a !important; }

          .prod-cell { display: flex; align-items: center; gap: 5pt; }
          .prod-thumb { width: 22pt; height: 22pt; border-radius: 3pt; object-fit: cover; flex-shrink: 0; background: #f3f4f6; }
          .prod-name { font-weight: 500; font-size: 7.5pt; line-height: 1.3; }

          @page { size: A4 portrait; margin: 10mm 12mm; }
        }

        /* ── Pantalla ── */
        @media screen {
          .print-only { display: none; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .report-table th {
            background: #1a3a2a;
            color: #fff;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
          }
          .report-table th.num { text-align: right; }
          .report-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
          .report-table tr:hover td { background: #f8faf9; }
          .report-table .subtotal-row td {
            background: #e8f5ee;
            font-weight: 600;
            border-top: 1px solid #a7d8b8;
          }
          .report-table .total-row td {
            background: #1a3a2a;
            color: #fff;
            font-weight: 700;
            font-size: 15px;
          }
          .num { text-align: right; }
          .profit-pos { color: #16a34a; }
          .profit-neg { color: #dc2626; }
          .total-row .profit-pos { color: #4ade80; }
          .price-strike { text-decoration: line-through; color: #9ca3af; font-size: 11px; }
          .supplier-header {
            background: #e8f5ee;
            border-left: 4px solid #1a3a2a;
            padding: 8px 14px;
            font-weight: 700;
            font-size: 15px;
            color: #1a3a2a;
          }
          .prod-cell { display: flex; align-items: center; gap: 10px; }
          .prod-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #f3f4f6; }
          .prod-name { font-weight: 500; }
        }
      `}</style>

      <div className="report-root">
        {/* ── Encabezado pantalla ── */}
        <div className="no-print flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a3a2a]">Informe de Compra</h1>
          {generated && report && (
            <Button
              onClick={handlePrint}
              data-testid="button-export-pdf"
              className="bg-[#1a3a2a] hover:bg-[#0d2016] text-white"
            >
              <Printer className="w-4 h-4 mr-2" /> Imprimir / Exportar PDF
            </Button>
          )}
        </div>

        {/* ── Filtros ── */}
        <Card className="mb-8 no-print border-[#a7d8b8]">
          <CardHeader>
            <CardTitle className="text-base text-[#1a3a2a]">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Fecha desde</label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-44"
                  data-testid="input-report-desde"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Fecha hasta</label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-44"
                  data-testid="input-report-hasta"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-52" data-testid="select-report-supplier">
                    <SelectValue placeholder="Todos los proveedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                data-testid="button-generate-report"
                className="bg-[#1a3a2a] hover:bg-[#0d2016] text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileBarChart className="w-4 h-4 mr-2" />
                )}
                Generar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Estado: cargando / error ── */}
        {isLoading && (
          <div className="no-print flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Generando informe...
          </div>
        )}
        {isError && (
          <div className="no-print text-center py-20 text-destructive font-medium">
            Error al generar el informe. Intenta de nuevo.
          </div>
        )}

        {/* ── Área de impresión ── */}
        {!isLoading && report && (
          <div ref={printRef} id="print-area">

            {/* Cabecera (solo en impresión) */}
            <div className="print-only print-header">
              <div className="print-header-top">
                <img src="/logo-800w.webp" alt="Selva Import" className="print-logo" />
                <div>
                  <p className="print-title">Selva Import</p>
                  <p className="print-subtitle">Informe de Compra</p>
                </div>
              </div>
              <p className="print-meta">
                Generado: {new Date(report.generatedAt || "").toLocaleString("es-PE")}
                {(report.desde || report.hasta) && (
                  <> &nbsp;|&nbsp; Rango: {report.desde ?? "Sin límite"} → {report.hasta ?? "Sin límite"}</>
                )}
              </p>
            </div>

            {/* Resumen general (solo en impresión) */}
            <div className="print-only summary-bar">
              <div className="summary-item">
                <div className="summary-label">Productos</div>
                <div className="summary-value">{report.grandTotalProducts}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Unidades</div>
                <div className="summary-value">{report.grandTotalUnits}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total Invertido</div>
                <div className="summary-value">{fmt(report.grandTotalCost)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Ganancia Total</div>
                <div className="summary-value profit">{fmtProfit(report.grandTotalProfit)}</div>
              </div>
            </div>

            {report.suppliers.length === 0 ? (
              <div className="no-print text-center py-20 text-muted-foreground">
                <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No se encontraron resultados</p>
                <p className="text-sm">Prueba con un rango de fechas diferente.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {report.suppliers.map((supplier, si) => (
                  <div key={si} className="supplier-block overflow-hidden rounded-xl border border-[#a7d8b8] no-print:shadow-sm">
                    <div className="supplier-header">{supplier.supplierName}</div>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th style={{ width: "34%" }}>Producto</th>
                          <th className="num" style={{ width: "11%" }}>Precio Compra</th>
                          <th className="num" style={{ width: "8%" }}>Unid.</th>
                          <th className="num" style={{ width: "12%" }}>Subtotal</th>
                          <th className="num" style={{ width: "12%" }}>Precio Venta</th>
                          <th className="num" style={{ width: "10%" }}>Gan. Unidad</th>
                          <th className="num" style={{ width: "10%" }}>Gan. Total</th>
                          <th style={{ width: "10%" }}>Ingreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.items.map((item, ii) => (
                          <tr key={ii}>
                            <td>
                              <div className="prod-cell">
                                {(item.images?.[0] || item.imageUrl) ? (
                                  <img
                                    src={(item.images?.[0] || item.imageUrl) ?? ""}
                                    className="prod-thumb"
                                    alt={item.productName}
                                  />
                                ) : (
                                  <div
                                    className="prod-thumb"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt", color: "#9ca3af" }}
                                  >
                                    –
                                  </div>
                                )}
                                <span className="prod-name">{item.productName}</span>
                              </div>
                            </td>
                            <td className="num">{fmt(item.purchasePrice)}</td>
                            <td className="num" style={{ fontWeight: 600 }}>{item.inventory}</td>
                            <td className="num" style={{ fontWeight: 600 }}>{fmt(item.purchasePrice * item.inventory)}</td>
                            <td className="num">
                              {item.offerPrice != null ? (
                                <span>
                                  <span className="price-strike">S/ {item.price.toFixed(2)}</span>{" "}
                                  S/ {item.offerPrice.toFixed(2)}
                                </span>
                              ) : (
                                fmt(item.price)
                              )}
                            </td>
                            <td className={`num ${item.unitProfit >= 0 ? "profit-pos" : "profit-neg"}`} style={{ fontWeight: 600 }}>
                              {fmtProfit(item.unitProfit)}
                            </td>
                            <td className={`num ${item.totalProfit >= 0 ? "profit-pos" : "profit-neg"}`} style={{ fontWeight: 600 }}>
                              {fmtProfit(item.totalProfit)}
                            </td>
                            <td>
                              {item.entryDate
                                ? new Date(item.entryDate).toLocaleDateString("es-PE", {
                                    day: "2-digit", month: "2-digit", year: "numeric",
                                  })
                                : <span style={{ color: "#9ca3af" }}>–</span>
                              }
                            </td>
                          </tr>
                        ))}

                        {/* Subtotal proveedor */}
                        <tr className="subtotal-row">
                          <td>Subtotal — {supplier.subtotalProducts} producto{supplier.subtotalProducts !== 1 ? "s" : ""}</td>
                          <td className="num" style={{ color: "#6b7280" }}>–</td>
                          <td className="num">{supplier.subtotalUnits}</td>
                          <td className="num">{fmt(supplier.subtotalCost)}</td>
                          <td className="num" style={{ color: "#6b7280" }}>–</td>
                          <td className="num" style={{ color: "#6b7280" }}>–</td>
                          <td className={`num ${supplier.subtotalProfit >= 0 ? "profit-pos" : "profit-neg"}`}>
                            {fmtProfit(supplier.subtotalProfit)}
                          </td>
                          <td style={{ color: "#6b7280" }}>–</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* TOTAL GENERAL */}
                <table className="report-table" style={{ borderRadius: "8px", overflow: "hidden" }}>
                  <tbody>
                    <tr className="total-row">
                      <td style={{ width: "34%" }}>
                        TOTAL GENERAL — {report.grandTotalProducts} productos
                      </td>
                      <td className="num" style={{ width: "11%", opacity: 0.5 }}>–</td>
                      <td className="num" style={{ width: "8%" }}>{report.grandTotalUnits}</td>
                      <td className="num" style={{ width: "12%" }}>{fmt(report.grandTotalCost)}</td>
                      <td className="num" style={{ width: "12%", opacity: 0.5 }}>–</td>
                      <td className="num" style={{ width: "10%", opacity: 0.5 }}>–</td>
                      <td className={`num ${report.grandTotalProfit >= 0 ? "profit-pos" : "profit-neg"}`} style={{ width: "10%" }}>
                        {fmtProfit(report.grandTotalProfit)}
                      </td>
                      <td style={{ width: "10%", opacity: 0.5 }}>–</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
