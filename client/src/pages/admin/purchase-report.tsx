import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileBarChart, Loader2, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportItem {
  supplierId: number | null;
  supplierName: string;
  items: {
    productId: number;
    productName: string;
    imageUrl: string | null;
    images: string[];
    barcode: string | null;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    unitProfit: number;
    totalProfit: number;
  }[];
  subtotalQuantity: number;
  subtotalProfit: number;
  subtotalRevenue: number;
  subtotalCost: number;
}

interface ReportData {
  suppliers: ReportItem[];
  grandTotalQuantity: number;
  grandTotalProfit: number;
  grandTotalRevenue: number;
  grandTotalCost: number;
  generatedAt: string;
  desde: string | null;
  hasta: string | null;
}

export default function AdminPurchaseReport() {
  const { data: suppliers = [] } = useSuppliers();
  const { toast } = useToast();
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
    enabled: false, // Solo se ejecuta cuando se hace clic en "Generar"
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Informe de Compra</h1>
        {generated && report && (
          <Button variant="outline" onClick={handlePrint} data-testid="button-export-pdf">
            <Printer className="w-4 h-4 mr-2" /> Exportar PDF
          </Button>
        )}
      </div>

      {/* ── Filtros ── */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Fecha desde</label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-48"
                data-testid="input-report-desde"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Fecha hasta</label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-48"
                data-testid="input-report-hasta"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-56" data-testid="select-report-supplier">
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
            <Button onClick={handleGenerate} disabled={isLoading} data-testid="button-generate-report">
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

      {/* ── Resultado ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Generando informe...
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-destructive">
          Error al generar el informe. Intenta de nuevo.
        </div>
      )}

      {generated && !isLoading && report && (
        <div ref={printRef} id="print-area">
          {/* ── Cabecera para impresión ── */}
          <div className="hidden print:block mb-6 pb-4 border-b">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/logo-selva-import.jpg"
                alt="Selva Import"
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <h2 className="text-xl font-bold">Selva Import</h2>
                <p className="text-sm text-muted-foreground">Informe de Compra</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Generado: {new Date(report.generatedAt || "").toLocaleString("es-PE")}
            </p>
            {(report.desde || report.hasta) && (
              <p className="text-sm text-muted-foreground">
                Rango: {report.desde || "Sin límite"} → {report.hasta || "Sin límite"}
              </p>
            )}
          </div>

          {/* ── Tabla por proveedor ── */}
          {report.suppliers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No se encontraron resultados</p>
              <p className="text-sm">Prueba con un rango de fechas diferente.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {report.suppliers.map((supplier, si) => (
                <div key={si} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-muted/20 border-b">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {supplier.supplierName}
                    </h3>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Código Barras</TableHead>
                        <TableHead className="text-right">Cant. Vendida</TableHead>
                        <TableHead className="text-right">Precio Compra</TableHead>
                        <TableHead className="text-right">Precio Venta</TableHead>
                        <TableHead className="text-right">Ganancia Unit.</TableHead>
                        <TableHead className="text-right">Ganancia Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.items.map((item, ii) => (
                        <TableRow key={ii}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                {(item.images?.[0] || item.imageUrl) ? (
                                  <img
                                    src={(item.images?.[0] || item.imageUrl) ?? ""}
                                    className="w-full h-full object-cover"
                                    alt={item.productName}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                    SIN FOTO
                                  </div>
                                )}
                              </div>
                              <span className="font-medium">{item.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.barcode || <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-right">S/ {item.purchasePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">S/ {item.salePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={item.unitProfit >= 0 ? "text-green-600" : "text-red-600"}>
                              S/ {item.unitProfit.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={item.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                              S/ {item.totalProfit.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal del proveedor */}
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={2} className="font-semibold">Subtotal</TableCell>
                        <TableCell className="text-right font-semibold">{supplier.subtotalQuantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">-</TableCell>
                        <TableCell className="text-right text-muted-foreground">-</TableCell>
                        <TableCell className="text-right text-muted-foreground">-</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={supplier.subtotalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                            S/ {supplier.subtotalProfit.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}

              {/* ── TOTAL GENERAL ── */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableBody>
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold text-lg" colSpan={2}>
                        TOTAL GENERAL
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {report.grandTotalQuantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">
                        S/ {report.grandTotalProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Estilos de impresión ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print\:block {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
