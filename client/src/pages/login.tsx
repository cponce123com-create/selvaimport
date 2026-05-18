import { AppLayout } from "@/components/layout/AppLayout";
import { useLogin, useGoogleLogin } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag } from "lucide-react";
import { useEffect, useRef } from "react";

const schema = z.object({
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(1, "La contrasena es obligatoria"),
});

export default function Login() {
  const { mutate: login, isPending } = useLogin();
  const { mutate: googleLogin, isPending: googlePending } = useGoogleLogin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Lazy load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    const handleGoogleResponse = (response: any) => {
      googleLogin(response.credential, {
        onSuccess: (user) => {
          toast({ title: "Bienvenido/a con Google" });
          setLocation(user.role === "admin" ? "/admin" : "/");
        },
        onError: (err) => {
          toast({ title: "Error con Google", description: err.message, variant: "destructive" });
        }
      });
    };

    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });
        if (googleBtnRef.current) {
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
          });
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
      script.remove();
    };
  }, [googleLogin, setLocation, toast]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    login(data, {
      onSuccess: (user) => {
        toast({ title: "Bienvenido/a de vuelta" });
        if (user.role === "admin") {
          setLocation("/admin");
        } else {
          setLocation("/");
        }
      },
      onError: (err) => {
        toast({ title: "Error al iniciar sesion", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <img src="/logo-selva-import.jpg" alt="Selva Import" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-md" />
            <h1 className="text-3xl font-bold mb-2" data-testid="text-login-title">Iniciar Sesion</h1>
            <p className="text-muted-foreground">Ingresa a tu cuenta para continuar</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electronico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" className="bg-muted/50 rounded-xl" data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" className="bg-muted/50 rounded-xl" data-testid="input-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full py-6 text-lg rounded-xl mt-4" disabled={isPending} data-testid="button-submit-login">
                {isPending ? "Ingresando..." : "Iniciar Sesion"}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">o</span>
            </div>
          </div>

          <div ref={googleBtnRef} className="w-full mb-4 min-h-[44px]" />

          <Button
            type="button"
            variant="outline"
            className="w-full py-5 rounded-xl gap-2 min-h-[48px] text-base active:scale-[0.98]"
            onClick={() => setLocation("/")}
            data-testid="button-guest-checkout"
          >
            <ShoppingBag className="w-4 h-4" />
            Continuar como Invitado
          </Button>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            No tienes cuenta? <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">Crear una cuenta</Link>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
