import { AppLayout } from "@/components/layout/AppLayout";
import { useCart, clearGuestCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MessageCircle, Store, Truck, Package, QrCode, ShieldCheck, ArrowLeft, FileImage } from "lucide-react";
import { toWebP, getDisplayPrice } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ProformaImage, buildWhatsAppMessage } from "@/components/order/ProformaImage";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "51998130656";

const SHIPPING_OPTIONS = [
  { id: "recojo", label: "Recojo en tienda", cost: 0, description: "Recoge tu pedido en nuestra tienda" },
  { id: "san-ramon", label: "Envio a San Ramon urbano", cost: 4, description: "Entrega en zona urbana de San Ramon" },
  { id: "la-merced", label: "Envio a La Merced", cost: 8, description: "Entrega en La Merced" },
  { id: "shalom", label: "Envio por Shalom", cost: -1, description: "El costo de envio se coordinara segun tarifario de Shalom" },
] as const;

const checkoutSchema = z.object({
  customerName: z.string().min(2, "El nombre es obligatorio"),
  customerPhone: z.string().min(6, "El telefono es obligatorio"),
  shippingAddress: z.string().min(5, "La direccion es obligatoria"),
  shippingOption: z.string().min(1, "Selecciona una opcion de envio"),
});

function useCreateGuestOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { shippingAddress: string; guestName: string; guestPhone: string; items: { productId: number; quantity: number }[] }) => {
      const res = await fetch(api.orders.createGuest.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error al crear pedido");
      }
      return await res.json();
    },
    onSuccess: () => {
      clearGuestCart();
      queryClient.invalidateQueries({ queryKey: ["guest-cart"] });
    },
  });
}

export default function Checkout() {
  const { data: cart, isLoading } = useCart();
  const { data: user } = useAuth();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { mutate: createGuestOrder, isPending: guestPending } = useCreateGuestOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showProforma, setShowProforma] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener("guest-cart-update", handler);
    return () => window.removeEventListener("guest-cart-update", handler);
  }, []);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: "", customerPhone: "", shippingAddress: "", shippingOption: "" },
  });

  const selectedShipping = form.watch("shippingOption");
  const customerName = form.watch("customerName");
  const customerPhone = form.watch("customerPhone");
  const shippingAddress = form.watch("shippingAddress");

  useEffect(() => {
    if (!isLoading && (!cart || !cart.items || cart.items.length === 0)) {
      setLocation("/cart");
    }
  }, [cart, isLoading, setLocation]);

  const subtotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((acc: number, item: any) => acc + (getDisplayPrice(item.product).current * item.quantity), 0);
  }, [cart]);

  const shippingInfo = SHIPPING_OPTIONS.find(o => o.id === selectedShipping);
  const shippingCost = shippingInfo ? (shippingInfo.cost === -1 ? 0 : shippingInfo.cost) : 0;
  const isShalom = shippingInfo?.id === "shalom";
  const total = subtotal + shippingCost;
  const submitting = isPending || guestPending;

  const proformaData = useMemo(() => {
    if (!cart?.items?.length) return null;
    return {
      items: cart.items.map((item: any) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.product.price),
      })),
      subtotal,
      shippingLabel: shippingInfo?.label || "Sin seleccionar",
      shippingCost: shippingInfo ? shippingInfo.cost : 0,
      isShalom,
      total,
      customerName: customerName || "(sin completar)",
      customerPhone: customerPhone || "(sin completar)",
      customerAddress: shippingAddress || "(sin completar)",
      date: new Date(),
    };
  }, [cart, subtotal, total, shippingInfo, isShalom, customerName, customerPhone, shippingAddress]);

  const whatsappMessage = useMemo(() => {
    if (!proformaData) return "";
    return buildWhatsAppMessage(proformaData);
  }, [proformaData]);

  const whatsappUrl = useMemo(() => {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [whatsappMessage]);

  if (isLoading || !cart?.items?.length) return null;

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => {
    const fullAddress = `${data.customerName} | Tel: ${data.customerPhone} | ${data.shippingAddress} | Envio: ${shippingInfo?.label || ""}`;

    if (user) {
      createOrder({ shippingAddress: fullAddress }, {
        onSuccess: (order) => {
          toast({ title: "Pedido registrado con exito" });
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          setLocation(`/order/${order.id}`);
        },
        onError: (err) => {
          toast({ title: "Error al registrar pedido", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createGuestOrder({
        shippingAddress: fullAddress,
        guestName: data.customerName,
        guestPhone: data.customerPhone,
        items: cart.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }, {
        onSuccess: (order) => {
          toast({ title: "Pedido registrado con exito" });
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          setLocation(`/order/${order.id}?guest=1&token=${order.guestAccessToken}`);
        },
        onError: (err) => {
          toast({ title: "Error al registrar pedido", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const shippingIcons: Record<string, any> = {
    "recojo": Store,
    "san-ramon": Truck,
    "la-merced": Truck,
    "shalom": Package,
  };

  const isFormValid = customerName.length >= 2 && customerPhone.length >= 6 && shippingAddress.length >= 5 && !!selectedShipping;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Link href="/cart" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back-cart">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al carrito
        </Link>

        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold" data-testid="text-checkout-title">Confirmar Pedido</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Revisa tu pedido, selecciona el envio y envia por WhatsApp</p>
          {!user && (
            <p className="text-sm text-primary mt-1 font-medium">Comprando como invitado</p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-8 flex flex-col">

                <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm order-2 sm:order-1">
                  <h2 className="text-lg font-semibold mb-4">Opcion de Envio</h2>
                  <FormField
                    control={form.control}
                    name="shippingOption"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            {SHIPPING_OPTIONS.map((option) => {
                              const Icon = shippingIcons[option.id] || Truck;
                              return (
                                <Label
                                  key={option.id}
                                  htmlFor={`shipping-${option.id}`}
                                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    field.value === option.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/30"
                                  }`}
                                  data-testid={`shipping-option-${option.id}`}
                                >
                                  <RadioGroupItem value={option.id} id={`shipping-${option.id}`} />
                                  <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                  </div>
                                  <span className="font-semibold text-sm whitespace-nowrap">
                                    {option.cost === 0 ? "GRATIS" : option.cost === -1 ? "Por coordinar" : `S/ ${option.cost.toFixed(2)}`}
                                  </span>
                                </Label>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm order-1 sm:order-2">
                  <h2 className="text-lg font-semibold mb-4">Datos del Cliente</h2>
                  <div className="space-y-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl><Input placeholder="Tu nombre" className="h-12 text-base" autoComplete="name" data-testid="input-customer-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono / WhatsApp</FormLabel>
                        <FormControl><Input type="tel" inputMode="numeric" placeholder="999 999 999" className="h-12 text-base" autoComplete="tel" data-testid="input-customer-phone" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direccion de entrega</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jr. Principal #123, San Ramon..."
                            className="min-h-[80px] resize-none text-base"
                            autoComplete="street-address"
                            data-testid="input-shipping-address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm order-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#6C2DC7] p-2 rounded-xl">
                      <QrCode className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold">Pago con Yape</h2>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="w-48 h-48 bg-white rounded-2xl border-2 border-[#6C2DC7]/20 p-2 flex-shrink-0 shadow-sm">
                      <img
                        src="/yape-qr.jpg"
                        alt="QR Yape"
                        className="w-full h-full object-contain"
                        data-testid="img-yape-qr"
                      />
                    </div>
                    <div className="text-center sm:text-left space-y-3">
                      <p className="font-medium text-[#6C2DC7]">Escanea el QR para pagar con Yape</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Despues de pagar, envia tu comprobante por WhatsApp junto con tu pedido para confirmar la compra.
                      </p>
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          Monto a pagar: S/ {isShalom ? `${subtotal.toFixed(2)} + envio por coordinar` : total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-card border rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
                  <h2 className="text-lg font-semibold">Resumen del Pedido</h2>

                  <ul className="space-y-3">
                    {cart.items.map((item: any) => (
                      <li key={item.productId || item.id} className="flex justify-between items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {(item.product.images?.[0] || item.product.imageUrl) && (
                              <img src={toWebP(item.product.images?.[0] || item.product.imageUrl)} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-semibold whitespace-nowrap">
                          S/ {(getDisplayPrice(item.product).current * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>S/ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envio</span>
                      <span>
                        {!shippingInfo
                          ? "Seleccionar"
                          : shippingInfo.cost === 0
                            ? "GRATIS"
                            : shippingInfo.cost === -1
                              ? "Por coordinar"
                              : `S/ ${shippingInfo.cost.toFixed(2)}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t font-bold text-lg">
                      <span>Total</span>
                      <span data-testid="text-checkout-total">
                        {isShalom ? `S/ ${subtotal.toFixed(2)}+` : `S/ ${total.toFixed(2)}`}
                      </span>
                    </div>
                    {isShalom && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        + costo de envio Shalom por coordinar
                      </p>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground border">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p>Tu pedido sera registrado y enviado por WhatsApp para coordinacion.</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base py-6 sm:py-6 rounded-xl shadow-lg bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.98] text-white gap-2 min-h-[48px]"
                    disabled={submitting || !selectedShipping}
                    data-testid="button-send-whatsapp"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {submitting ? "Procesando..." : "Enviar Pedido por WhatsApp"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-sm gap-2"
                    disabled={!isFormValid}
                    onClick={() => setShowProforma(true)}
                    data-testid="button-preview-proforma"
                  >
                    <FileImage className="w-4 h-4" />
                    Ver y Descargar Proforma
                  </Button>

                  {selectedShipping ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs gap-2 text-muted-foreground"
                        data-testid="button-whatsapp-only"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Solo enviar texto por WhatsApp
                      </Button>
                    </a>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs gap-2 text-muted-foreground"
                      disabled
                      data-testid="button-whatsapp-only"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Solo enviar texto por WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <Dialog open={showProforma} onOpenChange={setShowProforma}>
        <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Proforma del Pedido
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Descarga o comparte tu proforma como imagen</p>
          </DialogHeader>
          {proformaData && (
            <div className="overflow-x-auto">
              <ProformaImage data={proformaData} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
