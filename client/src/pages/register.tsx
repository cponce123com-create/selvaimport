import { AppLayout } from "@/components/layout/AppLayout";
import { useRegister } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

export default function Register() {
  const { mutate: register, isPending } = useRegister();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    register(data, {
      onSuccess: () => {
        toast({ title: "Cuenta creada exitosamente" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Error al registrarse", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-register-title">Crear Cuenta</h1>
            <p className="text-muted-foreground">Unete y empieza a comprar hoy</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" className="bg-muted/50 rounded-xl" data-testid="input-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

              <Button type="submit" className="w-full py-6 text-lg rounded-xl mt-4" disabled={isPending} data-testid="button-submit-register">
                {isPending ? "Creando cuenta..." : "Registrarse"}
              </Button>
            </form>
          </Form>

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Ya tienes cuenta? <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">Iniciar Sesion</Link>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
